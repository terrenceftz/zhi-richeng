import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
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
    next();
  } catch {
    return res.status(401).json({ message: 'token 无效或已过期' });
  }
}
