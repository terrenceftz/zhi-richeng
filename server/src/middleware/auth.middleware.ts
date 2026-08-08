import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import prisma from '../db';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userRole?: string;
      college?: string;
    }
  }
}

/**
 * 认证中间件：验证 access token，并从数据库读取最新 role/college 挂到请求上。
 * 从 DB 刷新（而非直接用 token 内 role）可避免角色/学院变更后旧 token 仍带旧权限。
 */
export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: '未提供认证 token' });
  }

  const token = header.slice(7);
  try {
    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { role: true, college: true },
    });
    if (!user) {
      return res.status(401).json({ message: '用户不存在' });
    }
    req.userId = payload.userId;
    req.userRole = user.role;
    req.college = user.college || '';
    next();
  } catch {
    return res.status(401).json({ message: 'token 无效或已过期' });
  }
}

/**
 * 要求当前用户为管理员。
 * 以数据库为准做一次校验（防止角色变更后旧 token 仍带 admin）。
 */
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: '未认证' });
    }
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { role: true, college: true },
    });
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: '需要管理员权限' });
    }
    req.userRole = 'admin';
    req.college = user.college || '';
    next();
  } catch {
    return res.status(500).json({ message: '服务器内部错误' });
  }
}
