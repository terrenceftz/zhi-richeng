import prisma from '../db';

/**
 * 数据看板统计
 * 一次请求返回全部看板数据：汇总指标、分布、趋势。
 */

function parseCategories(raw: string | null): string[] {
  try {
    const arr = JSON.parse(raw || '[]');
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export async function getOverview(userId: string) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [
    studentCount,
    mentalTargetCount,
    counselingCount,
    mentalRecordCount,
    noticeCount,
    taskCount,
    overdueTaskCount,
    pendingNoticeCount,
  ] = await Promise.all([
    prisma.student.count({ where: { userId } }),
    prisma.student.count({ where: { userId, isMentalTarget: true } }),
    prisma.counseling.count({ where: { userId } }),
    prisma.mentalRecord.count({ where: { userId } }),
    prisma.notice.count({ where: { userId } }),
    prisma.task.count({ where: { userId } }),
    prisma.task.count({ where: { userId, status: { not: 'done' }, dueDate: { lt: now } } }),
    prisma.notice.count({ where: { userId, status: { not: 'done' } } }),
  ]);

  // 今日待办任务数
  const todayTasks = await prisma.task.count({
    where: { userId, status: { not: 'done' }, dueDate: { gte: todayStart, lt: new Date(todayStart.getTime() + 86400000) } },
  });

  return {
    studentCount,
    mentalTargetCount,
    counselingCount,
    mentalRecordCount,
    noticeCount,
    taskCount,
    overdueTaskCount,
    todayTasks,
    pendingNoticeCount,
  };
}

export async function getStudentDist(userId: string) {
  const [byGrade, byType, byGender] = await Promise.all([
    prisma.student.groupBy({
      by: ['grade'], where: { userId, grade: { not: null } }, _count: { _all: true },
      orderBy: [{ grade: 'asc' }],
    }),
    prisma.student.groupBy({
      by: ['studentType'], where: { userId, studentType: { not: null } }, _count: { _all: true },
    }),
    prisma.student.groupBy({
      by: ['gender'], where: { userId, gender: { not: null } }, _count: { _all: true },
    }),
  ]);

  return {
    byGrade: byGrade.map((g) => ({ label: g.grade, count: g._count._all })),
    byType: byType.map((t) => ({ label: t.studentType === 'domestic' ? '境内生' : t.studentType === 'overseas' ? '境外生' : t.studentType, count: t._count._all })),
    byGender: byGender.map((g) => ({ label: g.gender, count: g._count._all })),
  };
}

export async function getMentalDist(userId: string) {
  const targets = await prisma.student.findMany({
    where: { userId, isMentalTarget: true },
    select: { id: true, mentalProfile: true },
  });

  // 关注级别分布
  const levelCount: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
  // 类别分布
  const categoryCount: Record<string, number> = {};
  // 经济困难统计
  let povertyCount = 0;

  for (const s of targets) {
    const p = s.mentalProfile;
    if (!p) continue;
    const lv = p.concernLevel || 1;
    levelCount[lv] = (levelCount[lv] || 0) + 1;
    if (p.isPoverty) povertyCount++;
    for (const c of parseCategories(p.categories)) {
      categoryCount[c] = (categoryCount[c] || 0) + 1;
    }
  }

  // 近 6 个月跟进记录趋势
  const months: { key: string; label: string; count: number }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: `${d.getMonth() + 1}月`,
      count: 0,
    });
  }
  const monthStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const records = await prisma.mentalRecord.findMany({
    where: { userId, date: { gte: monthStart } },
    select: { date: true },
  });
  for (const r of records) {
    const key = `${r.date.getFullYear()}-${String(r.date.getMonth() + 1).padStart(2, '0')}`;
    const m = months.find((x) => x.key === key);
    if (m) m.count++;
  }

  // 台账纳入时间趋势（近 6 个月）
  const includeTrend = months.map((m) => ({ ...m, count: 0 }));
  for (const s of targets) {
    const p = s.mentalProfile;
    if (!p?.includedAt) continue;
    const d = new Date(p.includedAt);
    if (d < monthStart) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const m = includeTrend.find((x) => x.key === key);
    if (m) m.count++;
  }

  return {
    byLevel: [
      { label: '一级', count: levelCount[1] },
      { label: '二级', count: levelCount[2] },
      { label: '三级（最高）', count: levelCount[3] },
    ],
    byCategory: Object.entries(categoryCount).map(([label, count]) => ({ label, count })),
    povertyCount,
    followUpTrend: months,
    includeTrend,
  };
}
