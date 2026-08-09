import prisma from '../db';
import { visibleStudentWhere, type UserCtx } from '../utils/scope';
import { getStudentFields } from './students.service';

/**
 * 数据看板统计
 * 一次请求返回全部看板数据：汇总指标、分布、趋势。
 * 学生/台账/谈心按学院可见范围统计；任务/通知仍为个人数据。
 *
 * 统计口径：澳门班（扩展字段「是否澳门班」= 是）不计入总人数/境外生/分布与台账统计，
 * 单独展示其人数；境外生分生源地按「港澳台侨」扩展字段分组。
 * 字段 key 由前端自动生成（f_xxx），这里按 label 识别，字段删除/重建后仍可解析。
 */

function parseCategories(raw: string | null): string[] {
  try {
    const arr = JSON.parse(raw || '[]');
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

async function resolveMarkerFields(): Promise<{ aomenKey?: string; shengyuanKey?: string; xueliKey?: string }> {
  const fields = await getStudentFields();
  const aomen = fields.find((f) => f.label.includes('澳门班'));
  const shengyuan = fields.find((f) => f.label.includes('港澳台侨') || f.label.includes('生源地'));
  const xueli = fields.find((f) => f.label.includes('学历类别') || f.label.includes('学历'));
  return { aomenKey: aomen?.key, shengyuanKey: shengyuan?.key, xueliKey: xueli?.key };
}

/** 在 where 上追加「排除澳门班」条件（extras JSON 字符串匹配 "key":"是"；{} 不受影响） */
function excludeAomen(where: any, aomenKey?: string): any {
  if (!aomenKey) return where;
  return { ...where, extras: { not: { contains: `"${aomenKey}":"是"` } } };
}

export async function getOverview(ctx: UserCtx) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // 逾期任务：截止已过且未完成（含当天 dueTime；无 dueTime 次日 0 点起算）——任务为个人数据
  const overdueCandidates = await prisma.task.findMany({
    where: { userId: ctx.userId, status: { not: 'done' }, dueDate: { not: null, lte: todayStart } },
    select: { dueDate: true, dueTime: true },
  });
  const overdueTaskCount = overdueCandidates.filter((t) => {
    const due = new Date(t.dueDate!);
    if (t.dueTime) {
      const [h, m] = t.dueTime.split(':').map(Number);
      due.setHours(h || 0, m || 0, 0, 0);
      return now > due;
    }
    // 无 dueTime：次日本地 0 点起逾期
    const nextLocalMidnight = new Date(due.getFullYear(), due.getMonth(), due.getDate() + 1);
    return now > nextLocalMidnight;
  }).length;

  const { aomenKey } = await resolveMarkerFields();
  const studentWhere = visibleStudentWhere(ctx);
  // 在籍口径：仅统计「在学」学生及其记录
  const activeWhere = { ...studentWhere, studentStatus: 'active' };
  // 主口径：排除澳门班（澳门班单列）
  const mainWhere = excludeAomen(activeWhere, aomenKey);
  const aomenWhere = aomenKey
    ? { ...activeWhere, extras: { contains: `"${aomenKey}":"是"` } }
    : { id: '__none__' };
  const [
    studentCount,
    mentalTargetCount,
    counselingCount,
    mentalRecordCount,
    noticeCount,
    taskCount,
    pendingNoticeCount,
    aomenClassCount,
    overseasCount,
    domesticCount,
    suspendedCount,
  ] = await Promise.all([
    prisma.student.count({ where: mainWhere }),
    prisma.student.count({ where: { ...mainWhere, isMentalTarget: true } }),
    prisma.counseling.count({ where: { student: mainWhere } }),
    prisma.mentalRecord.count({ where: { student: mainWhere } }),
    prisma.notice.count({ where: { userId: ctx.userId } }),
    prisma.task.count({ where: { userId: ctx.userId } }),
    prisma.notice.count({ where: { userId: ctx.userId, status: { not: 'done' } } }),
    prisma.student.count({ where: aomenWhere }),
    prisma.student.count({ where: { ...mainWhere, studentType: 'overseas' } }),
    prisma.student.count({ where: { ...mainWhere, studentType: 'domestic' } }),
    // 休学人数：状态维度（不排除澳门班，供表格下方单独展示）
    prisma.student.count({ where: { ...studentWhere, studentStatus: 'suspended' } }),
  ]);

  // 今日待办任务数（个人）
  const todayTasks = await prisma.task.count({
    where: { userId: ctx.userId, status: { not: 'done' }, dueDate: { gte: todayStart, lt: new Date(todayStart.getTime() + 86400000) } },
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
    aomenClassCount,
    overseasCount,
    domesticCount,
    suspendedCount,
  };
}

export async function getStudentDist(ctx: UserCtx) {
  const { aomenKey, shengyuanKey, xueliKey } = await resolveMarkerFields();
  const activeWhere = { ...visibleStudentWhere(ctx), studentStatus: 'active' };
  const mainWhere = excludeAomen(activeWhere, aomenKey);
  const [byGrade, byType, byGender] = await Promise.all([
    prisma.student.groupBy({
      by: ['grade'], where: { ...mainWhere, grade: { not: null } }, _count: { _all: true },
      orderBy: [{ grade: 'asc' }],
    }),
    prisma.student.groupBy({
      by: ['studentType'], where: { ...mainWhere, studentType: { not: null } }, _count: { _all: true },
    }),
    prisma.student.groupBy({
      by: ['gender'], where: { ...mainWhere, gender: { not: null } }, _count: { _all: true },
    }),
  ]);

  // 一次拉取全部（非澳门班）学生的扩展字段，JS 聚合「境外生分生源地」与「学历类别」分布
  const students = await prisma.student.findMany({
    where: mainWhere,
    select: { studentType: true, extras: true },
  });
  const hometownCount: Record<string, number> = {};
  const xueliCount: Record<string, number> = {};
  for (const s of students) {
    let extras: any = {};
    try { extras = JSON.parse(s.extras || '{}'); } catch { /* ignore */ }
    // 境外生分生源地：按「港澳台侨」字段分组（无值归入「未填写」）
    if (s.studentType === 'overseas') {
      const v = shengyuanKey ? extras[shengyuanKey] : undefined;
      const label = v != null && String(v).trim() !== '' ? String(v).trim() : '未填写';
      hometownCount[label] = (hometownCount[label] || 0) + 1;
    }
    // 学历类别：按「学历类别」字段分组（本科生/研究生）
    const xv = xueliKey ? extras[xueliKey] : undefined;
    const xlabel = xv != null && String(xv).trim() !== '' ? String(xv).trim() : '未填写';
    xueliCount[xlabel] = (xueliCount[xlabel] || 0) + 1;
  }
  const byOverseasHometown = Object.entries(hometownCount)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
  const byXueli = Object.entries(xueliCount)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);

  return {
    byGrade: byGrade.map((g) => ({ label: g.grade, count: g._count._all })),
    byType: byType.map((t) => ({ label: t.studentType === 'domestic' ? '境内生' : t.studentType === 'overseas' ? '境外生' : t.studentType, count: t._count._all })),
    byGender: byGender.map((g) => ({ label: g.gender, count: g._count._all })),
    byOverseasHometown,
    byXueli,
  };
}

/** 人数统计表行：与「法学院在读人数统计」报送表同结构（澳门班不计入，单列口径） */
export interface HeadcountRow {
  type: string;      // 本科 / 研究生 / 未填学历
  label: string;     // 如 24级本科 / 24级学硕 / 24级法律法学
  total: number;
  domestic: number;
  overseas: number;
  hk: number;        // 中国香港
  macau: number;     // 中国澳门
  taiwan: number;    // 中国台湾
  huaqiao: number;   // 华侨
  liuxue: number;    // 留学生（其他国家/未填写）
  rate: number;      // 境外生占比（0-1）
  countries: string[]; // 备注：留学生国家（去重）
}

const REGION_RULES: Record<'hk' | 'macau' | 'taiwan' | 'huaqiao', string[]> = {
  hk: ['中国香港', '香港'],
  macau: ['中国澳门', '澳门'],
  taiwan: ['中国台湾', '台湾'],
  huaqiao: ['华侨', '华人'],
};

/**
 * 港澳台侨值 → 模板列桶（留学生前缀式约定）：
 * - 值含「留学生/留学」→ 留学生列（个别，如「留学生-印度尼西亚」）
 * - 中国香港/澳门/台湾 → 对应列
 * - 其余国家名默认 → 华侨列（大部分境外生为华侨生）
 * - 空值 → 留学生兜底，保证各列合计 = 境外生数
 */
function regionBucket(value: string): 'hk' | 'macau' | 'taiwan' | 'huaqiao' | 'liuxue' {
  const v = value.trim();
  if (v.includes('留学生') || v.includes('留学')) return 'liuxue';
  for (const [k, keys] of Object.entries(REGION_RULES) as any) {
    if (keys.some((x: string) => v.includes(x))) return k as any;
  }
  return v ? 'huaqiao' : 'liuxue';
}

/** 取留学生前缀后的国家（「留学生-印度尼西亚」→「印度尼西亚」），用于备注列 */
function liuxueCountry(value: string): string {
  const v = value.trim();
  const m = v.match(/^留学生[·\-:：]?\s*(.*)$/);
  return m ? (m[1] || '未标注') : v;
}

/** 研究生班级 → 模板细分类（学硕 / 法律法学 / 法律非法学） */
function gradSubtype(className: string): string {
  if (className.includes('学硕')) return '学硕';
  if (className.includes('法律（非法学）') || className.includes('法律非法学')) return '法律非法学';
  if (className.includes('法律（法学）') || className.includes('法律法学')) return '法律法学';
  return '其他';
}

const SUBTYPE_ORDER = ['学硕', '法律法学', '法律非法学', '其他'];

export async function getHeadcountTable(ctx: UserCtx): Promise<HeadcountRow[]> {
  const { aomenKey, shengyuanKey, xueliKey } = await resolveMarkerFields();
  const mainWhere = excludeAomen({ ...visibleStudentWhere(ctx), studentStatus: 'active' }, aomenKey);
  const students = await prisma.student.findMany({
    where: mainWhere,
    select: { grade: true, className: true, studentType: true, extras: true },
  });

  type GroupKey = `${string}|${string}|${string}`;
  type GroupRow = HeadcountRow & { sortKey: [string, string, number] };
  const groups = new Map<GroupKey, GroupRow>();
  const makeRow = (type: string, grade: string, sub: string, label: string): GroupRow => ({
    type, label, total: 0, domestic: 0, overseas: 0, hk: 0, macau: 0, taiwan: 0, huaqiao: 0, liuxue: 0, rate: 0, countries: [],
    sortKey: [type, grade, SUBTYPE_ORDER.indexOf(sub) === -1 ? 99 : SUBTYPE_ORDER.indexOf(sub)],
  });

  for (const s of students) {
    let extras: any = {};
    try { extras = JSON.parse(s.extras || '{}'); } catch { /* ignore */ }
    const xueli = xueliKey ? String(extras[xueliKey] ?? '').trim() : '';
    const grade = s.grade ? s.grade.trim() : '';
    const gLabel = grade.slice(-2) || '未填';

    let type: string; let sub: string; let label: string;
    if (xueli === '本科生') {
      type = '本科'; sub = ''; label = `${gLabel}级本科`;
    } else if (xueli === '研究生') {
      type = '研究生'; sub = gradSubtype(s.className || ''); label = `${gLabel}级${sub}`;
    } else {
      type = '未填学历'; sub = ''; label = '未填学历';
    }
    const key: GroupKey = `${type}|${grade}|${sub}`;
    let row = groups.get(key);
    if (!row) { row = makeRow(type, grade, sub, label); groups.set(key, row); }

    row.total++;
    if (s.studentType === 'domestic') row.domestic++;
    else if (s.studentType === 'overseas') {
      row.overseas++;
      const region = shengyuanKey ? regionBucket(String(extras[shengyuanKey] ?? '')) : 'liuxue';
      if (region === 'hk') row.hk++;
      else if (region === 'macau') row.macau++;
      else if (region === 'taiwan') row.taiwan++;
      else if (region === 'huaqiao') row.huaqiao++;
      else {
        row.liuxue++;
        const c = shengyuanKey ? liuxueCountry(String(extras[shengyuanKey] ?? '')) : '';
        if (c && !row.countries.includes(c)) row.countries.push(c);
      }
    }
  }

  // 排序：本科（年级升序）→ 研究生（年级升序 + 细分类）→ 未填学历
  const order: Record<string, number> = { 本科: 0, 研究生: 1, 未填学历: 2 };
  const sorted = [...groups.values()].sort((a, b) => {
    const ta = order[a.type] ?? 9, tb = order[b.type] ?? 9;
    if (ta !== tb) return ta - tb;
    if (a.sortKey[0] !== b.sortKey[0]) return order[a.sortKey[0]] - order[b.sortKey[0]];
    const g1 = a.sortKey[1] || '', g2 = b.sortKey[1] || '';
    if (g1 !== g2) return g1 < g2 ? -1 : 1;
    return (a.sortKey[2] as number) - (b.sortKey[2] as number);
  }).map(({ sortKey, ...r }) => r);

  // 汇总行：本科总计 / 研究生总计 / 学院总计
  type RowAgg = Omit<HeadcountRow, 'rate' | 'type' | 'label'>;
  const sum = (rows: HeadcountRow[]): RowAgg => rows.reduce((acc, r) => {
    acc.total += r.total; acc.domestic += r.domestic; acc.overseas += r.overseas;
    acc.hk += r.hk; acc.macau += r.macau; acc.taiwan += r.taiwan; acc.huaqiao += r.huaqiao; acc.liuxue += r.liuxue;
    acc.countries.push(...r.countries);
    return acc;
  }, { total: 0, domestic: 0, overseas: 0, hk: 0, macau: 0, taiwan: 0, huaqiao: 0, liuxue: 0, countries: [] as string[] });

  const withRate = (r: RowAgg & { type: string; label: string }): HeadcountRow => ({ ...r, rate: r.total > 0 ? r.overseas / r.total : 0, countries: [...new Set(r.countries)] });

  const benke = sorted.filter((r) => r.type === '本科');
  const yanjiusheng = sorted.filter((r) => r.type === '研究生');
  const benkeSum = sum(benke);
  const yjsSum = sum(yanjiusheng);
  const result: HeadcountRow[] = [
    ...benke.map(withRate),
    withRate({ ...benkeSum, type: '本科', label: '本科总计' }),
    ...yanjiusheng.map(withRate),
    withRate({ ...yjsSum, type: '研究生', label: '研究生总计' }),
    withRate({ ...sum(sorted), type: '学院', label: '学院总计' }),
  ];

  return result;
}

export async function getMentalDist(ctx: UserCtx) {
  const { aomenKey } = await resolveMarkerFields();
  const activeWhere = { ...visibleStudentWhere(ctx), studentStatus: 'active' };
  const mainWhere = excludeAomen(activeWhere, aomenKey);
  const targets = await prisma.student.findMany({
    where: { ...mainWhere, isMentalTarget: true },
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
    where: { student: mainWhere, date: { gte: monthStart } },
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
