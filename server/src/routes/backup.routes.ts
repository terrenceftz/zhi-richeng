import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import multer from 'multer';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import prisma from '../db';

const router = Router();
router.use(authMiddleware);

const DB_PATH = path.resolve(process.env.DATABASE_URL?.replace('file:', '') || path.join(__dirname, '../../prisma/dev.db'));

// Multer for file upload (accept .sql files, max 10MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    // Accept .sql, .txt, or any file (we validate content)
    cb(null, true);
  },
});

// GET /api/backup — download a SQL dump of the database
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    // Ensure db file exists
    if (!fs.existsSync(DB_PATH)) {
      return res.status(404).json({ message: '数据库文件不存在' });
    }

    const sql = execSync(`sqlite3 "${DB_PATH}" .dump`, {
      encoding: 'utf-8',
      maxBuffer: 50 * 1024 * 1024, // 50MB
    });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `zhi-richeng-backup-${timestamp}.sql`;

    res.setHeader('Content-Type', 'application/sql');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(sql);
  } catch (err) {
    next(err);
  }
});

// POST /api/backup/restore — upload and restore from a SQL dump
router.post('/restore', upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: '请上传备份文件' });
    }

    const sql = file.buffer.toString('utf-8').trim();
    if (!sql) {
      return res.status(400).json({ message: '备份文件为空' });
    }

    // Validate: must contain SQL statements
    if (!sql.match(/^(CREATE TABLE|INSERT INTO|PRAGMA|BEGIN)/mi)) {
      return res.status(400).json({ message: '无效的备份文件格式，请上传正确的 SQL 备份文件' });
    }

    // Check file size reasonableness
    if (sql.length < 50) {
      return res.status(400).json({ message: '备份文件内容过短，可能已损坏' });
    }

    // Backup current database before restore (safety net)
    const backupDir = path.resolve(__dirname, '../../backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    const safetyBackup = path.join(backupDir, `pre-restore-${Date.now()}.db`);
    if (fs.existsSync(DB_PATH)) {
      fs.copyFileSync(DB_PATH, safetyBackup);
    }

    try {
      // Disconnect Prisma, restore, reconnect
      await prisma.$disconnect();

      // Write SQL to temp file and import
      const tempSql = path.join(backupDir, 'restore-temp.sql');
      fs.writeFileSync(tempSql, sql, 'utf-8');

      // Delete existing database
      if (fs.existsSync(DB_PATH)) {
        fs.unlinkSync(DB_PATH);
      }

      // Run the SQL import
      execSync(`sqlite3 "${DB_PATH}" < "${tempSql}"`, { maxBuffer: 50 * 1024 * 1024 });

      // Clean up temp file
      fs.unlinkSync(tempSql);

      // Reconnect Prisma
      await prisma.$connect();

      // Clean up safety backup (keep last 3)
      const oldBackups = fs.readdirSync(backupDir)
        .filter((f: string) => f.startsWith('pre-restore-'))
        .sort()
        .reverse();
      for (const f of oldBackups.slice(3)) {
        fs.unlinkSync(path.join(backupDir, f));
      }

      res.json({ message: '数据恢复成功，服务器将使用新数据' });
    } catch (restoreErr) {
      // Restore failed — try to recover from safety backup
      try {
        if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);
        fs.copyFileSync(safetyBackup, DB_PATH);
      } catch {}

      // Reconnect
      try { await prisma.$connect(); } catch {}

      throw Object.assign(new Error('数据恢复失败，已自动回滚到恢复前的状态'), { statusCode: 500 });
    }
  } catch (err) {
    next(err);
  }
});

export default router;
