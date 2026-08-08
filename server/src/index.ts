import http from 'http';
import app from './app';
import { config } from './config';
import { startFeishuClient, stopFeishuClient } from './services/feishu.service';
import { startReminderService, stopReminderService } from './services/reminder.service';
import { startDigestService, stopDigestService } from './services/digest.service';
import { startCleanupService, stopCleanupService } from './services/cleanup.service';
import { startRecurringReminderService, stopRecurringReminderService } from './services/recurringReminder.service';
import prisma from './db';

const server = http.createServer(app);

server.listen(config.port, () => {
  console.log(`Server running on http://localhost:${config.port}`);
  startFeishuClient();
  startReminderService();
  startDigestService();
  startRecurringReminderService();
  startCleanupService();
});

// 优雅关闭：收到终止信号时依次停掉后台服务并断开数据库连接
let shuttingDown = false;
async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n[关闭] 收到 ${signal}，开始优雅关闭...`);
  stopReminderService();
  stopDigestService();
  stopRecurringReminderService();
  stopCleanupService();
  stopFeishuClient();
  server.close(() => {
    console.log('[关闭] HTTP 服务已关闭');
  });
  try {
    await prisma.$disconnect();
    console.log('[关闭] 数据库连接已断开');
  } catch (e) {
    console.error('[关闭] 数据库断开失败', e);
  }
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
