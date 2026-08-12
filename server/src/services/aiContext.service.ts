import prisma from '../db';
import { visibleStudentWhere, type UserCtx } from '../utils/scope';

/**
 * 为学生 AI 关怀功能构造「脱敏关怀摘要」。
 *
 * 隐私保护原则（硬编码白名单）：
 * - 仅提取与心理关怀、学业跟踪相关的字段
 * - 绝不发送：证件号码、手机号、家庭住址、家长联系电话等敏感联系方式
 * - 绝不发送：学生真实姓名与学号（以「已匿名」代替），仅保留性别/班级/年级等非身份字段
 * - 跟进记录、谈心内容：建议生成的依据，保留
 */
export interface StudentAiContext {
  profileText: string;   // 学生 + 台账档案摘要
  recordsText: string;   // 台账跟进记录
  counselText: string;   // 谈心记录
  riskText: string;      // 风险状态（距上次跟进天数等）
}

const LEVEL_NAMES: Record<number, string> = { 1: '一级（基础关注）', 2: '二级（重点关注）', 3: '三级（最高关注）' };

/** 计算某台账学生距最近一次跟进（或纳入时间）的天数 */
function daysSince(date: Date | null, fallback: Date | null): number {
  const base = date || fallback || new Date();
  return Math.max(0, Math.floor((Date.now() - base.getTime()) / 86400000));
}

/** 读取台账学生的完整关怀上下文（含风险判断），供 AI 建议 / 谈话提纲使用（可见范围） */
export async function buildStudentAiContext(ctx: UserCtx, studentId: string): Promise<StudentAiContext> {
  const student = await prisma.student.findFirst({
    where: { ...visibleStudentWhere(ctx), id: studentId },
    include: {
      mentalProfile: true,
      mentalRecords: { orderBy: { date: 'desc' }, take: 15 },
      counselings: { orderBy: { date: 'desc' }, take: 10 },
    },
  });
  if (!student) throw Object.assign(new Error('学生不存在'), { statusCode: 404 });

  const p = student.mentalProfile;
  const categories = p ? (() => { try { return JSON.parse(p.categories); } catch { return []; } })() : [];

  // ---- 档案摘要（隐私白名单：不发送真实姓名与学号）----
  const profileParts: string[] = [
    `姓名：已匿名`,
    `学号：已隐藏`,
    `性别：${student.gender || '未知'}`,
    `班级：${student.className || '未分班'} / 年级：${student.grade || '未知'} / 学生类型：${student.studentType === 'overseas' ? '境外生' : student.studentType === 'domestic' ? '境内生' : '未知'}`,
  ];
  if (p) {
    profileParts.push(
      `关注级别：${LEVEL_NAMES[p.concernLevel] || '一级（基础关注）'}`,
      `关注类别：${categories.length ? categories.join('、') : '无'}`,
      `是否家庭经济困难：${p.isPoverty ? '是' : '否'}`,
      `纳入台账：${p.includedAt ? new Date(p.includedAt).toISOString().slice(0, 10) : '未知'}${p.includeReason ? `，原因：${p.includeReason}` : ''}`,
      `跟进人：${p.followUpPerson || '未指定'}`,
      `家长是否知情：${p.parentInformed ? '是' : '否'}`,
      `档案备注：${p.remark || '无'}`,
    );
  } else {
    profileParts.push('尚未建立台账档案（非台账学生或档案缺失）');
  }
  const profileText = profileParts.join('\n');

  // ---- 台账跟进记录 ----
  const recordsText = student.mentalRecords.length
    ? student.mentalRecords.map((r) =>
        `【${new Date(r.date).toISOString().slice(0, 10)}】情况：${r.situation}${r.action ? `；措施：${r.action}` : ''}${r.followUp ? `；下一步：${r.followUp}` : ''}`
      ).join('\n')
    : '无跟进记录';

  // ---- 谈心记录（学生表现的重要来源）----
  const counselText = student.counselings.length
    ? student.counselings.map((c) =>
        `【${new Date(c.date).toISOString().slice(0, 10)} · ${c.type}】${c.content}${c.followUp ? `；后续：${c.followUp}` : ''}`
      ).join('\n')
    : '无谈心记录';

  // ---- 风险状态 ----
  let riskText = '';
  if (p) {
    const last = student.mentalRecords[0];
    const lastDate = last ? new Date(last.date) : (p.includedAt ? new Date(p.includedAt) : null);
    const days = daysSince(lastDate, null);
    const thresholds: Record<number, number> = { 1: 60, 2: 45, 3: 30 };
    const threshold = thresholds[p.concernLevel] || 60;
    const overdue = days > threshold;
    const extra = p.isPoverty && categories.includes('心理健康');
    riskText = [
      `距最近一次跟进/纳入已 ${days} 天（该级别建议不超过 ${threshold} 天）${overdue ? '⚠️ 已超期' : ''}`,
      extra ? '风险叠加：家庭经济困难 + 心理健康类别，建议优先关注' : '',
    ].filter(Boolean).join('；');
  }

  return { profileText, recordsText, counselText, riskText };
}
