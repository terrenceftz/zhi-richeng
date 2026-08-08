import prisma from '../db';
import * as settingsService from './settings.service';
import { visibleStudentWhere, type UserCtx } from '../utils/scope';

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

/** 是否启用月度报送（setting: mental_report_enabled，默认开启） */
export async function isReportEnabled(): Promise<boolean> {
  const raw = await settingsService.getSetting('mental_report_enabled');
  return raw !== 'false';
}

/** 当月报送日（setting: mental_report_day，默认 15；限制 1-28，避免 29/30/31 月末天数不足） */
export async function getReportDay(): Promise<number> {
  const raw = await settingsService.getSetting('mental_report_day');
  const d = parseInt(raw || '15', 10);
  return Number.isFinite(d) && d >= 1 && d <= 28 ? d : 15;
}

/** 判断指定日期是否为报送日（day 由调用方传入，默认 15；业务侧用 getReportDay() 读取可配置值） */
export function isReportDay(now: Date, day = 15): boolean {
  return now.getDate() === day;
}

/** 当月是否为寒暑假（不报送） */
export async function isHolidayMonth(now = new Date()): Promise<boolean> {
  const skip = await getSkipMonths();
  return skip.includes(now.getMonth() + 1);
}

/**
 * 获取本月（1号~今天）尚未跟进的台账学生（可见范围）。
 * 用于报送提醒与页面展示。
 */
export async function getNoFollowUpThisMonth(ctx: UserCtx): Promise<any[]> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const students = await prisma.student.findMany({
    where: { ...visibleStudentWhere(ctx), isMentalTarget: true },
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
 * 风险预警：长期未跟进的重点学生（可见范围）。
 * 规则：三级 >30 天、二级 >45 天、一级 >60 天未跟进；经济困难+心理健康 附加提示。
 */
export async function getRiskAlerts(ctx: UserCtx): Promise<any[]> {
  const now = new Date();
  const students = await prisma.student.findMany({
    where: { ...visibleStudentWhere(ctx), isMentalTarget: true },
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

// 心理台账报送的定时推送已并入「周期性任务提醒模块」（services/recurringReminder.service.ts，
// 内置 contentType=mental_report 的周期项，读取上方 isReportEnabled/getReportDay/getSkipMonths 等配置）。
// 本文件仅保留供页面展示与周期模块复用的查询/配置函数。
