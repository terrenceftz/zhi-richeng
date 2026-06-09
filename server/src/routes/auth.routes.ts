import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { register, login, refresh, logout } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// 登录频率限制：每 IP 每分钟最多 10 次
const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { message: '请求过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});

// 注册频率限制：每 IP 每小时最多 5 次
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { message: '注册请求过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/register', registerLimiter, register);
router.post('/login', loginLimiter, login);
router.post('/refresh', refresh);
router.post('/logout', authMiddleware, logout);

export default router;
