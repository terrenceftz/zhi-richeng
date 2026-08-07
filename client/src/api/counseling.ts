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
