import prisma from '../db';

export interface MaterialItem {
  name: string;
  required: boolean;
  submitted: boolean;
  note?: string;
}

export interface NoticeInput {
  title: string;
  source?: string;
  deadline?: string;
  materials?: MaterialItem[];
  status?: string;
  taskId?: string;
}

function parseMaterials(n: any) {
  if (typeof n.materials === 'string') {
    try { n.materials = JSON.parse(n.materials); } catch { n.materials = []; }
  }
  return n;
}

export async function getNotices(userId: string, filters: { status?: string }) {
  const where: any = { userId };
  if (filters.status) where.status = filters.status;
  const notices = await prisma.notice.findMany({
    where,
    orderBy: [{ status: 'asc' }, { deadline: 'asc' }, { createdAt: 'desc' }],
  });
  return notices.map(parseMaterials);
}

export async function getNoticeById(userId: string, id: string) {
  const notice = await prisma.notice.findFirst({ where: { id, userId } });
  if (!notice) throw Object.assign(new Error('通知不存在'), { statusCode: 404 });
  return parseMaterials(notice);
}

export async function createNotice(userId: string, input: NoticeInput) {
  // 校验关联任务归属（防跨用户引用他人任务）
  if (input.taskId) {
    const task = await prisma.task.findFirst({ where: { id: input.taskId, userId } });
    if (!task) throw Object.assign(new Error('关联的任务不存在'), { statusCode: 400 });
  }
  const n = await prisma.notice.create({
    data: {
      userId,
      title: input.title,
      source: input.source || null,
      deadline: input.deadline ? new Date(input.deadline) : null,
      materials: JSON.stringify(input.materials || []),
      status: input.status || 'pending',
      taskId: input.taskId || null,
    },
  });
  return parseMaterials(n);
}

export async function updateNotice(userId: string, id: string, input: Partial<NoticeInput>) {
  await getNoticeById(userId, id);
  // 白名单过滤：禁止改写 userId / createdAt
  const allowed: (keyof NoticeInput)[] = ['title', 'source', 'deadline', 'materials', 'status', 'taskId'];
  const data: any = {};
  for (const k of allowed) {
    if (input[k] !== undefined) data[k] = input[k];
  }
  if (data.materials !== undefined) data.materials = JSON.stringify(data.materials);
  if (data.deadline !== undefined) {
    const parsed = data.deadline ? new Date(data.deadline) : null;
    if (data.deadline && isNaN(parsed!.getTime())) {
      throw Object.assign(new Error('截止日期格式无效'), { statusCode: 400 });
    }
    data.deadline = parsed;
  }
  if (data.taskId !== undefined && data.taskId) {
    const task = await prisma.task.findFirst({ where: { id: data.taskId, userId } });
    if (!task) throw Object.assign(new Error('关联的任务不存在'), { statusCode: 400 });
  }
  const n = await prisma.notice.update({ where: { id }, data });
  return parseMaterials(n);
}

/** 切换单个材料项的「已上报」状态（事务内重读，防并发覆盖丢失修改） */
export async function toggleMaterial(userId: string, noticeId: string, index: number, submitted: boolean) {
  await getNoticeById(userId, noticeId);
  const updated = await prisma.$transaction(async (tx) => {
    const fresh = await tx.notice.findFirst({ where: { id: noticeId, userId } });
    if (!fresh) throw Object.assign(new Error('通知不存在'), { statusCode: 404 });
    const materials: MaterialItem[] = typeof fresh.materials === 'string' ? JSON.parse(fresh.materials) : fresh.materials;
    if (index < 0 || index >= materials.length) {
      throw Object.assign(new Error('材料项不存在'), { statusCode: 400 });
    }
    materials[index] = { ...materials[index], submitted };
    const allDone = materials.length > 0 && materials.every((m) => !m.required || m.submitted);
    const status = allDone ? 'done' : fresh.status === 'done' ? 'in_progress' : fresh.status;
    return tx.notice.update({
      where: { id: noticeId },
      data: { materials: JSON.stringify(materials), status },
    });
  });
  return parseMaterials(updated);
}

export async function deleteNotice(userId: string, id: string) {
  await getNoticeById(userId, id);
  return prisma.notice.delete({ where: { id } });
}
