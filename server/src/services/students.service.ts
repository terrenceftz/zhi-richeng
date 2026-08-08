import prisma from '../db';
import * as audit from './audit.service';
import { visibleStudentWhere, canManageStudent, isAdmin, type UserCtx } from '../utils/scope';

export interface StudentInput {
  name: string;
  studentNo?: string;
  className?: string;
  gender?: string;
  birthDate?: string;
  studentType?: string;
  idNumber?: string;
  grade?: string;
  hometown?: string;
  phone?: string;
  dormitory?: string;
  address?: string;
  tags?: string[];
  remark?: string;
  college?: string;
  extras?: Record<string, any>;
}

function parseTags(s: any) {
  if (typeof s.tags === 'string') {
    try { s.tags = JSON.parse(s.tags); } catch { s.tags = []; }
  }
  if (typeof s.birthDate === 'string') {
    // 保留 YYYY-MM-DD 形式给前端
    s.birthDate = s.birthDate ? new Date(s.birthDate).toISOString() : null;
  }
  if (typeof s.extras === 'string') {
    try { s.extras = JSON.parse(s.extras); } catch { s.extras = {}; }
  }
  return s;
}

function forbidden(): never {
  throw Object.assign(new Error('无权限操作该学生'), { statusCode: 403 });
}

