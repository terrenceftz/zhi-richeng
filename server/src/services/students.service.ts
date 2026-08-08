import prisma from '../db';
import * as audit from './audit.service';

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

export async function getStudents(userId: string, filters: { q?: string; className?: string; grade?: string; studentType?: string; mentalTarget?: string; page?: number; pageSize?: number }) {
  const where: any = { userId };
  if (filters.className) where.className = filters.className;
  if (filters.grade) where.grade = filters.grade;
  if (filters.studentType) where.studentType = filters.studentType;
  if (filters.mentalTarget === 'true') where.isMentalTarget = true;
  if (filters.q) {
    where.OR = [
      { name: { contains: filters.q } },
      { studentNo: { contains: filters.q } },
      { phone: { contains: filters.q } },
      { idNumber: { contains: filters.q } },
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

export async function getStudentById(userId: string, id: string) {
  const student = await prisma.student.findFirst({
    where: { id, userId },
    include: {
      counselings: { orderBy: { date: 'desc' } },
      mentalRecords: { orderBy: { date: 'desc' } },
    },
  });
  if (!student) throw Object.assign(new Error('学生不存在'), { statusCode: 404 });
  return parseTags(student);
}

function buildCreateData(userId: string, input: StudentInput) {
  return {
    userId,
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
  };
}

export async function createStudent(userId: string, input: StudentInput) {
  const s = await prisma.student.create({ data: buildCreateData(userId, input) });
  await audit.log(userId, 'student_create', {
    entityType: 'student',
    entityId: s.id,
    detail: `新增学生 ${s.name}`,
  });
  return parseTags(s);
}

export async function createStudentsBatch(userId: string, inputs: StudentInput[]) {
  const created = [];
  for (const input of inputs) {
    const s = await prisma.student.create({ data: buildCreateData(userId, input) });
    created.push(parseTags(s));
  }
  await audit.log(userId, 'student_import', {
    entityType: 'student',
    detail: `导入学生 ${created.length} 人`,
  });
  return created;
}

export async function updateStudent(userId: string, id: string, input: Partial<StudentInput>) {
  await getStudentById(userId, id);
  const data: any = { ...input };
  if (input.tags !== undefined) data.tags = JSON.stringify(input.tags);
  if (input.birthDate !== undefined) data.birthDate = input.birthDate ? new Date(input.birthDate) : null;
  delete data.id;
  const s = await prisma.student.update({ where: { id }, data });
  await audit.log(userId, 'student_update', {
    entityType: 'student',
    entityId: id,
    detail: `修改学生 ${s.name}`,
  });
  return parseTags(s);
}

export async function deleteStudent(userId: string, id: string) {
  await getStudentById(userId, id);
  const s = await prisma.student.findUnique({ where: { id }, select: { name: true } });
  await audit.log(userId, 'student_delete', {
    entityType: 'student',
    entityId: id,
    detail: `删除学生 ${s?.name || ''}`,
  });
  return prisma.student.delete({ where: { id } });
}

export async function getClasses(userId: string): Promise<string[]> {
  const rows = await prisma.student.findMany({
    where: { userId, className: { not: null } },
    distinct: ['className'],
    select: { className: true },
  });
  return rows.map((r) => r.className!).filter(Boolean);
}

export async function getGrades(userId: string): Promise<string[]> {
  const rows = await prisma.student.findMany({
    where: { userId, grade: { not: null } },
    distinct: ['grade'],
    select: { grade: true },
  });
  return rows.map((r) => r.grade!).filter(Boolean);
}
