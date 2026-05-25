import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import prisma from '../db';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ideas = await prisma.idea.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json({ ideas });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { content, source } = req.body;
    if (!content || typeof content !== 'string') {
      return res.status(400).json({ message: '缺少 content 字段' });
    }
    const idea = await prisma.idea.create({
      data: {
        userId: req.userId!,
        content: content.trim().slice(0, 500),
        source: source || 'web',
      },
    });
    res.status(201).json({ idea });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.idea.deleteMany({ where: { id: req.params.id, userId: req.userId } });
    res.json({ message: '已删除' });
  } catch (err) {
    next(err);
  }
});

export default router;
