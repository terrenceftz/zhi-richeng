import { Router, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { authMiddleware } from '../middleware/auth.middleware';
import * as noticesService from '../services/notices.service';
import * as llmService from '../services/llm.service';
import * as tasksService from '../services/tasks.service';

const router = Router();
router.use(authMiddleware);

const llmLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'AI 请求过于频繁，请稍后再试' },
});

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const notices = await noticesService.getNotices(req.userId!, {
      status: req.query.status as string | undefined,
    });
    res.json({ notices });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const notice = await noticesService.getNoticeById(req.userId!, req.params.id);
    res.json({ notice });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, source, deadline, materials, status, taskId } = req.body;
    if (!title || typeof title !== 'string') {
      return res.status(400).json({ message: '缺少通知标题' });
    }
    const notice = await noticesService.createNotice(req.userId!, {
      title, source, deadline, materials, status, taskId,
    });
    res.status(201).json({ notice });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const notice = await noticesService.updateNotice(req.userId!, req.params.id, req.body);
    res.json({ notice });
  } catch (err) {
    next(err);
  }
});

/** 切换材料项上报状态：body { submitted: boolean } */
router.patch('/:id/materials/:index', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const index = parseInt(req.params.index, 10);
    const submitted = !!req.body.submitted;
    const notice = await noticesService.toggleMaterial(req.userId!, req.params.id, index, submitted);
    res.json({ notice });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await noticesService.deleteNotice(req.userId!, req.params.id);
    res.json({ message: '已删除' });
  } catch (err) {
    next(err);
  }
});

/** 从通知文本提取：AI 解析为结构化通知，可选同时创建关联任务 */
router.post('/from-text', llmLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { text, createTask } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ message: '缺少 text 字段' });
    }
    const parsed = await llmService.extractNotice(text);

    let taskId: string | undefined;
    if (createTask) {
      const task = await tasksService.createTask(req.userId!, {
        title: parsed.title,
        dueDate: parsed.deadline || undefined,
        priority: 'high',
        category: '资料收集',
        description: parsed.materials.map((m) => `${m.required ? '[必]' : '[选]'} ${m.name}`).join('\n'),
      });
      taskId = task.id;
    }

    const notice = await noticesService.createNotice(req.userId!, {
      title: parsed.title,
      source: parsed.source || undefined,
      deadline: parsed.deadline || undefined,
      materials: parsed.materials.map((m) => ({ ...m, submitted: false })),
      taskId,
    });

    res.status(201).json({ notice });
  } catch (err) {
    if (err instanceof SyntaxError) {
      return res.status(422).json({ message: '通知解析失败，请检查内容格式' });
    }
    next(err);
  }
});

export default router;
