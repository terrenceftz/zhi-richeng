import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../db';
import { authMiddleware, requireAdmin } from '../middleware/auth.middleware';
import { hashPassword, comparePassword } from '../utils/password';

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
    const { name, password, oldPassword } = req.body;
    // 修改密码必须提供当前密码，防止 access token 被盗后直接改密锁定账号
    if (password) {
      if (typeof password !== 'string' || password.length < 6) return res.status(400).json({ message: '密码长度至少6位' });
      if (!oldPassword || typeof oldPassword !== 'string') {
        return res.status(400).json({ message: '修改密码需提供原密码' });
      }
      const user = await prisma.user.findUnique({ where: { id: req.userId } });
      if (!user) return res.status(404).json({ message: '用户不存在' });
      const ok = await comparePassword(oldPassword, user.password);
      if (!ok) return res.status(400).json({ message: '原密码不正确' });
    }
    const data: any = {};
    if (name) data.name = String(name).slice(0, 50);
    if (password) {
      data.password = await hashPassword(password);
      // 改密成功后吊销该用户全部 refresh token（其它设备强制下线）
      await prisma.refreshToken.deleteMany({ where: { userId: req.userId } });
    }
    const updated = await prisma.user.update({
      where: { id: req.userId },
      data,
      select: PUBLIC_FIELDS,
    });
    res.json({ user: updated });
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

// 调整用户角色（分级）：仅管理员。roles: admin 系统管理员 / dept_admin 院系管理员 / user 普通用户
router.put('/:id/role', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { role } = req.body;
    if (!['admin', 'dept_admin', 'user'].includes(role)) {
      return res.status(400).json({ message: '无效的角色' });
    }
    if (req.params.id === req.userId && role !== 'admin') {
      return res.status(400).json({ message: '不能取消自己的管理员角色' });
    }
    const existing = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ message: '用户不存在' });
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { role },
      select: PUBLIC_FIELDS,
    });
    // 角色变更后吊销该用户全部 refresh token，强制重新登录以同步权限
    await prisma.refreshToken.deleteMany({ where: { userId: req.params.id } });
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

export default router;
