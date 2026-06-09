import { Prisma } from '@prisma/client';
import prisma from '../db';

export interface CreateTaskInput {
  title: string;
  description?: string;
  location?: string;
  status?: string;
  priority?: string;
  category?: string;
  dueDate?: string;
  dueTime?: string;
  remind?: boolean;
  tags?: string[];
  parentId?: string;
}

export interface UpdateTaskInput extends Partial<CreateTaskInput> {}

export interface TaskFilters {
  date?: string;
  status?: string;
  priority?: string;
  category?: string;
}

// SQLite stores tags as JSON string; parse to array for API response
function parseTags(task: any) {
  if (typeof task.tags === 'string') {
    try { task.tags = JSON.parse(task.tags); } catch { task.tags = []; }
  }
  if (task.children) task.children.forEach(parseTags);
  return task;
}

function parseTagsList(tasks: any[]) {
  return tasks.map(parseTags);
}

function stringifyTags(tags?: string[]): string {
  return JSON.stringify(tags || []);
}

export async function getTasks(userId: string, filters: TaskFilters) {
  const where: Prisma.TaskWhereInput = { userId };

  if (filters.status) where.status = filters.status;
  if (filters.priority) where.priority = filters.priority;
  if (filters.category) where.category = filters.category;
  if (filters.date) {
    const d = new Date(filters.date);
    where.dueDate = { equals: d };
  }

  const tasks = await prisma.task.findMany({
    where,
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    include: { children: true },
  });
  return parseTagsList(tasks);
}

export async function getTaskById(userId: string, taskId: string) {
  const task = await prisma.task.findFirst({
    where: { id: taskId, userId },
    include: { children: true },
  });
  if (!task) throw Object.assign(new Error('任务不存在'), { statusCode: 404 });
  return parseTags(task);
}

export async function createTask(userId: string, input: CreateTaskInput) {
  const maxOrder = await prisma.task.aggregate({ where: { userId }, _max: { sortOrder: true } });
  const sortOrder = (maxOrder._max.sortOrder ?? -1) + 1;

  const task = await prisma.task.create({
    data: {
      userId,
      title: input.title,
      description: input.description || null,
      location: input.location || null,
      status: input.status || 'todo',
      priority: input.priority || 'medium',
      category: input.category || null,
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      dueTime: input.dueTime || null,
      remind: input.remind !== undefined ? input.remind : true,
      tags: stringifyTags(input.tags),
      parentId: input.parentId || null,
      sortOrder,
    },
    include: { children: true },
  });
  return parseTags(task);
}

export async function createTasksBatch(userId: string, inputs: CreateTaskInput[]) {
  const tasks = await prisma.$transaction(async (tx) => {
    const maxOrder = await tx.task.aggregate({ where: { userId }, _max: { sortOrder: true } });
    let nextOrder = (maxOrder._max.sortOrder ?? -1) + 1;

    const results = [];
    for (const input of inputs) {
      const task = await tx.task.create({
        data: {
          userId,
          title: input.title,
          description: input.description || null,
          status: input.status || 'todo',
          priority: input.priority || 'medium',
          category: input.category || null,
          dueDate: input.dueDate ? new Date(input.dueDate) : null,
          dueTime: input.dueTime || null,
          tags: stringifyTags(input.tags),
          sortOrder: nextOrder++,
        },
      });
      results.push(parseTags(task));
    }
    return results;
  });
  return tasks;
}

export async function updateTask(userId: string, taskId: string, input: UpdateTaskInput) {
  await getTaskById(userId, taskId);

  const data: any = { ...input };
  if (input.tags !== undefined) data.tags = stringifyTags(input.tags);
  if (input.dueDate !== undefined) data.dueDate = input.dueDate ? new Date(input.dueDate) : null;
  delete data.id;
  delete data.userId;
  delete data.createdAt;
  delete data.updatedAt;

  const task = await prisma.task.update({ where: { id: taskId }, data, include: { children: true } });
  return parseTags(task);
}

export async function deleteTask(userId: string, taskId: string) {
  await getTaskById(userId, taskId);
  return prisma.task.delete({ where: { id: taskId } });
}

export async function updateTaskStatus(userId: string, taskId: string, status: string) {
  await getTaskById(userId, taskId);
  const task = await prisma.task.update({ where: { id: taskId }, data: { status } });
  return parseTags(task);
}

export async function reorderTasks(userId: string, orderedIds: string[]) {
  const updates = orderedIds.map((id, index) =>
    prisma.task.updateMany({ where: { id, userId }, data: { sortOrder: index } })
  );
  await prisma.$transaction(updates);
  return getTasks(userId, {});
}
