import { Router, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import prisma from '../db';
import * as tasksService from '../services/tasks.service';
import * as llmService from '../services/llm.service';
import * as settingsService from '../services/settings.service';

const router = Router();

// 强制 HTTPS（防止 token 明文传输）；开发环境（NODE_ENV !== production）放行便于本地调试
function requireHTTPS(req: Request, res: Response, next: NextFunction) {
  if (process.env.NODE_ENV !== 'production') return next();
  if (req.secure || req.get('x-forwarded-proto') === 'https') {
    return next();
  }
  return res.status(403).json({ message: 'IM 接口必须使用 HTTPS' });
}

router.use(requireHTTPS);

// IM 接口限流：每 IP 每分钟 20 次
const imLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: '请求过于频繁，请稍后再试' },
});
router.use(imLimiter);

async function findUserByIMToken(token: string) {
  const userId = await settingsService.getSetting(`im_token_${token}`);
  if (!userId) return null;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  return user;
}

router.post('/task', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { text, token } = req.body;

    // Auth: token in body or Authorization header
    const imToken = token || req.headers.authorization?.replace('Bearer ', '');

    if (!imToken) {
      return res.status(401).json({ message: '缺少 IM token' });
    }

    const user = await findUserByIMToken(imToken);
    if (!user) {
      return res.status(401).json({ message: '无效的 IM token' });
    }

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ message: '缺少 text 字段' });
    }

    // Try NLP parse first
    let parsed: llmService.ParsedTask;
    try {
      parsed = await llmService.parseTask(text);
    } catch {
      // Fallback: create as basic task
      parsed = {
        title: text.slice(0, 100),
        dueDate: null,
        dueTime: null,
        priority: 'medium',
        category: '通用',
        tags: [],
      };
    }

    const task = await tasksService.createTask(user.id, {
      title: parsed.title || text.slice(0, 100),
      description: undefined,
      location: parsed.location,
      priority: parsed.priority,
      category: parsed.category || '通用',
      dueDate: parsed.dueDate || undefined,
      dueTime: parsed.dueTime || undefined,
      tags: parsed.tags || [],
    });

    res.status(201).json({
      success: true,
      task: {
        id: task.id,
        title: task.title,
        dueDate: task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : null,
        dueTime: task.dueTime,
        priority: task.priority,
      },
      message: `已添加：${task.title}${task.dueDate ? ` (${new Date(task.dueDate).toISOString().slice(0, 10)})` : ''}`,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
