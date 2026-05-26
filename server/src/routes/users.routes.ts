import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../db';
import { authMiddleware } from '../middleware/auth.middleware';
import { hashPassword } from '../utils/password';

const router = Router();
router.use(authMiddleware);

router.get('/me', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, email: true, name: true, createdAt: true },
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
    if (name) data.name = name;
    if (password) {
      if (password.length < 6) return res.status(400).json({ message: '密码长度至少6位' });
      data.password = await hashPassword(password);
    }
    const user = await prisma.user.update({
      where: { id: req.userId },
      data,
      select: { id: true, email: true, name: true, createdAt: true },
    });
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ users });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.params.id === req.userId) {
      return res.status(400).json({ message: '不能删除自己' });
    }
    // Admin is user with id=1 (first registered) or email=admin@mboker.cn
    const requestingUser = await prisma.user.findUnique({ where: { id: req.userId! } });
    if (!requestingUser || requestingUser.email !== 'admin@mboker.cn') {
      return res.status(403).json({ message: '仅管理员可删除用户' });
    }
    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ message: '已删除' });
  } catch (err) {
    next(err);
  }
});

export default router;
