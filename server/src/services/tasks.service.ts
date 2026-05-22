import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateTaskInput {
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  category?: string;
  dueDate?: string;
  dueTime?: string;
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

export async function getTasks(userId: string, filters: TaskFilters) {
  const where: Prisma.TaskWhereInput = { userId };

  if (filters.status) where.status = filters.status;
  if (filters.priority) where.priority = filters.priority;
  if (filters.category) where.category = filters.category;
  if (filters.date) {
    const d = new Date(filters.date);
    where.dueDate = { equals: d };
  }

  return prisma.task.findMany({
    where,
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    include: { children: true },
  });
}

export async function getTaskById(userId: string, taskId: string) {
  const task = await prisma.task.findFirst({
    where: { id: taskId, userId },
    include: { children: true },
  });
  if (!task) throw Object.assign(new Error('任务不存在'), { statusCode: 404 });
  return task;
}

export async function createTask(userId: string, input: CreateTaskInput) {
  const maxOrder = await prisma.task.aggregate({ where: { userId }, _max: { sortOrder: true } });
  const sortOrder = (maxOrder._max.sortOrder ?? -1) + 1;

  return prisma.task.create({
    data: {
      userId,
      title: input.title,
      description: input.description || null,
      status: input.status || 'todo',
      priority: input.priority || 'medium',
      category: input.category || null,
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      dueTime: input.dueTime || null,
      tags: input.tags || [],
      parentId: input.parentId || null,
      sortOrder,
    },
    include: { children: true },
  });
}

export async function createTasksBatch(userId: string, inputs: CreateTaskInput[]) {
  const maxOrder = await prisma.task.aggregate({ where: { userId }, _max: { sortOrder: true } });
  let nextOrder = (maxOrder._max.sortOrder ?? -1) + 1;

  const tasks = [];
  for (const input of inputs) {
    const task = await prisma.task.create({
      data: {
        userId,
        title: input.title,
        description: input.description || null,
        status: input.status || 'todo',
        priority: input.priority || 'medium',
        category: input.category || null,
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        dueTime: input.dueTime || null,
        tags: input.tags || [],
        sortOrder: nextOrder++,
      },
    });
    tasks.push(task);
  }
  return tasks;
}

export async function updateTask(userId: string, taskId: string, input: UpdateTaskInput) {
  await getTaskById(userId, taskId);

  const data: any = { ...input };
  if (input.dueDate !== undefined) data.dueDate = input.dueDate ? new Date(input.dueDate) : null;
  delete data.id;
  delete data.userId;
  delete data.createdAt;
  delete data.updatedAt;

  return prisma.task.update({ where: { id: taskId }, data, include: { children: true } });
}

export async function deleteTask(userId: string, taskId: string) {
  await getTaskById(userId, taskId);
  return prisma.task.delete({ where: { id: taskId } });
}

export async function updateTaskStatus(userId: string, taskId: string, status: string) {
  await getTaskById(userId, taskId);
  return prisma.task.update({ where: { id: taskId }, data: { status } });
}

export async function reorderTasks(userId: string, orderedIds: string[]) {
  const updates = orderedIds.map((id, index) =>
    prisma.task.updateMany({ where: { id, userId }, data: { sortOrder: index } })
  );
  await prisma.$transaction(updates);
  return getTasks(userId, {});
}
