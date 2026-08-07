import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

/**
 * 轻量请求体校验中间件（基于 zod）。
 * 用法：router.post('/', validate(BodySchema), handler)
 */
export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const err = result.error as ZodError;
      const msg = err.issues.map((i) => `${i.path.join('.') || 'body'}: ${i.message}`).join('; ');
      return res.status(400).json({ message: msg || '请求参数校验失败' });
    }
    req.body = result.data;
    next();
  };
}

/** 任务创建/更新共用的字段集合：仅允许写入白名单字段，过滤 sortOrder/id 等越权字段 */
export const taskCreateSchema = {
  shape: {
    title: (v: unknown) => typeof v === 'string' && v.trim().length > 0,
    description: (v: unknown) => v === undefined || v === null || typeof v === 'string',
    location: (v: unknown) => v === undefined || v === null || typeof v === 'string',
    status: (v: unknown) => v === undefined || ['todo', 'in_progress', 'done'].includes(v as string),
    priority: (v: unknown) => v === undefined || ['high', 'medium', 'low'].includes(v as string),
    category: (v: unknown) => v === undefined || v === null || typeof v === 'string',
    dueDate: (v: unknown) => v === undefined || v === null || typeof v === 'string',
    dueTime: (v: unknown) => v === undefined || v === null || typeof v === 'string',
    remind: (v: unknown) => v === undefined || typeof v === 'boolean',
    tags: (v: unknown) => v === undefined || Array.isArray(v),
    parentId: (v: unknown) => v === undefined || v === null || typeof v === 'string',
  } as Record<string, (v: unknown) => boolean>,
};

/** 仅保留白名单字段，过滤掉 id/userId/sortOrder/createdAt 等不可写字段 */
export function sanitizeTaskInput(input: Record<string, any>): Record<string, any> {
  const allowed = ['title', 'description', 'location', 'status', 'priority', 'category', 'dueDate', 'dueTime', 'remind', 'tags', 'parentId'];
  const out: Record<string, any> = {};
  for (const key of allowed) {
    if (key in input) out[key] = input[key];
  }
  // 类型修正
  if ('title' in out && typeof out.title !== 'string') delete out.title;
  if ('tags' in out && !Array.isArray(out.tags)) delete out.tags;
  if ('remind' in out && typeof out.remind !== 'boolean') delete out.remind;
  if ('status' in out && !['todo', 'in_progress', 'done'].includes(out.status)) delete out.status;
  if ('priority' in out && !['high', 'medium', 'low'].includes(out.priority)) delete out.priority;
  return out;
}
