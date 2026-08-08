import prisma from '../db';
import * as audit from './audit.service';
import { visibleStudentWhere, canManageStudent, type UserCtx } from '../utils/scope';

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
}

function parseTags(s: any) {
  if (typeof s.tags === 'string') {
    try { s.tags = JSON.parse(s.tags); } catch { s.tags = []; }
  }
  if (typeof s.birthDate === 'string') {
    // 保留 YYYY-MM-DD 形式给前端
    s.birthDate = s.birthDate ? new Date(s.birthDate).toISOString() : null;
  }
  return s;
}

function forbidden(): never {
  throw Object.assign(new Error('无权限操作该学生'), { statusCode: 403 });
}

export async function getStudents(ctx: UserCtx, filters: { q?: string; className?: string; grade?: string; studentType?: string; mentalTarget?: string; page?: number; pageSize?: number }) {
  // 可见范围 OR 与搜索条件是 AND 关系：搜索词绝不能绕过学院可见性
  const where: any = visibleStudentWhere(ctx);
  if (filters.className) where.className = filters.className;
  if (filters.grade) where.grade = filters.grade;
  if (filters.studentType) where.studentType = filters.studentType;
  if (filters.mentalTarget === 'true') where.isMentalTarget = true;
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
    // 学生归属学院：默认当前用户学院；管理员/院系管理员可显式指定
    college: input.college || ctx.college || '',
  };
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

  // 白名单过滤：仅允许更新可维护字段，禁止改写 userId / createdAt / isMentalTarget（后者的入口是台账 toggle）
  const allowed: (keyof StudentInput)[] = [
    'name', 'studentNo', 'className', 'gender', 'birthDate', 'studentType',
    'idNumber', 'grade', 'hometown', 'phone', 'dormitory', 'address', 'tags', 'remark',
  ];
  const data: any = {};
  for (const k of allowed) {
    if (input[k] !== undefined) data[k] = input[k];
  }
  if (data.tags !== undefined) data.tags = JSON.stringify(data.tags);
  if (data.birthDate !== undefined) data.birthDate = data.birthDate ? new Date(data.birthDate) : null;
  const s = await prisma.student.update({ where: { id }, data });
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

