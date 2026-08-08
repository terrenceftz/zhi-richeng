import prisma from '../db';
import { hashPassword, comparePassword } from '../utils/password';
import { signAccessToken, signRefreshToken, verifyRefreshToken, TokenPayload } from '../utils/jwt';

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  role: string;
  college?: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 天

function toPublicUser(user: { id: string; email: string; name: string; role: string; college?: string | null }): PublicUser {
  return { id: user.id, email: user.email, name: user.name, role: user.role, college: user.college || '' };
}

function issueTokens(userId: string, role: string): TokenPair {
  const payload: TokenPayload = { userId, role };
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };
}

export async function register(input: RegisterInput): Promise<{ user: PublicUser; tokens: TokenPair }> {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw Object.assign(new Error('邮箱已被注册'), { statusCode: 409 });
  }

  const hashed = await hashPassword(input.password);

  // 建用户 + 判定首用户管理员 + 写入 refresh token：同一事务，杜绝并发双管理员与半初始化状态
  const user = await prisma.$transaction(async (tx) => {
    const userCount = await tx.user.count();
    const created = await tx.user.create({
      data: { email: input.email, password: hashed, name: input.name, role: userCount === 0 ? 'admin' : 'user' },
      select: { id: true, email: true, name: true, role: true, college: true },
    });
    const pair = issueTokens(created.id, created.role);
    await tx.refreshToken.create({
      data: {
        userId: created.id,
        token: pair.refreshToken,
        expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
      },
    });
    return { created, pair };
  });

  return { user: toPublicUser(user.created), tokens: user.pair };
}

export async function login(input: LoginInput): Promise<{ user: PublicUser; tokens: TokenPair }> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) {
    throw Object.assign(new Error('邮箱或密码错误'), { statusCode: 401 });
  }

  const valid = await comparePassword(input.password, user.password);
  if (!valid) {
    throw Object.assign(new Error('邮箱或密码错误'), { statusCode: 401 });
  }

  const tokens = issueTokens(user.id, user.role);
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: tokens.refreshToken,
      expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
    },
  });

  return {
    user: toPublicUser({ id: user.id, email: user.email, name: user.name, role: user.role, college: user.college }),
    tokens,
  };
}

/**
 * 原子化刷新令牌轮换：用事务 + deleteMany 计数判断，
 * 防止并发请求用同一个 refresh token 重复签发。
 */
export async function refresh(refreshTokenValue: string): Promise<TokenPair> {
  let payload: TokenPayload;
  try {
    payload = verifyRefreshToken(refreshTokenValue);
  } catch {
    throw Object.assign(new Error('无效的 refresh token'), { statusCode: 401 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const deleted = await tx.refreshToken.deleteMany({
      where: { token: refreshTokenValue, expiresAt: { gt: new Date() } },
    });
    if (deleted.count === 0) {
      // token 不存在、已过期，或已被其它并发请求消费
      return null;
    }
    const newTokens = issueTokens(payload.userId, payload.role || 'user');
    await tx.refreshToken.create({
      data: {
        userId: payload.userId,
        token: newTokens.refreshToken,
        expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
      },
    });
    return newTokens;
  });

  if (!result) {
    throw Object.assign(new Error('refresh token 已过期或无效'), { statusCode: 401 });
  }
  return result;
}

export async function logout(userId: string, refreshTokenValue: string): Promise<void> {
  await prisma.refreshToken.deleteMany({ where: { userId, token: refreshTokenValue } });
}
