/**
 * 教学日历工具 - 根据学期起止日期计算当前教学周
 */

export interface SemesterConfig {
  name: string;
  start: string; // YYYY-MM-DD，学期第一周周一
  end: string;   // YYYY-MM-DD，学期最后一天
}

export interface TeachingWeekInfo {
  /** 学期名称 */
  name: string;
  /** 当前教学周（1 起始），若超出学期范围则返回 null */
  week: number | null;
  /** 是否为寒暑假（不在任何学期内） */
  isBreak: boolean;
}

/**
 * 根据学期配置计算当前教学周
 * @param semester 学期配置，若 name 为空则返回 null
 */
export function getTeachingWeek(semester: SemesterConfig | null): TeachingWeekInfo | null {
  if (!semester || !semester.name || !semester.start) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(semester.start);
  start.setHours(0, 0, 0, 0);

  // 学期还没开始
  if (today < start) {
    return { name: semester.name, week: null, isBreak: true };
  }

  // 有结束日期且已超过
  if (semester.end) {
    const end = new Date(semester.end);
    end.setHours(0, 0, 0, 0);
    if (today > end) {
      return { name: semester.name, week: null, isBreak: true };
    }
  }

  const diffDays = Math.floor((today.getTime() - start.getTime()) / 86400000);
  const week = Math.floor(diffDays / 7) + 1;

  // 默认学期最长 22 周
  if (week > 22) {
    return { name: semester.name, week: null, isBreak: true };
  }

  return { name: semester.name, week, isBreak: false };
}

/**
 * 距离寒暑假倒计时
 * - 学期中：距学期结束（暑假）还有 X 天
 * - 假期中（开学前）：距开学还有 X 天
 * - 假期中（学期已结束）：返回 null（暑假中）
 */
export function getBreakCountdown(semester: SemesterConfig | null): { label: string; daysUntil: number } | null {
  if (!semester || !semester.name || !semester.start) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(semester.start);
  start.setHours(0, 0, 0, 0);

  // 学期还没开始 → 寒假中，距开学
  if (today < start) {
    const diffMs = start.getTime() - today.getTime();
    const daysUntil = Math.ceil(diffMs / 86400000);
    return { label: '开学', daysUntil };
  }

  // 学期中 → 距暑假
  if (semester.end) {
    const end = new Date(semester.end);
    end.setHours(0, 0, 0, 0);
    if (today <= end) {
      const diffMs = end.getTime() - today.getTime();
      const daysUntil = Math.ceil(diffMs / 86400000);
      return { label: '暑假', daysUntil };
    }
  }

  // 暑假中（学期已结束），无下学期配置
  return null;
}
