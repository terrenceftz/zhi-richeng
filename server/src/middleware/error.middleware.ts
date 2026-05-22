import { Request, Response, NextFunction } from 'express';

export function errorMiddleware(err: any, _req: Request, res: Response, _next: NextFunction) {
  const statusCode = err.statusCode || 500;
  const message = err.message || '服务器内部错误';
  console.error(`[ERROR] ${statusCode}: ${message}`);
  if (statusCode === 500) console.error(err.stack);
  res.status(statusCode).json({ message, status: statusCode });
}
