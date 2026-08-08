import prisma from '../db';
import * as settingsService from './settings.service';
import * as feishuService from './feishu.service';
import { getNoFollowUpThisMonth, getReportDay, getSkipMonths, isReportEnabled } from './mentalAlert.service';

const CHECK_INTERVAL = 10 * 60 * 1000; // 每 10 分钟检查一次
let intervalId: ReturnType<typeof setInterval> | null = null;

export function startRecurringReminderService(): void {
  if (intervalId) return;
  console.log('[周期] 周期性任务提醒已启动');
  ensureBuiltinReminders().then(() => {
    checkDue();
    intervalId = setInterval(checkDue, CHECK_INTERVAL);
  });
}

export function stopRecurringReminderService(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

/** 启动时确保内置「心理台账报送」项存在 */
export async function ensureBuiltinReminders(): Promise<void> {
  const exists = await prisma.recurringReminder.findFirst({ where: { builtin: true } });
  if (!exists) {
    await prisma.recurringReminder.create({
      data: {
        title: '心理台账报送',
        cycleType: 'monthly',
        time: '08:00',
        dayOfMonth: 15,
        contentType: 'mental_report',
        builtin: true,
        enabled: true,
      },
    });
    console.log('[周期] 已创建内置项：心理台账报送');
  }
}

function localDateKey(now: Date, cycleType: string): string {
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  const date = local.toISOString().slice(0, 10);
  return cycleType === 'monthly' ? date.slice(0, 7) : date;
}

async function hasSent(id: string, key: string): Promise<boolean> {
  const row = await prisma.reminderLog.findUnique({ where: { taskId_key: { taskId: id, key } } });
  return !!row;
}

async function markSent(id: string, key: string): Promise<void> {
  try {
    await prisma.reminderLog.create({ data: { taskId: id, key } });
  } catch {
    /* 唯一约束冲突忽略 */
  }
}

/** 今天是否应触发（含补发：到点后当天/当月未发则补） */
async function isDueToday(reminder: any, now: Date): Promise<boolean> {
  // 配置的触发时间（HH:MM）：未到该时刻不触发；到点后当天未发则补发（去重键保证一次）
  const timeReached = (): boolean => {
    const [h, m] = String(reminder.time || '09:00').split(':').map(Number);
    return now.getHours() * 60 + now.getMinutes() >= (h || 0) * 60 + (m || 0);
  };

  if (reminder.contentType === 'mental_report') {
    if (!(await isReportEnabled())) return false;
    if ((await getSkipMonths()).includes(now.getMonth() + 1)) return false;
    // 到报送日或之后、当月未发（由去重键保证当月一次）
    return now.getDate() >= (await getReportDay());
  }

  switch (reminder.cycleType) {
    case 'daily':
      return timeReached();
    case 'weekly': {
      const wds = String(reminder.weekdays || '')
        .split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => n >= 0 && n <= 6);
      if (wds.length === 0) return false;
      return wds.includes(now.getDay()) && timeReached();
    }
    case 'monthly': {
      const day = reminder.dayOfMonth;
      if (!day || day < 1 || day > 28) return false;
      return now.getDate() >= day && timeReached();
    }
    default:
      return false;
  }
}

async function checkDue(): Promise<void> {
  try {
    const now = new Date();
    const reminders = await prisma.recurringReminder.findMany({ where: { enabled: true } });
    if (reminders.length === 0) return;

    const users = await prisma.user.findMany();
    for (const r of reminders) {
      try {
        if (!(await isDueToday(r, now))) continue;
        const key = `recurring_${r.id}_${localDateKey(now, r.cycleType)}`;
        if (await hasSent(r.id, key)) continue;

        if (r.contentType === 'mental_report') {
          await pushMentalReport(users, r, now, key);
        } else {
          await pushText(users, r, key);
        }
      } catch (err) {
        console.error(`[周期] 处理失败 ${r.title}:`, err);
      }
    }
  } catch (err) {
    console.error('[周期] 检查失败:', err);
  }
}

/** 固定文本提醒：向所有绑定飞书的用户推送同一消息 */
async function pushText(users: any[], reminder: any, key: string): Promise<void> {
  const msg = [reminder.title, reminder.content ? `\n${reminder.content}` : ''].filter(Boolean).join('');
  let pushed = false;
  for (const u of users) {
    const openId = await settingsService.getSetting(`feishu_openid_${u.id}`);
    if (!openId) continue;
    const ok = await feishuService.sendReminder(openId, msg);
    if (ok) pushed = true;
  }
  if (pushed) {
    await markSent(reminder.id, key);
    console.log(`[周期] 已推送: ${reminder.title}`);
  }
}

/** 心理台账报送：按用户分别推送各自本月未跟进学生清单 */
async function pushMentalReport(users: any[], reminder: any, now: Date, key: string): Promise<void> {
  const reportDay = await getReportDay();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  let pushed = false;

  for (const user of users) {
    const openId = await settingsService.getSetting(`feishu_openid_${user.id}`);
    if (!openId) continue;

    const pending = await getNoFollowUpThisMonth({ userId: user.id, role: 'user', college: user.college || '' });
    if (pending.length === 0) continue;

    const lines = pending.slice(0, 15).map((s: any, i: number) =>
      `${i + 1}. ${s.name}（${s.className || '无班级'}）· ${s.mentalProfile?.concernLevel || 1}级${s.mentalProfile?.isPoverty ? ' 💰' : ''}`
    );
    const more = pending.length > 15 ? `\n... 等共 ${pending.length} 人` : '';
    const msg = [
      `📋 本月心理台账跟进报送提醒（${monthKey}）`,
      ``,
      `以下 ${pending.length} 名台账学生本月尚未跟进，请在 ${reportDay} 号前完成跟进报送：`,
      ``,
      lines.join('\n') + more,
      ``,
      `💡 如已完成请忽略；可在「心理台账」页面查看详情`,
    ].join('\n');

    const ok = await feishuService.sendReminder(openId, msg);
    if (ok) pushed = true;
  }

  if (pushed) {
    await markSent(reminder.id, key);
    console.log(`[周期] 心理台账报送已推送（${monthKey}）`);
  }
}