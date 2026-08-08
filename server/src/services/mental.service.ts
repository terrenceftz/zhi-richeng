import prisma from '../db';
import * as audit from './audit.service';

export interface MentalRecordInput {
  studentId: string;
  date: string;
  level?: string;
  status?: string;
  situation: string;
  action?: string;
  followUp?: string;
  followUpDate?: string;
}

export interface MentalProfileInput {
  isPoverty?: boolean;
  concernLevel?: number;
  categories?: string[];
  includedAt?: string;
  includeReason?: string;
  followUpPerson?: string;
  parentInformed?: boolean;
  parentPhone?: string;
  remark?: string;
}

const CATEGORY_KEYS = ['心理健康', '学业预警', '延期毕业', '重大疾病', '政治安全', '其他关注'];

function parseCategories(s: string): string[] {
  try {
    const arr = JSON.parse(s);
    return Array.isArray(arr) ? arr.filter((c) => CATEGORY_KEYS.includes(c)) : [];
  } catch {
    return [];
  }
}

function parseProfile(p: any) {
  if (p && typeof p.categories === 'string') {
    p.categories = parseCategories(p.categories);
  }
  return p;
}

/** 安全解析日期：兼容 YYYY-MM-DD、YYYY/M/D、中文日期、数字序列号；解析失败返回 null 而非抛错 */
export function parseDateSafe(raw: unknown): Date | null {
  if (raw == null || raw === '') return null;
  if (raw instanceof Date) {
    return isNaN(raw.getTime()) ? null : raw;
  }
  let s = String(raw).trim();
  if (!s) return null;
  // 兼容中文日期：2026年6月1日 / 2026年6月
  let m = s.match(/(\d{4})\s*年\s*(\d{1,2})\s*月(?:\s*(\d{1,2})\s*日?)?/);
  if (m) {
    s = `${m[1]}-${m[2].padStart(2, '0')}-${(m[3] || '1').padStart(2, '0')}`;
  }
  // Excel 数字序列号（自 1899-12-30 起的天数）
  if (/^\d+(\.\d+)?$/.test(s)) {
    const n = Number(s);
    if (n > 1000 && n < 100000) {
      const d = new Date(Math.round((n - 25569) * 86400 * 1000));
      return isNaN(d.getTime()) ? null : d;
    }
    return null;
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

// ================= 台账档案 =================

/** 创建/更新台账档案（按 studentId upsert） */
export async function upsertProfile(userId: string, studentId: string, input: MentalProfileInput) {
  const student = await prisma.student.findFirst({ where: { id: studentId, userId } });
  if (!student) throw Object.assign(new Error('学生不存在'), { statusCode: 404 });

  const data: any = {
    userId,
    studentId,
    isPoverty: input.isPoverty ?? false,
    concernLevel: Math.min(3, Math.max(1, input.concernLevel || 1)),
    categories: JSON.stringify(input.categories || []),
    includedAt: parseDateSafe(input.includedAt),
    includeReason: input.includeReason || null,
    followUpPerson: input.followUpPerson || null,
    parentInformed: input.parentInformed ?? false,
    parentPhone: input.parentPhone || null,
    remark: input.remark || null,
  };

  const profile = await prisma.mentalProfile.upsert({
    where: { studentId },
    update: {
      isPoverty: data.isPoverty,
      concernLevel: data.concernLevel,
      categories: data.categories,
      includedAt: data.includedAt,
      includeReason: data.includeReason,
      followUpPerson: data.followUpPerson,
      parentInformed: data.parentInformed,
      parentPhone: data.parentPhone,
      remark: data.remark,
    },
    create: data,
  });

  // 建档同时确保标记为台账学生
  if (!student.isMentalTarget) {
    await prisma.student.update({ where: { id: studentId }, data: { isMentalTarget: true } });
  }

  await audit.log(userId, 'profile_update', {
    entityType: 'mentalProfile',
    entityId: studentId,
    detail: `${student.name} 档案更新（${data.concernLevel}级 / ${(input.categories || []).join('、')}）`,
  });

  return parseProfile(profile);
}

/** 台账学生列表（带档案 + 记录数） */
export async function getMentalStudents(userId: string) {
  const students = await prisma.student.findMany({
    where: { userId, isMentalTarget: true },
    orderBy: [{ mentalProfile: { concernLevel: 'desc' } }, { name: 'asc' }],
    include: {
      mentalProfile: true,
      _count: { select: { mentalRecords: true } },
    },
  });
  return students.map((s: any) => {
    if (s.mentalProfile) s.mentalProfile = parseProfile(s.mentalProfile);
    return s;
  });
}

/** 切换学生台账标记；标记时自动建档 */
export async function toggleMentalTarget(userId: string, studentId: string, value: boolean) {
  const student = await prisma.student.findFirst({ where: { id: studentId, userId } });
  if (!student) throw Object.assign(new Error('学生不存在'), { statusCode: 404 });

  await prisma.student.update({ where: { id: studentId }, data: { isMentalTarget: value } });
  if (value) {
    // 已有档案则保留，没有则创建默认档案
    const exists = await prisma.mentalProfile.findUnique({ where: { studentId } });
    if (!exists) {
      await prisma.mentalProfile.create({
        data: { userId, studentId, isPoverty: false, concernLevel: 1, categories: '["心理健康"]' },
      });
    }
  }
  await audit.log(userId, 'mental_toggle', {
    entityType: 'student',
    entityId: studentId,
    detail: `${student.name} ${value ? '标记为' : '移出'}心理台账`,
  });
  return prisma.student.findUnique({ where: { id: studentId }, include: { mentalProfile: true } });
}

// ================= 跟进记录 =================

export async function getRecords(userId: string, filters: { studentId?: string; status?: string; level?: string }) {
  const where: any = { userId };
  if (filters.studentId) where.studentId = filters.studentId;
  if (filters.status) where.status = filters.status;
  if (filters.level) where.level = filters.level;
  return prisma.mentalRecord.findMany({
    where,
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    include: { student: { select: { id: true, name: true, className: true, grade: true } } },
    take: 200,
  });
}

export async function createRecord(userId: string, input: MentalRecordInput) {
  const student = await prisma.student.findFirst({ where: { id: input.studentId, userId } });
  if (!student) throw Object.assign(new Error('学生不存在'), { statusCode: 404 });

  const record = await prisma.mentalRecord.create({
    data: {
      userId,
      studentId: input.studentId,
      date: parseDateSafe(input.date) || new Date(),
      level: input.level || 'normal',
      status: input.status || 'active',
      situation: input.situation,
      action: input.action || null,
      followUp: input.followUp || null,
      followUpDate: parseDateSafe(input.followUpDate),
    },
    include: { student: { select: { id: true, name: true, className: true, grade: true } } },
  });

  // 创建跟进记录时自动建档并标记
  const profile = await prisma.mentalProfile.findUnique({ where: { studentId: input.studentId } });
  if (!profile) {
    await prisma.mentalProfile.create({
      data: { userId, studentId: input.studentId, isPoverty: false, concernLevel: 1, categories: '["心理健康"]' },
    });
  }
  if (!student.isMentalTarget) {
    await prisma.student.update({ where: { id: input.studentId }, data: { isMentalTarget: true } });
  }

  await audit.log(userId, 'record_create', {
    entityType: 'mentalRecord',
    entityId: record.id,
    detail: `${student.name} 新增跟进`,
  });

  return record;
}

export async function updateRecord(userId: string, id: string, input: Partial<MentalRecordInput>) {
  const existing = await prisma.mentalRecord.findFirst({ where: { id, userId } });
  if (!existing) throw Object.assign(new Error('记录不存在'), { statusCode: 404 });
  // 白名单过滤，防止越权改写 userId/createdAt 等字段
  const allowed: (keyof MentalRecordInput)[] = ['date', 'level', 'status', 'situation', 'action', 'followUp', 'followUpDate'];
  const data: any = {};
  for (const k of allowed) {
    if (input[k] !== undefined) data[k] = input[k];
  }
  if (data.date) data.date = parseDateSafe(data.date) || new Date();
  if (data.followUpDate !== undefined) data.followUpDate = parseDateSafe(data.followUpDate);
  const record = await prisma.mentalRecord.update({
    where: { id },
    data,
    include: { student: { select: { id: true, name: true, className: true, grade: true } } },
  });
  await audit.log(userId, 'record_update', {
    entityType: 'mentalRecord',
    entityId: id,
    detail: `${record.student?.name || ''} 跟进记录修改`,
  });
  return record;
}

export async function deleteRecord(userId: string, id: string) {
  const existing = await prisma.mentalRecord.findFirst({ where: { id, userId } });
  if (!existing) throw Object.assign(new Error('记录不存在'), { statusCode: 404 });
  const student = await prisma.student.findUnique({ where: { id: existing.studentId }, select: { name: true } });
  await audit.log(userId, 'record_delete', {
    entityType: 'mentalRecord',
    entityId: id,
    detail: `${student?.name || ''} 跟进记录删除`,
  });
  return prisma.mentalRecord.delete({ where: { id } });
}

/** 报送表学院名称（设置项 mental_report_college，管理员可配置） */
export async function getCollegeName(): Promise<string> {
  const setting = await prisma.setting.findUnique({ where: { key: 'mental_report_college' } });
  return setting?.value || '';
}
