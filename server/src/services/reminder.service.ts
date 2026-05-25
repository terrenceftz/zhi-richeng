import prisma from '../db';
import * as settingsService from './settings.service';
import * as feishuService from './feishu.service';


const CHECK_INTERVAL = 60_000; // 1 minute
let intervalId: ReturnType<typeof setInterval> | null = null;

// Track sent reminders: key = "taskId_minutesBefore"
const sentReminders = new Set<string>();

export function startReminderService(): void {
  if (intervalId) return;
  console.log('[提醒] 已启动');
  checkAndRemind(); // immediate first run
  intervalId = setInterval(checkAndRemind, CHECK_INTERVAL);
}

async function checkAndRemind(): Promise<void> {
  try {
    const allSettings = await settingsService.getAllSettings();
    const reminderMinutes = parseInt(allSettings.reminder_minutes || '15');
    const reminderEnabled = allSettings.reminder_enabled !== 'false';

    if (!reminderEnabled) return;

    const now = new Date();
    const upcoming = await prisma.task.findMany({
      where: {
        dueDate: { not: null },
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

      // Only remind if event is within the reminder window
      if (diffMin < reminderMinutes || diffMin > reminderMinutes + 5) continue;
      if (diffMin <= 0) continue; // already passed

      const dedupeKey = `${task.id}_${reminderMinutes}`;
      if (sentReminders.has(dedupeKey)) continue;

      // Find user's Feishu OpenID
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
      await feishuService.sendReminder(openId, msg);
      sentReminders.add(dedupeKey);

      // Clean up old keys (keep set small)
      if (sentReminders.size > 1000) {
        const toRemove = [...sentReminders].filter((k) => k.startsWith(task.id));
        toRemove.forEach((k) => sentReminders.delete(k));
      }
    }
  } catch (err) {
    console.error('[提醒] 检查失败:', err);
  }
}
