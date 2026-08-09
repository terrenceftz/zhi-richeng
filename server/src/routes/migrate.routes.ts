import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { authMiddleware, requireAdmin } from '../middleware/auth.middleware';
import * as audit from '../services/audit.service';
import { exportBundle, importBundle } from '../services/migration.service';

const router = Router();
router.use(authMiddleware);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (_req, file, cb) => {
    // 仅允许 .json 迁移文件
    const ok = /\.json$/i.test(file.originalname);
    if (!ok) return cb(new Error('仅支持 .json 迁移文件'));
    cb(null, true);
  },
});

// GET /api/migrate/export — 一键导出全部可迁移数据（含设置/账号/学生/台账/谈心/日程/通知/灵感/周期提醒）。仅管理员。
router.get('/export', requireAdmin, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { bundle } = await exportBundle();
    await audit.log(_req.userId!, 'export_migrate', { ip: _req.ip });
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    res.setHeader('Content-Disposition', `attachment; filename="migrate-backup-${ts}.json"`);
    res.json(bundle);
  } catch (err) {
    next(err);
  }
});

// POST /api/migrate/import — 上传迁移文件，整体替换业务数据（事务原子，失败回滚）。仅管理员。
router.post('/import', requireAdmin, upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: '请上传迁移文件（.json）' });
    }
    let raw: any;
    try {
      raw = JSON.parse(req.file.buffer.toString('utf-8'));
    } catch {
      return res.status(400).json({ message: '迁移文件不是有效的 JSON' });
    }
    const counts = await importBundle(raw);
    await audit.log(req.userId!, 'import_migrate', { detail: JSON.stringify(counts), ip: req.ip });
    res.json({
      message: '导入成功',
      counts,
      hint: '若当前登录账号不在迁移文件中，请用迁移前的账号重新登录',
    });
  } catch (err: any) {
    if (err?.name === 'MulterError') {
      return res.status(400).json({ message: err.message || '上传失败' });
    }
    next(err);
  }
});

export default router;
