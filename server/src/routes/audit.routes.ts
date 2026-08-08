import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware, requireAdmin } from '../middleware/auth.middleware';
import * as auditService from '../services/audit.service';

const router = Router();
router.use(authMiddleware);

// 审计日志列表（仅管理员）：分页 + 按操作类型筛选
router.get('/', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await auditService.getLogs(req.userId!, {
      action: (req.query.action as string) || undefined,
      page: parseInt(req.query.page as string) || 1,
      pageSize: parseInt(req.query.pageSize as string) || 50,
    });
    res.json({ ...result, actions: auditService.AUDIT_ACTIONS });
  } catch (err) {
    next(err);
  }
});

export default router;
