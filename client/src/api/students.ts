import client from './client';
import type { Student } from '../types';

export interface StudentsPage {
  students: Student[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function fetchStudents(filters?: { q?: string; className?: string; grade?: string; studentType?: string; mentalTarget?: string; studentStatus?: string; page?: number; pageSize?: number }): Promise<StudentsPage> {
  const { data } = await client.get('/students', { params: filters });
  return data;
}

export async function fetchStudent(id: string): Promise<Student> {
  const { data } = await client.get(`/students/${id}`);
  return data.student;
}

export async function fetchClasses(): Promise<string[]> {
  const { data } = await client.get('/students/classes');
  return data.classes;
}

export async function fetchGrades(): Promise<string[]> {
  const { data } = await client.get('/students/grades');
  return data.grades;
}

export async function createStudent(input: Partial<Student>): Promise<Student> {
  const { data } = await client.post('/students', input);
  return data.student;
}

export async function updateStudent(id: string, input: Partial<Student>): Promise<Student> {
  const { data } = await client.put(`/students/${id}`, input);
  return data.student;
}

export async function deleteStudent(id: string): Promise<void> {
  await client.delete(`/students/${id}`);
}

/** 变更学生状态（在学/休学/不在籍） */
export async function updateStudentStatus(id: string, status: string): Promise<Student> {
  const { data } = await client.put(`/students/${id}/status`, { status });
  return data.student;
}

export async function importStudents(students: Partial<Student>[]): Promise<{ created: number; updated: number; skipped: number; message: string }> {
  const { data } = await client.post('/students/import', { students });
  return { created: data.created || 0, updated: data.updated || 0, skipped: data.skipped || 0, message: data.message || '' };
}

/** 学生扩展字段配置（fields/presets/builtins） */
export async function fetchStudentFields(): Promise<{ fields: any[]; presets: any[]; builtins: any[] }> {
  const { data } = await client.get('/students/fields');
  return data;
}

/** 保存学生扩展字段（系统管理员/院系管理员） */
export async function saveStudentFields(fields: any[]): Promise<any[]> {
  const { data } = await client.put('/students/fields', { fields });
  return data.fields || [];
}
