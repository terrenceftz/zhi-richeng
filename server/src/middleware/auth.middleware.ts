import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import prisma from '../db';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userRole?: string;
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: '未提供认证 token' });
  }

  const token = header.slice(7);
  try {
    const payload = verifyAccessToken(token);
    req.userId = payload.userId;
    req.userRole = payload.role || 'user';
    next();
  } catch {
    return res.status(401).json({ message: 'token 无效或已过期' });
  }
}

/**
 * 要求当前用户为管理员。
 * token 中携带 role（签发时写入），但为防止角色变更后旧 token 仍带 admin，
 * 这里以数据库为准做一次校验。
 */
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: '未认证' });
    }
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { role: true },
    });
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: '需要管理员权限' });
    }
    req.userRole = 'admin';
    next();
  } catch {
    return res.status(500).json({ message: '服务器内部错误' });
  }
}
