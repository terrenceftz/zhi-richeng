import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';

export function errorMiddleware(err: any, _req: Request, res: Response, _next: NextFunction) {
  const statusCode = err?.statusCode || 500;

  // 4xx：业务错误，message 可安全返回
  if (statusCode >= 400 && statusCode < 500) {
    console.error(`[ERROR] ${statusCode}: ${err?.message}`);
    return res.status(statusCode).json({ message: err?.message || '请求错误', status: statusCode });
  }

  // Prisma 已知错误（如唯一约束冲突）转 400/409
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const code = err.code === 'P2002' ? 409 : 400;
    console.error(`[PRISMA] ${err.code}: ${err.message}`);
    return res.status(code).json({ message: code === 409 ? '数据已存在（唯一约束冲突）' : '数据请求失败', status: code });
  }

  // 5xx：不向客户端泄漏内部信息
  console.error('[ERROR] 500:', err?.stack || err);
  return res.status(500).json({ message: '服务器内部错误', status: 500 });
}
