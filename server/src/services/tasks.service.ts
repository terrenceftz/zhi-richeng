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
    // 修复：按「当天 00:00 ~ 次日 00:00」范围过滤，原 equals 永不命中
    const start = new Date(filters.date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    where.dueDate = { gte: start, lt: end };
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

/** 逾期任务：截止时间已过且未完成（含当天 dueTime；无 dueTime 的任务次日起算逾期） */
export async function getOverdueTasks(userId: string) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tasks = await prisma.task.findMany({
    where: {
      userId,
      status: { not: 'done' },
      dueDate: { not: null, lte: today },
    },
    orderBy: [{ dueDate: 'asc' }, { priority: 'asc' }],
    include: { children: true },
  });
  // JS 侧精确判定：有 dueTime 则到点即逾期；无 dueTime 则次日 0 点起逾期（与前端 isOverdue 一致）
  const overdue = tasks.filter((t) => {
    const due = new Date(t.dueDate!);
    if (t.dueTime) {
      const [h, m] = t.dueTime.split(':').map(Number);
      due.setHours(h || 0, m || 0, 0, 0);
      return now > due;
    }
    // 无 dueTime：次日本地 0 点起逾期（用本地日期组件构造，避免 UTC 偏移 8 小时）
    const nextLocalMidnight = new Date(due.getFullYear(), due.getMonth(), due.getDate() + 1);
    return now > nextLocalMidnight;
  });
  return parseTagsList(overdue);
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
          location: input.location || null,
          status: input.status || 'todo',
          priority: input.priority || 'medium',
          category: input.category || null,
          dueDate: input.dueDate ? new Date(input.dueDate) : null,
          dueTime: input.dueTime || null,
          remind: input.remind !== undefined ? input.remind : true,
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

/** 校验 parentId 不指向自身、且不会形成环 */
async function assertParentValid(userId: string, taskId: string, parentId: string | null | undefined) {
  if (!parentId) return;
  if (parentId === taskId) {
    throw Object.assign(new Error('不能将任务设为自身的子任务'), { statusCode: 400 });
  }
  // 向上追溯，最多 20 层，检测环
  let current = parentId;
  const visited = new Set<string>([taskId]);
  for (let i = 0; i < 20; i++) {
    if (visited.has(current)) {
      throw Object.assign(new Error('检测到父子关系环，已拒绝'), { statusCode: 400 });
    }
    visited.add(current);
    const node = await prisma.task.findFirst({ where: { id: current, userId }, select: { parentId: true } });
    if (!node) break;
    if (!node.parentId) break;
    current = node.parentId;
  }
}

export async function updateTask(userId: string, taskId: string, input: UpdateTaskInput) {
  await getTaskById(userId, taskId);
  await assertParentValid(userId, taskId, input.parentId);

  const data: any = { ...input };
  if (input.tags !== undefined) data.tags = stringifyTags(input.tags);
  if (input.dueDate !== undefined) data.dueDate = input.dueDate ? new Date(input.dueDate) : null;
  // 禁止越权改写这些字段
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
  const updates = orderedIds.slice(0, 500).map((id, index) =>
    prisma.task.updateMany({ where: { id, userId }, data: { sortOrder: index } })
  );
  await prisma.$transaction(updates);
  return getTasks(userId, {});
}
