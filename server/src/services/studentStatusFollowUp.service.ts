import prisma from '../db';
import * as studentsService from './students.service';
import { visibleStudentWhere, type UserCtx } from '../utils/scope';

const STATUS_LABEL: Record<string, string> = { active: '在学', suspended: '休学', inactive: '不在籍' };

/**
 * 解析飞书消息是否为「学生状态变更」请求。
 * 支持格式示例：
 * - 「张三 休学」「张三 复学」
 * - 「张三 毕业」「张三 退学」
 * - 「给张三办休学」「李四 休学」
 * 返回 null 表示不是状态指令；返回回复文本。
 */
export async function handleStudentStatusChange(userId: string, text: string): Promise<string | null> {
  const trimmed = text.trim();
  // 触发关键词
  const m = trimmed.match(/(.+?)\s*(?:办|办理|申请)?\s*(休学|复学|毕业|退学)/);
  if (!m) return null;

  const action = m[2];
  const studentName = m[1].replace(/^(给|为|向)/, '').trim();
  if (!studentName) return null;

  // 构建可见范围（本学院）
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, college: true } });
  const ctx: UserCtx = { userId, role: user?.role || 'user', college: user?.college || '' };

  // 查找学生（按姓名，其次学号）
  let student = await prisma.student.findFirst({
    where: { ...visibleStudentWhere(ctx), name: studentName },
  });
  if (!student) {
    student = await prisma.student.findFirst({
      where: { ...visibleStudentWhere(ctx), studentNo: studentName },
    });
  }
  if (!student) {
    return `❌ 未找到学生「${studentName}」，请确认姓名或学号是否正确。`;
  }

  // 目标状态
  let target: string;
  if (action === '休学') target = 'suspended';
  else if (action === '复学') target = 'active';
  else target = 'inactive'; // 毕业 / 退学

  try {
    const updated = await studentsService.setStudentStatus(ctx, student.id, target);
    const label = STATUS_LABEL[updated.studentStatus] || updated.studentStatus;
    return [
      `✅ 已将 ${updated.name} 状态更新为「${label}」`,
      student.studentStatus === 'inactive' && target !== 'inactive' ? '（原为不在籍，已恢复）' : '',
      target === 'inactive' ? '该学生已封存，仅可查询；其历史台账/谈心记录保留' : '',
      target === 'suspended' ? '休学期间不计入在籍人数与统计，不参与台账跟进/谈心提醒' : '',
    ].filter(Boolean).join('\n');
  } catch (err: any) {
    return `❌ 操作失败：${err?.message || '未知错误'}`;
  }
}
