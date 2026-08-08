import prisma from '../db';
import * as settingsService from './settings.service';
import * as feishuService from './feishu.service';

const CHECK_INTERVAL = 60_000; // 1 minute
let intervalId: ReturnType<typeof setInterval> | null = null;

export function startReminderService(): void {
  if (intervalId) return;
  console.log('[提醒] 已启动');
  checkAndRemind(); // immediate first run
  intervalId = setInterval(checkAndRemind, CHECK_INTERVAL);
}

export function stopReminderService(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

async function hasSent(taskId: string, key: string): Promise<boolean> {
  const row = await prisma.reminderLog.findUnique({
    where: { taskId_key: { taskId, key } },
  });
  return !!row;
}

async function markSent(taskId: string, key: string): Promise<void> {
  try {
    await prisma.reminderLog.create({ data: { taskId, key } });
  } catch {
    // 唯一约束冲突 = 已记录过，忽略
  }
}

async function checkAndRemind(): Promise<void> {
  try {
    const allSettings = await settingsService.getAllSettings();
    const reminderMinutes = parseInt(allSettings.reminder_minutes || '15');
    const reminderEnabled = allSettings.reminder_enabled !== 'false';

    if (!reminderEnabled) return;

    const now = new Date();
    // 时间窗：只看今天±1 天的任务，避免每分钟全表扫描
    const windowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const windowEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const upcoming = await prisma.task.findMany({
      where: {
        dueDate: { not: null, gte: windowStart, lte: windowEnd },
        dueTime: { not: null },
        status: { not: 'done' },
      },
    });

    for (const task of upcoming) {
      if (!task.dueDate || !task.dueTime) continue;

      const [h, m] = task.dueTime.split(':').map(Number);
      const eventTime = new Date(task.dueDate);
      eventTime.setHours(h, m, 0, 0);

      const diffMs = eventTime.getTime() - now.getTime();
      const diffMin = Math.round(diffMs / 60000);

      // 已过期不发
      if (diffMin <= 0) continue;

      // 提醒窗口：在 [reminderMinutes - 2, reminderMinutes + 2] 分钟之间（容差避免轮询漏发）
      if (diffMin < reminderMinutes - 2 || diffMin > reminderMinutes + 2) continue;

      // 去重键绑定具体事件时间，参数调整不会导致重复提醒
      const dedupeKey = `reminder_${eventTime.getTime()}`;
      if (await hasSent(task.id, dedupeKey)) continue;

      const openId = await settingsService.getSetting(`feishu_openid_${task.userId}`);
      if (!openId) continue;

      const msg = [
        `⏰ 日程提醒（${reminderMinutes} 分钟后）`,
        `📌 ${task.title}`,
        `🕐 ${task.dueTime}`,
        task.location ? `📍 ${task.location}` : '',
        task.priority === 'high' ? '🔥 高优先级' : '',
      ].filter(Boolean).join('\n');

      console.log(`[提醒] 发送提醒: ${task.title} (${task.dueTime}) -> ${openId}`);
      const ok = await feishuService.sendReminder(openId, msg);
      if (ok) await markSent(task.id, dedupeKey);
    }

    // 逾期即时提醒：任务刚过期（事件时间在过去 0~5 分钟内）时发一条
    const justOverdue = await prisma.task.findMany({
      where: {
        dueDate: { not: null, gte: windowStart, lte: windowEnd },
        dueTime: { not: null },
        status: { not: 'done' },
      },
    });
    for (const task of justOverdue) {
      if (!task.dueDate || !task.dueTime) continue;
      const [h, m] = task.dueTime.split(':').map(Number);
      const eventTime = new Date(task.dueDate);
      eventTime.setHours(h, m, 0, 0);
      const diffMin = Math.round((now.getTime() - eventTime.getTime()) / 60000);
      // 事件时间在过去 0~5 分钟之间才算「刚过期」
      if (diffMin < 0 || diffMin > 5) continue;

      const overdueKey = 'overdue';
      if (await hasSent(task.id, overdueKey)) continue;

      const openId = await settingsService.getSetting(`feishu_openid_${task.userId}`);
      if (!openId) continue;

      const msg = [
        `🔴 任务已逾期`,
        `📌 ${task.title}`,
        `🕐 ${task.dueTime}（已过 ${diffMin} 分钟）`,
        task.location ? `📍 ${task.location}` : '',
        task.priority === 'high' ? '🔥 高优先级，请尽快处理' : '',
      ].filter(Boolean).join('\n');

      console.log(`[提醒] 发送逾期提醒: ${task.title} -> ${openId}`);
      const ok = await feishuService.sendReminder(openId, msg);
      if (ok) await markSent(task.id, overdueKey);
    }
  } catch (err) {
    console.error('[提醒] 检查失败:', err);
  }
}
