import prisma from '../db';
import { v4 as uuid } from 'uuid';
import { hashPassword, comparePassword } from '../utils/password';
import { signAccessToken, signRefreshToken, verifyRefreshToken, TokenPayload } from '../utils/jwt';


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

export async function register(input: RegisterInput): Promise<{ user: { id: string; email: string; name: string }; tokens: TokenPair }> {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw Object.assign(new Error('邮箱已被注册'), { statusCode: 409 });
  }

  const hashed = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: { email: input.email, password: hashed, name: input.name },
    select: { id: true, email: true, name: true },
  });

  const payload: TokenPayload = { userId: user.id };
  const accessToken = signAccessToken(payload);
  const refreshTokenValue = signRefreshToken(payload);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: refreshTokenValue,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return { user, tokens: { accessToken, refreshToken: refreshTokenValue } };
}

export async function login(input: LoginInput): Promise<{ user: { id: string; email: string; name: string }; tokens: TokenPair }> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) {
    throw Object.assign(new Error('邮箱或密码错误'), { statusCode: 401 });
  }

  const valid = await comparePassword(input.password, user.password);
  if (!valid) {
    throw Object.assign(new Error('邮箱或密码错误'), { statusCode: 401 });
  }

  const payload: TokenPayload = { userId: user.id };
  const accessToken = signAccessToken(payload);
  const refreshTokenValue = signRefreshToken(payload);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: refreshTokenValue,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return {
    user: { id: user.id, email: user.email, name: user.name },
    tokens: { accessToken, refreshToken: refreshTokenValue },
  };
}

export async function refresh(refreshTokenValue: string): Promise<TokenPair> {
  let payload: TokenPayload;
  try {
    payload = verifyRefreshToken(refreshTokenValue);
  } catch {
    throw Object.assign(new Error('无效的 refresh token'), { statusCode: 401 });
  }

  const stored = await prisma.refreshToken.findUnique({ where: { token: refreshTokenValue } });
  if (!stored || stored.expiresAt < new Date()) {
    throw Object.assign(new Error('refresh token 已过期'), { statusCode: 401 });
  }

  await prisma.refreshToken.delete({ where: { id: stored.id } });

  const newPayload: TokenPayload = { userId: payload.userId };
  const accessToken = signAccessToken(newPayload);
  const newRefreshToken = signRefreshToken(newPayload);

  await prisma.refreshToken.create({
    data: {
      userId: payload.userId,
      token: newRefreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return { accessToken, refreshToken: newRefreshToken };
}

export async function logout(userId: string, refreshTokenValue: string): Promise<void> {
  await prisma.refreshToken.deleteMany({ where: { userId, token: refreshTokenValue } });
}
