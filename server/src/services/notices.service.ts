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
  const data: any = { ...input };
  if (input.materials !== undefined) data.materials = JSON.stringify(input.materials);
  if (input.deadline !== undefined) data.deadline = input.deadline ? new Date(input.deadline) : null;
  delete data.id;
  const n = await prisma.notice.update({ where: { id }, data });
  return parseMaterials(n);
}

/** 切换单个材料项的「已上报」状态 */
export async function toggleMaterial(userId: string, noticeId: string, index: number, submitted: boolean) {
  const notice = await getNoticeById(userId, noticeId);
  const materials: MaterialItem[] = Array.isArray(notice.materials) ? notice.materials : [];
  if (index < 0 || index >= materials.length) {
    throw Object.assign(new Error('材料项不存在'), { statusCode: 400 });
  }
  materials[index] = { ...materials[index], submitted };
  // 若全部已上报，自动置为 done；否则若曾完成则回退为 in_progress
  const allDone = materials.length > 0 && materials.every((m) => !m.required || m.submitted);
  const status = allDone ? 'done' : notice.status === 'done' ? 'in_progress' : notice.status;
  const updated = await prisma.notice.update({
    where: { id: noticeId },
    data: { materials: JSON.stringify(materials), status },
  });
  return parseMaterials(updated);
}

export async function deleteNotice(userId: string, id: string) {
  await getNoticeById(userId, id);
  return prisma.notice.delete({ where: { id } });
}