export async function getStudents(ctx: UserCtx, filters: { q?: string; className?: string; grade?: string; studentType?: string; mentalTarget?: string; studentStatus?: string; page?: number; pageSize?: number }) {
  // 可见范围 OR 与搜索条件是 AND 关系：搜索词绝不能绕过学院可见性
  const where: any = visibleStudentWhere(ctx);
  if (filters.className) where.className = filters.className;
  if (filters.grade) where.grade = filters.grade;
  if (filters.studentType) where.studentType = filters.studentType;
  if (filters.mentalTarget === 'true') where.isMentalTarget = true;
  // 状态筛选：默认隐藏「不在籍」，可选查看
  if (filters.studentStatus === 'all') {
    // 全部状态（含不在籍）
  } else if (filters.studentStatus) {
    where.studentStatus = filters.studentStatus;
  } else {
    where.studentStatus = { not: 'inactive' };
  }
  if (filters.q) {
    where.AND = [
      {
        OR: [
          { name: { contains: filters.q } },
          { studentNo: { contains: filters.q } },
          { phone: { contains: filters.q } },
          { idNumber: { contains: filters.q } },
        ],
      },
    ];
  }

  const page = Math.max(1, filters.page || 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize || 30));

  const [total, students] = await Promise.all([
    prisma.student.count({ where }),
    prisma.student.findMany({
      where,
      orderBy: [{ isMentalTarget: 'desc' }, { grade: 'asc' }, { className: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { counselings: true, mentalRecords: true } } },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    students: students.map(parseTags),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getStudentById(ctx: UserCtx, id: string) {
  const student = await prisma.student.findFirst({
    where: { ...visibleStudentWhere(ctx), id },
    include: {
      counselings: { orderBy: { date: 'desc' } },
      mentalRecords: { orderBy: { date: 'desc' } },
    },
  });
  if (!student) throw Object.assign(new Error('学生不存在'), { statusCode: 404 });
  return parseTags(student);
}

function buildCreateData(ctx: UserCtx, input: StudentInput) {
  return {
    userId: ctx.userId!,
    name: input.name,
    studentNo: input.studentNo || null,
    className: input.className || null,
    gender: input.gender || null,
    birthDate: input.birthDate ? new Date(input.birthDate) : null,
    studentType: input.studentType || null,
    idNumber: input.idNumber || null,
    grade: input.grade || null,
    hometown: input.hometown || null,
    phone: input.phone || null,
    dormitory: input.dormitory || null,
    address: input.address || null,
    tags: JSON.stringify(input.tags || []),
    remark: input.remark || null,
    extras: JSON.stringify(input.extras || {}),
    // 学生归属学院：默认当前用户学院；管理员/院系管理员可显式指定
    college: input.college || ctx.college || '',
  };
}

/** 白名单更新字段映射（禁止改写 userId / createdAt / isMentalTarget / college 归属除外——学院作为基本字段可编辑） */
function buildUpdateData(input: Partial<StudentInput>): any {
  const allowed: (keyof StudentInput)[] = [
    'name', 'studentNo', 'className', 'gender', 'birthDate', 'studentType',
    'idNumber', 'grade', 'hometown', 'phone', 'dormitory', 'address', 'tags', 'remark', 'extras', 'college',
  ];
  const data: any = {};
  for (const k of allowed) {
    if (input[k] !== undefined) data[k] = input[k];
  }
  if (data.tags !== undefined) data.tags = JSON.stringify(data.tags);
  if (data.birthDate !== undefined) data.birthDate = data.birthDate ? new Date(data.birthDate) : null;
  if (data.extras !== undefined) data.extras = JSON.stringify(data.extras);
  return data;
}

export async function createStudent(ctx: UserCtx, input: StudentInput) {
  const s = await prisma.student.create({ data: buildCreateData(ctx, input) });
  await audit.log(ctx.userId!, 'student_create', {
    entityType: 'student',
    entityId: s.id,
    detail: `新增学生 ${s.name}`,
  });
  return parseTags(s);
}

export async function createStudentsBatch(ctx: UserCtx, inputs: StudentInput[]) {
  const created = [];
  for (const input of inputs) {
    const s = await prisma.student.create({ data: buildCreateData(ctx, input) });
    created.push(parseTags(s));
  }
  await audit.log(ctx.userId!, 'student_import', {
    entityType: 'student',
    detail: `导入学生 ${created.length} 人`,
  });
  return created;
}

export async function updateStudent(ctx: UserCtx, id: string, input: Partial<StudentInput>) {
  const existing = await prisma.student.findFirst({ where: { ...visibleStudentWhere(ctx), id } });
  if (!existing) throw Object.assign(new Error('学生不存在'), { statusCode: 404 });
  if (!canManageStudent(ctx, existing)) forbidden();
  if (existing.studentStatus === 'inactive') {
    throw Object.assign(new Error('不在籍学生已封存，仅可查询，不可编辑'), { statusCode: 403 });
  }

  const s = await prisma.student.update({ where: { id }, data: buildUpdateData(input) });
  await audit.log(ctx.userId!, 'student_update', {
    entityType: 'student',
    entityId: id,
    detail: `修改学生 ${s.name}`,
  });
  return parseTags(s);
}

export async function deleteStudent(ctx: UserCtx, id: string) {
  const existing = await prisma.student.findFirst({ where: { ...visibleStudentWhere(ctx), id } });
  if (!existing) throw Object.assign(new Error('学生不存在'), { statusCode: 404 });
  if (!canManageStudent(ctx, existing)) forbidden();
  await audit.log(ctx.userId!, 'student_delete', {
    entityType: 'student',
    entityId: id,
    detail: `删除学生 ${existing.name}`,
  });
  return prisma.student.delete({ where: { id } });
}

/**
 * 变更学生状态（在学/休学/不在籍）。
 * - 所有辅导员可操作本学院可见学生（active↔suspended、→inactive）
 * - 不在籍为终态：改回仅在学/休学仅系统管理员（防误操作）
 */
export async function setStudentStatus(ctx: UserCtx, id: string, status: string): Promise<any> {
  if (!['active', 'suspended', 'inactive'].includes(status)) {
    throw Object.assign(new Error('无效的学生状态'), { statusCode: 400 });
  }
  const existing = await prisma.student.findFirst({ where: { ...visibleStudentWhere(ctx), id } });
  if (!existing) throw Object.assign(new Error('学生不存在'), { statusCode: 404 });
  if (existing.studentStatus === 'inactive' && status !== 'inactive' && !isAdmin(ctx.role)) {
    throw Object.assign(new Error('不在籍学生仅系统管理员可恢复状态'), { statusCode: 403 });
  }
  if (existing.studentStatus === status) return parseTags(existing);

  const updated = await prisma.student.update({ where: { id }, data: { studentStatus: status } });
  await audit.log(ctx.userId!, 'student_update', {
    entityType: 'student',
    entityId: id,
    detail: `学生状态变更：${existing.name} ${existing.studentStatus} → ${status}`,
  });
  return parseTags(updated);
}

export interface UpsertResult {
  created: number;
  updated: number;
}

/**
 * 批量导入（覆盖更新）：按「学号 或 证件号」匹配本学院已有学生，
 * 命中则覆盖更新（保留 userId/isMentalTarget/college），未命中则新建。
 */
export async function upsertStudents(ctx: UserCtx, inputs: StudentInput[]): Promise<UpsertResult> {
  const scope = visibleStudentWhere(ctx);
  const result: UpsertResult = { created: 0, updated: 0 };

  for (const input of inputs) {
    const matchNo = String(input.studentNo || '').trim();
    const matchId = String(input.idNumber || '').trim();

    let existing: { id: string } | null = null;
    if (matchNo || matchId) {
      const where: any = { ...scope };
      if (matchNo && matchId) {
        where.OR = [{ studentNo: matchNo }, { idNumber: matchId }];
      } else if (matchNo) {
        where.studentNo = matchNo;
      } else {
        where.idNumber = matchId;
      }
      existing = await prisma.student.findFirst({ where, select: { id: true } });
    }

    if (existing) {
      await prisma.student.update({ where: { id: existing.id }, data: buildUpdateData(input) });
      result.updated++;
    } else {
      await prisma.student.create({ data: buildCreateData(ctx, input) });
      result.created++;
    }
  }

  if (inputs.length > 0) {
    await audit.log(ctx.userId!, 'student_import', {
      entityType: 'student',
      detail: `导入学生：新建 ${result.created} 人，更新 ${result.updated} 人`,
    });
  }
  return result;
}

export async function getClasses(ctx: UserCtx): Promise<string[]> {
  const rows = await prisma.student.findMany({
    where: { ...visibleStudentWhere(ctx), className: { not: null } },
    distinct: ['className'],
    select: { className: true },
  });
  return rows.map((r) => r.className!).filter(Boolean);
}

export async function getGrades(ctx: UserCtx): Promise<string[]> {
  const rows = await prisma.student.findMany({
    where: { ...visibleStudentWhere(ctx), grade: { not: null } },
    distinct: ['grade'],
    select: { grade: true },
  });
  return rows.map((r) => r.grade!).filter(Boolean);
}

// ================= 学生字段配置（后台可增删扩展字段） =================

export interface StudentField {
  key: string;
  label: string;
  type: 'text' | 'select';
  options?: string[];
}

/** 预置可选字段（一键添加） */
export const PRESET_STUDENT_FIELDS: StudentField[] = [
  { key: 'xueli', label: '学历类别', type: 'text' },
  { key: 'parentName', label: '家长姓名', type: 'text' },
  { key: 'parentPhone', label: '家长联系电话', type: 'text' },
  { key: 'minzu', label: '民族', type: 'text' },
  { key: 'zzmm', label: '政治面貌', type: 'text' },
  { key: 'jinjiContact', label: '紧急联系人', type: 'text' },
];

/** 内置固定字段（不可删除，仅展示） */
export const BUILTIN_STUDENT_FIELDS: StudentField[] = [
  { key: 'name', label: '姓名', type: 'text' },
  { key: 'studentNo', label: '学号', type: 'text' },
  { key: 'college', label: '学院', type: 'text' },
  { key: 'studentStatus', label: '学生状态', type: 'select', options: ['在学', '休学', '不在籍'] },
  { key: 'className', label: '班级', type: 'text' },
  { key: 'gender', label: '性别', type: 'select', options: ['男', '女'] },
  { key: 'birthDate', label: '出生日期', type: 'text' },
  { key: 'studentType', label: '学生类型', type: 'select', options: ['境内生', '境外生'] },
  { key: 'idNumber', label: '证件号码', type: 'text' },
  { key: 'grade', label: '年级', type: 'text' },
  { key: 'hometown', label: '籍贯', type: 'text' },
  { key: 'phone', label: '手机', type: 'text' },
  { key: 'dormitory', label: '宿舍', type: 'text' },
  { key: 'address', label: '家庭住址', type: 'text' },
  { key: 'remark', label: '备注', type: 'text' },
];

/** 读取已启用的扩展字段（Setting: student_fields，JSON 数组） */
export async function getStudentFields(): Promise<StudentField[]> {
  const raw = await prisma.setting.findUnique({ where: { key: 'student_fields' } });
  if (!raw?.value) return [];
  try {
    const arr = JSON.parse(raw.value);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

/** 保存扩展字段（校验 + 规范化） */
export async function saveStudentFields(fields: StudentField[]): Promise<StudentField[]> {
  const keys = new Set<string>();
  const clean: StudentField[] = [];
  for (const f of Array.isArray(fields) ? fields : []) {
    if (!f || typeof f.key !== 'string' || !f.key.trim() || typeof f.label !== 'string' || !f.label.trim()) continue;
    const key = f.key.trim().slice(0, 50);
    if (keys.has(key)) continue; // 去重
    keys.add(key);
    clean.push({
      key,
      label: f.label.trim().slice(0, 30),
      type: f.type === 'select' ? 'select' : 'text',
      options: f.type === 'select'
        ? (Array.isArray(f.options) ? f.options.map((o) => String(o).trim().slice(0, 30)).filter(Boolean).slice(0, 50) : [])
        : undefined,
    });
  }
  await prisma.setting.upsert({
    where: { key: 'student_fields' },
    create: { key: 'student_fields', value: JSON.stringify(clean) },
    update: { value: JSON.stringify(clean) },
  });
  return clean;
}

