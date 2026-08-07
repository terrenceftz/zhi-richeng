import client from './client';
import type { MentalRecord, MentalProfile, RiskAlert, Student } from '../types';

export async function fetchMentalRecords(filters?: { studentId?: string; status?: string; level?: string }): Promise<MentalRecord[]> {
  const { data } = await client.get('/mental', { params: filters });
  return data.records;
}

export async function createMentalRecord(input: Partial<MentalRecord>): Promise<MentalRecord> {
  const { data } = await client.post('/mental', input);
  return data.record;
}

export async function updateMentalRecord(id: string, input: Partial<MentalRecord>): Promise<MentalRecord> {
  const { data } = await client.put(`/mental/${id}`, input);
  return data.record;
}

export async function deleteMentalRecord(id: string): Promise<void> {
  await client.delete(`/mental/${id}`);
}

export async function toggleMentalTarget(studentId: string, value: boolean): Promise<Student> {
  const { data } = await client.patch(`/mental/students/${studentId}/toggle`, { value });
  return data.student;
}

export async function fetchMentalStudents(): Promise<Student[]> {
  const { data } = await client.get('/mental/students');
  return data.students;
}

export async function upsertMentalProfile(studentId: string, input: Partial<MentalProfile>): Promise<MentalProfile> {
  const { data } = await client.put(`/mental/students/${studentId}/profile`, input);
  return data.profile;
}

/** 导出台账 Excel（走浏览器下载） */
export async function exportMentalExcel(): Promise<void> {
  const response = await client.get('/mental/export', { responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const a = document.createElement('a');
  a.href = url;
  a.download = `心理台账-${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  window.URL.revokeObjectURL(url);
}

/** 导出月度报送表（每月 15 号报送格式） */
export async function exportMentalReport(): Promise<void> {
  const response = await client.get('/mental/export/report', { responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const a = document.createElement('a');
  a.href = url;
  a.download = `报送表-${new Date().getFullYear()}年${new Date().getMonth() + 1}月.xlsx`;
  a.click();
  window.URL.revokeObjectURL(url);
}

/** 导入台账 Excel（body 为解析后的行数组） */
export async function importMentalRows(rows: Record<string, unknown>[]): Promise<{ updated: number; notFound: string[]; message: string }> {
  const { data } = await client.post('/mental/import', { students: rows });
  return data;
}

/** 风险预警：长期未跟进的重点学生 */
export async function fetchRiskAlerts(): Promise<RiskAlert[]> {
  const { data } = await client.get('/mental/alerts');
  return data.alerts;
}

/** 本月尚未跟进的台账学生 */
export async function fetchMonthlyPending(): Promise<{ pending: Student[]; isHoliday: boolean; skipMonths: number[] }> {
  const { data } = await client.get('/mental/monthly-pending');
  return data;
}

/** AI 台账智囊：生成某台账学生的下一步跟进建议 */
export async function fetchMentalAdvice(studentId: string): Promise<string> {
  const { data } = await client.post('/mental/advice', { studentId });
  return data.advice;
}
