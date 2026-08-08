import prisma from '../db';
import * as settingsService from './settings.service';
import * as feishuService from './feishu.service';

/**
 * 心理台账月度报送 + 风险预警
 *
 * 业务规则：心理台账跟进于每月 15 号报送，寒暑假（默认 1/2/7/8 月，可配置）不计入。
 */

/** 读取寒暑假月份（可配置 setting: mental_report_skip_months，默认 "1,2,7,8"） */
export async function getSkipMonths(): Promise<number[]> {
  const raw = await settingsService.getSetting('mental_report_skip_months');
  if (raw) {
    const nums = raw.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => n >= 1 && n <= 12);
    if (nums.length > 0) return nums;
  }
  return [1, 2, 7, 8];
}

/** 当月是否为寒暑假（不报送） */
export async function isHolidayMonth(now = new Date()): Promise<boolean> {
  const skip = await getSkipMonths();
  return skip.includes(now.getMonth() + 1);
}

/** 是否为当月报送日（15 号） */
export function isReportDay(now = new Date()): boolean {
  return now.getDate() === 15;
}

/**
 * 获取本月（1号~今天）尚未跟进的台账学生。
 * 用于 15 号报送提醒与页面展示。
 */
export async function getNoFollowUpThisMonth(userId: string): Promise<any[]> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const students = await prisma.student.findMany({
    where: { userId, isMentalTarget: true },
    include: {
      mentalProfile: true,
      mentalRecords: {
        where: { date: { gte: monthStart } },
        orderBy: { date: 'desc' },
        take: 1,
        select: { id: true, date: true, situation: true },
      },
    },
    orderBy: [{ mentalProfile: { concernLevel: 'desc' } }, { name: 'asc' }],
  });
  return students.filter((s: any) => s.mentalRecords.length === 0);
}

/**
 * 风险预警：长期未跟进的重点学生。
 * 规则：三级 >30 天、二级 >45 天、一级 >60 天未跟进；经济困难+心理健康 附加提示。
 */
export async function getRiskAlerts(userId: string): Promise<any[]> {
  const now = new Date();
  const students = await prisma.student.findMany({
    where: { userId, isMentalTarget: true },
    include: {
      mentalProfile: true,
      mentalRecords: { orderBy: { date: 'desc' }, take: 1, select: { id: true, date: true, situation: true } },
    },
  });

  const alerts: any[] = [];
  for (const s of students) {
    const p = s.mentalProfile;
    if (!p) continue;
    const level = p.concernLevel || 1;
    const last = s.mentalRecords[0];
    const lastDate = last ? new Date(last.date) : new Date(p.includedAt || now);
    const days = Math.floor((now.getTime() - lastDate.getTime()) / 86400000);

    const thresholds: Record<number, number> = { 1: 60, 2: 45, 3: 30 };
    const threshold = thresholds[level] || 60;
    if (days > threshold) {
      alerts.push({
        studentId: s.id,
        name: s.name,
        studentNo: s.studentNo,
        className: s.className,
        concernLevel: level,
        daysSince: days,
        threshold,
        lastSituation: last?.situation || null,
        isPoverty: p.isPoverty,
        categories: (() => { try { return JSON.parse(p.categories || '[]'); } catch { return []; } })(),
        // 附加关注：经济困难 + 心理健康
        extraRisk: p.isPoverty && (p.categories || '').includes('心理健康'),
      });
    }
  }
  return alerts.sort((a, b) => b.concernLevel - a.concernLevel || b.daysSince - a.daysSince);
}

const CHECK_INTERVAL = 6 * 60 * 60 * 1000; // 每 6 小时检查一次（15 号当天触发）
let intervalId: ReturnType<typeof setInterval> | null = null;

export function startMentalReportService(): void {
  if (intervalId) return;
  console.log('[台账] 月度报送提醒已启动');
  checkMonthlyReport();
  intervalId = setInterval(checkMonthlyReport, CHECK_INTERVAL);
}

export function stopMentalReportService(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

/** 每月 15 号：向所有绑定了飞书的用户推送「本月未跟进学生」清单（寒暑假跳过，持久化去重） */
async function checkMonthlyReport(): Promise<void> {
  try {
    const now = new Date();
    if (!isReportDay(now)) return;
    if (await isHolidayMonth(now)) return;

    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const users = await prisma.user.findMany();

    for (const user of users) {
      // 持久化去重：本月已推送过则跳过
      const sent = await prisma.reminderLog.findUnique({
        where: { taskId_key: { taskId: user.id, key: `mental_report_${monthKey}` } },
      });
      if (sent) continue;

      const openId = await settingsService.getSetting(`feishu_openid_${user.id}`);
      if (!openId) continue;

      const pending = await getNoFollowUpThisMonth(user.id);
      if (pending.length === 0) continue;

      const lines = pending.slice(0, 15).map((s: any, i: number) =>
        `${i + 1}. ${s.name}（${s.className || '无班级'}）· ${s.mentalProfile?.concernLevel || 1}级${s.mentalProfile?.isPoverty ? ' 💰' : ''}`
      );
      const more = pending.length > 15 ? `\n... 等共 ${pending.length} 人` : '';
      const msg = [
        `📋 本月心理台账跟进报送提醒（${monthKey}）`,
        ``,
        `以下 ${pending.length} 名台账学生本月尚未跟进，请在 15 号前完成跟进报送：`,
        ``,
        lines.join('\n') + more,
        ``,
        `💡 如已完成请忽略；可在「心理台账」页面查看详情`,
      ].join('\n');

      console.log(`[台账] 月度报送提醒: ${user.email} (${pending.length} 人)`);
      await feishuService.sendReminder(openId, msg);
      try {
        await prisma.reminderLog.create({ data: { taskId: user.id, key: `mental_report_${monthKey}` } });
      } catch {
        /* 唯一约束冲突忽略 */
      }
    }
  } catch (err) {
    console.error('[台账] 月度报送检查失败:', err);
  }
}
