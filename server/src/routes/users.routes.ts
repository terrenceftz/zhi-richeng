import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../db';
import { authMiddleware, requireAdmin } from '../middleware/auth.middleware';
import { hashPassword } from '../utils/password';

const router = Router();
router.use(authMiddleware);

const PUBLIC_FIELDS = { id: true, email: true, name: true, role: true, createdAt: true };

router.get('/me', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: PUBLIC_FIELDS,
    });
    if (!user) return res.status(404).json({ message: '用户不存在' });
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

router.put('/me', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, password } = req.body;
    const data: any = {};
    if (name) data.name = String(name).slice(0, 50);
    if (password) {
      if (typeof password !== 'string' || password.length < 6) return res.status(400).json({ message: '密码长度至少6位' });
      data.password = await hashPassword(password);
    }
    const user = await prisma.user.update({
      where: { id: req.userId },
      data,
      select: PUBLIC_FIELDS,
    });
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

// 列出全部用户：仅管理员
router.get('/', requireAdmin, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await prisma.user.findMany({
      select: PUBLIC_FIELDS,
      orderBy: { createdAt: 'asc' },
    });
    res.json({ users });
  } catch (err) {
    next(err);
  }
});

// 删除用户：仅管理员
router.delete('/:id', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.params.id === req.userId) {
      return res.status(400).json({ message: '不能删除自己' });
    }
    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ message: '已删除' });
  } catch (err) {
    next(err);
  }
});

export default router;
