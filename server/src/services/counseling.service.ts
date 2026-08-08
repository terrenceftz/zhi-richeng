import prisma from '../db';
import * as audit from './audit.service';

export interface CounselingInput {
  studentId: string;
  date: string;
  type?: string;
  content: string;
  followUp?: string;
}

export async function getCounselings(userId: string, filters: { studentId?: string; from?: string; to?: string }) {
  const where: any = { userId };
  if (filters.studentId) where.studentId = filters.studentId;
  if (filters.from || filters.to) {
    where.date = {};
    if (filters.from) where.date.gte = new Date(filters.from);
    if (filters.to) where.date.lte = new Date(filters.to);
  }
  return prisma.counseling.findMany({
    where,
    orderBy: { date: 'desc' },
    include: { student: { select: { id: true, name: true, className: true } } },
    take: 200,
  });
}

export async function createCounseling(userId: string, input: CounselingInput) {
  // 校验学生属于该用户
  const student = await prisma.student.findFirst({ where: { id: input.studentId, userId } });
  if (!student) throw Object.assign(new Error('学生不存在'), { statusCode: 404 });
  const record = await prisma.counseling.create({
    data: {
      userId,
      studentId: input.studentId,
      date: new Date(input.date),
      type: input.type || '日常',
      content: input.content,
      followUp: input.followUp || null,
    },
    include: { student: { select: { id: true, name: true, className: true } } },
  });
  await audit.log(userId, 'counseling_create', {
    entityType: 'counseling',
    entityId: record.id,
    detail: `${student.name} 新增谈心（${record.type}）`,
  });
  return record;
}

export async function updateCounseling(userId: string, id: string, input: Partial<CounselingInput>) {
  const existing = await prisma.counseling.findFirst({ where: { id, userId } });
  if (!existing) throw Object.assign(new Error('记录不存在'), { statusCode: 404 });
  const data: any = { ...input };
  if (input.date) data.date = new Date(input.date);
  delete data.id;
  delete data.studentId; // 不允许改归属
  const record = await prisma.counseling.update({
    where: { id },
    data,
    include: { student: { select: { id: true, name: true, className: true } } },
  });
  await audit.log(userId, 'counseling_update', {
    entityType: 'counseling',
    entityId: id,
    detail: `${record.student?.name || ''} 谈心记录修改`,
  });
  return record;
}

export async function deleteCounseling(userId: string, id: string) {
  const existing = await prisma.counseling.findFirst({ where: { id, userId } });
  if (!existing) throw Object.assign(new Error('记录不存在'), { statusCode: 404 });
  const student = await prisma.student.findUnique({ where: { id: existing.studentId }, select: { name: true } });
  await audit.log(userId, 'counseling_delete', {
    entityType: 'counseling',
    entityId: id,
    detail: `${student?.name || ''} 谈心记录删除`,
  });
  return prisma.counseling.delete({ where: { id } });
}

export interface CounselingStats {
  total: number;             // 学生总数
  counseledCount: number;    // 学期内已谈心学生数
  coverage: number;          // 覆盖率 0-100
  notCounseledCount: number;
  notCounseled: { id: string; name: string; className: string | null; grade: string | null; isMentalTarget: boolean }[];
  byType: { label: string; count: number }[];
  recent: any[];
}

/** 学期谈心统计：覆盖率、未谈心名单、类型分布、最近记录 */
export async function getSemesterStats(userId: string, range: { start?: string; end?: string }) {
  const students = await prisma.student.findMany({
    where: { userId },
    select: { id: true, name: true, className: true, grade: true, isMentalTarget: true },
  });

  const dateFilter: any = {};
  if (range.start) dateFilter.gte = new Date(range.start);
  if (range.end) dateFilter.lte = new Date(`${range.end}T23:59:59.999`);

  const counselings = await prisma.counseling.findMany({
    where: { userId, date: dateFilter },
    select: { studentId: true, type: true },
  });

  const counseledSet = new Set(counselings.map((c) => c.studentId));
  const typeCount: Record<string, number> = {};
  counselings.forEach((c) => {
    typeCount[c.type] = (typeCount[c.type] || 0) + 1;
  });
  const byType = Object.entries(typeCount)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);

  const notCounseled = students
    .filter((s) => !counseledSet.has(s.id))
    .map((s) => ({ id: s.id, name: s.name, className: s.className, grade: s.grade, isMentalTarget: s.isMentalTarget }))
    .sort((a, b) => (a.isMentalTarget === b.isMentalTarget ? 0 : a.isMentalTarget ? -1 : 1));

  const recent = await prisma.counseling.findMany({
    where: { userId },
    orderBy: { date: 'desc' },
    take: 10,
    include: { student: { select: { id: true, name: true, className: true, isMentalTarget: true } } },
  });

  return {
    total: students.length,
    counseledCount: counseledSet.size,
    coverage: students.length ? Math.round((counseledSet.size / students.length) * 100) : 0,
    notCounseledCount: notCounseled.length,
    notCounseled,
    byType,
    recent,
  } satisfies CounselingStats;
}
