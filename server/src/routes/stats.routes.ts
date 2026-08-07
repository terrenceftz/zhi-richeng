import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import * as statsService from '../services/stats.service';
import * as llm from '../services/llm.service';

const router = Router();
router.use(authMiddleware);

async function collectStats(userId: string) {
  const [overview, studentDist, mentalDist] = await Promise.all([
    statsService.getOverview(userId),
    statsService.getStudentDist(userId),
    statsService.getMentalDist(userId),
  ]);
  return { overview, studentDist, mentalDist };
}

// 数据看板：一次返回全部统计
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await collectStats(req.userId!));
  } catch (err) {
    next(err);
  }
});

// AI 看板解读：基于当前统计数据生成文字工作解读
router.post('/insight', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const summary = JSON.stringify(await collectStats(req.userId!));
    const insight = await llm.statsInsight(summary);
    res.json({ insight });
  } catch (err) {
    next(err);
  }
});

export default router;
