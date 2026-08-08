import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import * as statsService from '../services/stats.service';
import * as llm from '../services/llm.service';

const router = Router();
router.use(authMiddleware);

/** 从请求构建 scope 上下文 */
function ctxOf(req: Request) {
  return { userId: req.userId, role: req.userRole, college: req.college };
}

async function collectStats(ctx: ReturnType<typeof ctxOf>) {
  const [overview, studentDist, mentalDist] = await Promise.all([
    statsService.getOverview(ctx),
    statsService.getStudentDist(ctx),
    statsService.getMentalDist(ctx),
  ]);
  return { overview, studentDist, mentalDist };
}

// 数据看板：一次返回全部统计
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await collectStats(ctxOf(req)));
  } catch (err) {
    next(err);
  }
});

// AI 看板解读：基于当前统计数据生成文字工作解读
router.post('/insight', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const summary = JSON.stringify(await collectStats(ctxOf(req)));
    const insight = await llm.statsInsight(summary);
    res.json({ insight });
  } catch (err) {
    next(err);
  }
});

export default router;
