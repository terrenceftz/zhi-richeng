/**
 * 2026 年中国法定节假日数据
 * 注：国务院具体调休安排通常在年前公布，以下基于农历推算，届时可更新。
 */

export interface Holiday {
  /** 日期 YYYY-MM-DD */
  date: string;
  /** 节假日名称 */
  name: string;
  /** 是否为休息日（含周末调休的休息日） */
  isRestDay: boolean;
  /** 是否为法定节假日（区别于普通周末） */
  isStatutory: boolean;
}

/**
 * 判断是否为周末
 */
function isWeekend(dateStr: string): boolean {
  const d = new Date(dateStr);
  const day = d.getDay();
  return day === 0 || day === 6;
}

/**
 * 生成日期范围内的所有日期
 */
function dateRange(start: string, end: string): string[] {
  const result: string[] = [];
  const s = new Date(start);
  const e = new Date(end);
  const cur = new Date(s);
  while (cur <= e) {
    result.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return result;
}

/**
 * 2026 年法定节假日
 * 数据来源：基于农历推算（正月初一 = 2026-02-17，五月初五 = 2026-06-19，八月十五 = 2026-09-25）
 * 调休安排为预估，国务院正式通知发布后请更新
 */
const STATUTORY_HOLIDAYS_2026: { name: string; range: [string, string]; makeupDays?: string[] }[] = [
  {
    name: '元旦',
    range: ['2026-01-01', '2026-01-03'],
  },
  {
    name: '春节',
    range: ['2026-02-15', '2026-02-21'], // 除夕 2/16(一) → 初六 2/22(日)，预估调休 2/14(六)、2/28(六)
    makeupDays: ['2026-02-14', '2026-02-28'],
  },
  {
    name: '清明节',
    range: ['2026-04-04', '2026-04-06'],
  },
  {
    name: '劳动节',
    range: ['2026-05-01', '2026-05-05'],
    makeupDays: ['2026-05-09'],
  },
  {
    name: '端午节',
    range: ['2026-06-19', '2026-06-21'],
  },
  {
    name: '中秋节',
    range: ['2026-09-25', '2026-09-27'],
  },
  {
    name: '国庆节',
    range: ['2026-10-01', '2026-10-07'],
    makeupDays: ['2026-09-27', '2026-10-10'],
  },
];

// 构建全量 Map
function buildHolidayMap(): Map<string, Holiday> {
  const map = new Map<string, Holiday>();

  for (const h of STATUTORY_HOLIDAYS_2026) {
    // 法定休息日
    for (const date of dateRange(h.range[0], h.range[1])) {
      map.set(date, { date, name: h.name, isRestDay: true, isStatutory: true });
    }
    // 调休上班日（虽然是周末但要上班）
    if (h.makeupDays) {
      for (const date of h.makeupDays) {
        map.set(date, { date, name: `${h.name}调休`, isRestDay: false, isStatutory: false });
      }
    }
  }

  return map;
}

const holidayMap = buildHolidayMap();

/**
 * 获取指定日期的节假日信息
 */
export function getHoliday(dateStr: string): Holiday | null {
  // 截取 YYYY-MM-DD
  const key = dateStr.slice(0, 10);
  const holiday = holidayMap.get(key);
  if (holiday) return holiday;

  // 普通周末也算休息日，但不标法定节假日
  if (isWeekend(key)) {
    return { date: key, name: '周末', isRestDay: true, isStatutory: false };
  }

  return null;
}

/**
 * 判断是否为法定节假日（休息日，非调休上班日）
 */
export function isHoliday(dateStr: string): boolean {
  const h = getHoliday(dateStr);
  return h !== null && h.isRestDay;
}

/**
 * 判断是否为法定节假日（排除普通周末）
 */
export function isStatutoryHoliday(dateStr: string): boolean {
  const h = getHoliday(dateStr);
  return h !== null && h.isStatutory;
}

/**
 * 获取所有节假日（用于展示列表）
 */
export function getAllStatutoryHolidays(): { name: string; range: [string, string] }[] {
  return STATUTORY_HOLIDAYS_2026.map((h) => ({ name: h.name, range: h.range }));
}

/**
 * 获取距离最近的下一个法定节假日还有多少天
 * 返回 null 表示今年没有更多节假日了
 */
export function getNextHolidayCountdown(): { name: string; startDate: string; daysUntil: number; isToday: boolean } | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // 用本地时区格式化日期字符串，避免 UTC 偏移导致日期错一天
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  for (const h of STATUTORY_HOLIDAYS_2026) {
    const startDate = h.range[0];
    // 如果节假日已经开始，看今天是否在假期范围内
    if (todayStr <= h.range[1]) {
      // 今天或未来开始的假期
      const effectiveStart = todayStr >= startDate ? todayStr : startDate;
      const [y, m, d] = effectiveStart.split('-').map(Number);
      const start = new Date(y, m - 1, d); // 本地时区午夜
      const diffMs = start.getTime() - today.getTime();
      const daysUntil = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      const isToday = todayStr >= startDate;
      return { name: h.name, startDate, daysUntil, isToday };
    }
  }

  return null;
}
