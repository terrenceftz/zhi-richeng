import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.service';
import * as settingsService from '../services/settings.service';
import * as audit from '../services/audit.service';
import prisma from '../db';

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ message: '缺少必填字段：email, password, name' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: '密码长度至少6位' });
    }

    // 注册开关：默认关闭（与 seed 一致）；首个用户总是允许
    const enabled = await settingsService.getSetting('registration_enabled');
    const userCount = await prisma.user.count();
    if (enabled !== 'true' && userCount > 0) {
      return res.status(403).json({ message: '注册已关闭' });
    }

    const result = await authService.register({ email, password, name });
    res.status(201).json({
      user: result.user,
      accessToken: result.tokens.accessToken,
      refreshToken: result.tokens.refreshToken,
    });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: '缺少必填字段：email, password' });
    }
    const result = await authService.login({ email, password });
    await audit.log(result.user.id, 'login', { ip: req.ip });
    res.json({
      user: result.user,
      accessToken: result.tokens.accessToken,
      refreshToken: result.tokens.refreshToken,
    });
  } catch (err) {
    next(err);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ message: '缺少 refreshToken' });
    }
    const tokens = await authService.refresh(refreshToken);
    res.json(tokens);
  } catch (err) {
    next(err);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken } = req.body;
    await authService.logout(req.userId!, refreshToken || '');
    res.json({ message: '已注销' });
  } catch (err) {
    next(err);
  }
}
