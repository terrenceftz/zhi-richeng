import fs from 'fs';
import path from 'path';
import prisma from '../db';
import * as audit from './audit.service';

const CLEANUP_INTERVAL = 60 * 60 * 1000; // 每小时
const KEEP_DAILY_BACKUPS = 7; // 自动备份保留最近 7 天
let intervalId: ReturnType<typeof setInterval> | null = null;

// 与 backup.routes 同一套 DB 路径解析（cwd 作为 server 根，兼容 tsx/tsc 与 Docker）
const rawUrl = (process.env.DATABASE_URL || 'file:./dev.db').replace(/^file:/, '').trim();
const PRISMA_DIR = path.resolve(process.cwd(), 'prisma');
const DB_PATH = path.isAbsolute(rawUrl) ? rawUrl : path.resolve(PRISMA_DIR, rawUrl);
const BACKUP_DIR = path.resolve(process.cwd(), 'backups');

/** 每日自动备份 SQLite 数据库（幂等：当天已有备份则跳过），保留最近 KEEP_DAILY_BACKUPS 份 */
async function dailyBackup(): Promise<void> {
  try {
    if (!fs.existsSync(DB_PATH)) return;
    if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
    const dateKey = new Date().toISOString().slice(0, 10);
    const target = path.join(BACKUP_DIR, `auto-${dateKey}.db`);
    if (fs.existsSync(target)) return; // 今天已备份过
    // 先做 WAL checkpoint 合并未落盘写入，降低热备不一致风险
    await prisma.$queryRawUnsafe('PRAGMA wal_checkpoint(TRUNCATE)').catch(() => {});
    fs.copyFileSync(DB_PATH, target);
    console.log(`[备份] 已自动备份数据库 → ${target}`);

    const files = fs.readdirSync(BACKUP_DIR)
      .filter((f) => f.startsWith('auto-'))
      .sort();
    for (const f of files.slice(0, -KEEP_DAILY_BACKUPS)) {
      try { fs.unlinkSync(path.join(BACKUP_DIR, f)); } catch { /* 忽略 */ }
    }
  } catch (err) {
    console.error('[备份] 自动备份失败:', err);
  }
}

/** 清理过期的 RefreshToken，防止表无限增长 */
async function pruneExpiredTokens(): Promise<void> {
  try {
    const result = await prisma.refreshToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    if (result.count > 0) {
      console.log(`[清理] 删除 ${result.count} 个过期 refresh token`);
    }
    // 同时清理 30 天前的 ReminderLog
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    await prisma.reminderLog.deleteMany({ where: { sentAt: { lt: cutoff } } });
    // 清理 90 天前的审计日志
    await audit.pruneOldLogs();
  } catch (err) {
    console.error('[清理] 失败:', err);
  }
}

export function startCleanupService(): void {
  if (intervalId) return;
  dailyBackup();
  pruneExpiredTokens();
  intervalId = setInterval(() => {
    dailyBackup();
    pruneExpiredTokens();
  }, CLEANUP_INTERVAL);
}

export function stopCleanupService(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}
