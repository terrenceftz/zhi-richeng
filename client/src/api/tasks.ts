import client from './client';
import type { Task, ParsedTask, ExtractResult } from '../types';

export interface TaskFilters {
  date?: string;
  status?: string;
  priority?: string;
  category?: string;
}

export async function fetchTasks(filters?: TaskFilters): Promise<Task[]> {
  const { data } = await client.get('/tasks', { params: filters });
  return data.tasks;
}

export async function fetchTask(id: string): Promise<Task> {
  const { data } = await client.get(`/tasks/${id}`);
  return data.task;
}

export async function createTask(input: Partial<Task>): Promise<Task> {
  const { data } = await client.post('/tasks', input);
  return data.task;
}

export async function updateTask(id: string, input: Partial<Task>): Promise<Task> {
  const { data } = await client.put(`/tasks/${id}`, input);
  return data.task;
}

export async function deleteTask(id: string): Promise<void> {
  await client.delete(`/tasks/${id}`);
}

export async function updateTaskStatus(id: string, status: string): Promise<Task> {
  const { data } = await client.patch(`/tasks/${id}/status`, { status });
  return data.task;
}

export async function decomposeTask(id: string): Promise<Task[]> {
  const { data } = await client.post(`/tasks/${id}/decompose`);
  return data.subtasks;
}

export async function reorderTasks(orderedIds: string[]): Promise<Task[]> {
  const { data } = await client.patch('/tasks/reorder', { orderedIds });
  return data.tasks;
}

export async function parseNLP(text: string): Promise<{ parsed: ParsedTask; confirmed: false }> {
  const { data } = await client.post('/tasks/nlp', { text });
  return data;
}

export async function extractNLP(text: string): Promise<ExtractResult> {
  const { data } = await client.post('/tasks/nlp/extract', { text });
  return data;
}

export async function confirmNLP(tasks: ParsedTask[]): Promise<{ tasks: Task[]; count: number }> {
  const { data } = await client.post('/tasks/nlp/confirm', { tasks });
  return data;
}
