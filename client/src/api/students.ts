import client from './client';
import type { Student } from '../types';

export interface StudentsPage {
  students: Student[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function fetchStudents(filters?: { q?: string; className?: string; grade?: string; studentType?: string; mentalTarget?: string; page?: number; pageSize?: number }): Promise<StudentsPage> {
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

export async function importStudents(students: Partial<Student>[]): Promise<{ count: number; skipped: number; message: string }> {
  const { data } = await client.post('/students/import', { students });
  return { count: data.count, skipped: data.skipped || 0, message: data.message || '' };
}
