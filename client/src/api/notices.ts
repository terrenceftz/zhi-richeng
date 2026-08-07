import client from './client';
import type { Notice, MaterialItem } from '../types';

export async function fetchNotices(filters?: { status?: string }): Promise<Notice[]> {
  const { data } = await client.get('/notices', { params: filters });
  return data.notices;
}

export async function fetchNotice(id: string): Promise<Notice> {
  const { data } = await client.get(`/notices/${id}`);
  return data.notice;
}

export async function createNotice(input: Partial<Notice>): Promise<Notice> {
  const { data } = await client.post('/notices', input);
  return data.notice;
}

export async function updateNotice(id: string, input: Partial<Notice>): Promise<Notice> {
  const { data } = await client.put(`/notices/${id}`, input);
  return data.notice;
}

export async function toggleMaterial(noticeId: string, index: number, submitted: boolean): Promise<Notice> {
  const { data } = await client.patch(`/notices/${noticeId}/materials/${index}`, { submitted });
  return data.notice;
}

export async function deleteNotice(id: string): Promise<void> {
  await client.delete(`/notices/${id}`);
}

export async function noticeFromText(text: string, createTask: boolean): Promise<Notice> {
  const { data } = await client.post('/notices/from-text', { text, createTask });
  return data.notice;
}

export type { MaterialItem };
