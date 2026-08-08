import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware, requireAdmin } from '../middleware/auth.middleware';
import * as audit from '../services/audit.service';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import prisma from '../db';

const router = Router();
router.use(authMiddleware);

// Prisma 约定：DATABASE_URL="file:./dev.db" 是相对于 prisma schema 所在目录（<server>/prisma）的路径。
// 不依赖 __dirname（tsx 内存编译与 tsc 输出目录不一致），统一用 cwd 作为 server 根。
const rawUrl = (process.env.DATABASE_URL || 'file:./dev.db').replace(/^file:/, '').trim();
const PRISMA_DIR = path.resolve(process.cwd(), 'prisma');
const DB_PATH = path.isAbsolute(rawUrl) ? rawUrl : path.resolve(PRISMA_DIR, rawUrl);

// SQLite 文件头魔数："SQLite format 3\0"（16 字节）
const SQLITE_MAGIC = Buffer.from('SQLite format 3\0');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (_req, file, cb) => {
    // 仅允许 .db / .sqlite / .sqlite3
    const ok = /\.(db|sqlite|sqlite3)$/i.test(file.originalname);
    if (!ok) return cb(new Error('仅支持 .db / .sqlite / .sqlite3 文件'));
    cb(null, true);
  },
});

// GET /api/backup — 下载整个 sqlite 数据库文件（二进制）。仅管理员。
router.get('/', requireAdmin, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    if (!fs.existsSync(DB_PATH)) {
      return res.status(404).json({ message: '数据库文件不存在' });
    }
    // 先做 WAL checkpoint，尽量把未落盘的写合并到主库，降低热备不一致风险
    await prisma.$queryRawUnsafe('PRAGMA wal_checkpoint(TRUNCATE)').catch(() => {});
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `zhi-richeng-backup-${timestamp}.db`;
    await audit.log(_req.userId!, 'backup_download', { ip: _req.ip });
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    fs.createReadStream(DB_PATH).pipe(res);
  } catch (err) {
    next(err);
  }
});

// POST /api/backup/restore — 上传 .db 文件覆盖恢复。仅管理员。
// 不再执行任意 SQL：仅校验 SQLite 魔数后做文件替换。
router.post('/restore', requireAdmin, upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: '请上传备份文件（.db）' });
    }

    // 校验 SQLite 魔数头，拒绝非数据库文件
    if (file.buffer.length < 16 || file.buffer.subarray(0, 16).toString() !== SQLITE_MAGIC.toString()) {
      return res.status(400).json({ message: '无效的 SQLite 数据库文件（魔数校验失败）' });
    }

    const backupDir = path.resolve(__dirname, '../../backups');
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

    // 恢复前的安全备份
    const safetyBackup = path.join(backupDir, `pre-restore-${Date.now()}.db`);
    if (fs.existsSync(DB_PATH)) fs.copyFileSync(DB_PATH, safetyBackup);

    try {
      await prisma.$disconnect();

      // 直接用上传的 buffer 覆盖数据库文件，完全不执行 SQL
      fs.writeFileSync(DB_PATH, file.buffer);

      await prisma.$connect();

      // 仅保留最近 3 个 pre-restore 备份
      const oldBackups = fs.readdirSync(backupDir)
        .filter((f: string) => f.startsWith('pre-restore-'))
        .sort()
        .reverse();
      for (const f of oldBackups.slice(3)) {
        try { fs.unlinkSync(path.join(backupDir, f)); } catch {}
      }

      await audit.log(req.userId!, 'backup_restore', { ip: req.ip });
      res.json({ message: '数据恢复成功，服务器已使用新数据' });
    } catch (restoreErr) {
      // 回滚到安全备份
      try {
        if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);
        fs.copyFileSync(safetyBackup, DB_PATH);
      } catch {}
      try { await prisma.$connect(); } catch {}
      console.error('[备份] 恢复失败，已回滚:', restoreErr);
      throw Object.assign(new Error('数据恢复失败，已自动回滚到恢复前的状态'), { statusCode: 500 });
    }
  } catch (err: any) {
    if (err?.name === 'MulterError' || err?.message) {
      return res.status(400).json({ message: err.message || '上传失败' });
    }
    next(err);
  }
});

export default router;
