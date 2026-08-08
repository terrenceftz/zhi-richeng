import client from './client';
import type { Counseling } from '../types';

export interface NotCounseledStudent {
  id: string;
  name: string;
  className: string | null;
  grade: string | null;
  isMentalTarget: boolean;
}

export interface CounselingStats {
  total: number;
  counseledCount: number;
  coverage: number;
  notCounseledCount: number;
  notCounseled: NotCounseledStudent[];
  byType: { label: string; count: number }[];
  recent: Counseling[];
  range: { start: string; end: string };
}

export async function fetchCounselingStats(): Promise<CounselingStats> {
  const { data } = await client.get('/counseling/stats');
  return data;
}

export async function fetchCounselings(filters?: { studentId?: string; from?: string; to?: string }): Promise<Counseling[]> {
  const { data } = await client.get('/counseling', { params: filters });
  return data.records;
}

/** AI 谈心助手：生成谈话提纲 */
export async function fetchCounselingOutline(studentId: string): Promise<string> {
  const { data } = await client.post('/counseling/outline', { studentId });
  return data.outline;
}

/** AI 谈心助手：一句话描述 → 结构化谈心记录 */
export async function summarizeCounseling(text: string, studentId?: string): Promise<{ content: string; followUp: string }> {
  const { data } = await client.post('/counseling/summarize', { text, studentId });
  return data;
}

export async function createCounseling(input: Partial<Counseling>): Promise<Counseling> {
  const { data } = await client.post('/counseling', input);
  return data.record;
}

export async function updateCounseling(id: string, input: Partial<Counseling>): Promise<Counseling> {
  const { data } = await client.put(`/counseling/${id}`, input);
  return data.record;
}

export async function deleteCounseling(id: string): Promise<void> {
  await client.delete(`/counseling/${id}`);
}
