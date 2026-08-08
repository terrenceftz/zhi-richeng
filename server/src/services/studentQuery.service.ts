import prisma from '../db';
import * as llmService from './llm.service';

export interface StudentQueryResult {
  reply: string;
}

/** 清理查询关键词：去掉常见尾缀（“的信息/的资料/的联系方式”等） */
export function cleanKeyword(kw: string): string {
  return kw
    .replace(/(的?信息|的资料|的情况|的详细信息|的联系方式|的台账|详细信息|信息)$/g, '')
    .trim();
}

/**
 * 从查询语句中提取学生关键词（纯函数，供 handleStudentQuery 与单元测试使用）。
 * 多字前缀优先，避免「查一下张三」被裸「查」拆成「一下张三」。
 */
export function extractQueryKeyword(text: string): string | null {
  const trimmed = text.trim();
  const m = trimmed.match(/^(?:学生|我想查|帮我查|查一查|查一下|查查|查询|查找|查看|找一下|搜一下|搜索|查)\s*[:：]?\s*(.+)$/);
  return m ? cleanKeyword(m[1]) : null;
}

/**
 * 解析飞书消息是否为学生查询意图。
 * 返回 null 表示不是学生查询；返回回复文本。
 */
export async function handleStudentQuery(userId: string, text: string): Promise<string | null> {
  const trimmed = text.trim();

  // ---- 快捷指令（不需要 LLM）----
  // 「台账」「心理台账」「台账学生」「台账学生列表」「台账有哪些」→ 列出心理台账学生
  if (/^(台账|心理台账|台账学生|台账列表|重点关注)\s*(列表|名单|有哪些|有什么|看一下)?\s*$/.test(trimmed)) {
    return await listMentalStudents(userId);
  }

  // 「学生 张三」「查一下张三」「查查张三」「查询李四」「张三的信息」→ 查询指定学生
  const keyword = extractQueryKeyword(trimmed);
  if (keyword) {
    return await searchStudents(userId, keyword);
  }

  // ---- LLM 意图分类：学生查询 vs 其他 ----
  const isStudentQuery = await llmService.isStudentQueryIntent(trimmed);
  if (!isStudentQuery) return null;

  // 提取查询关键词（姓名/班级/学号）
  const rawKeyword = await llmService.extractStudentQueryKeyword(trimmed);
  if (!rawKeyword) return null;

  return await searchStudents(userId, cleanKeyword(rawKeyword));
}

/** 列出心理台账学生 */
async function listMentalStudents(userId: string): Promise<string> {
  const students = await prisma.student.findMany({
    where: { userId, isMentalTarget: true },
    orderBy: [{ name: 'asc' }],
    include: { _count: { select: { mentalRecords: true } } },
    take: 30,
  });
  if (students.length === 0) {
    return '📋 当前没有心理台账重点关注学生。';
  }
  const lines = students.map((s, i) =>
    `${i + 1}. ${s.name}${s.className ? `（${s.className}）` : ''}${s._count.mentalRecords > 0 ? ` · ${s._count.mentalRecords} 条台账` : ''}`
  );
  return `📋 心理台账重点关注学生（${students.length} 人）\n\n${lines.join('\n')}`;
}

/** 按关键词搜索学生并返回信息卡 */
async function searchStudents(userId: string, keyword: string): Promise<string> {
  const students = await prisma.student.findMany({
    where: {
      userId,
      OR: [
        { name: { contains: keyword } },
        { studentNo: { contains: keyword } },
        { className: { contains: keyword } },
        { phone: { contains: keyword } },
      ],
    },
    take: 5,
    include: {
      _count: { select: { mentalRecords: true, counselings: true } },
    },
  });

  if (students.length === 0) {
    return `🔍 未找到与「${keyword}」相关的学生。`;
  }

  const lines = students.map((s) => {
    const parts = [`👤 ${s.name}`];
    if (s.studentNo) parts.push(`学号：${s.studentNo}`);
    if (s.className) parts.push(`班级：${s.className}`);
    if (s.grade) parts.push(`年级：${s.grade}`);
    if (s.gender) parts.push(`性别：${s.gender}`);
    if (s.phone) parts.push(`📱 ${s.phone}`);
    if (s.dormitory) parts.push(`🏠 ${s.dormitory}`);
    if (s.isMentalTarget) parts.push('⚠️ 心理台账重点关注');
    if (s._count.mentalRecords > 0) parts.push(`台账记录 ${s._count.mentalRecords} 条`);
    if (s._count.counselings > 0) parts.push(`谈心 ${s._count.counselings} 次`);
    return parts.join('\n');
  });

  const header = students.length === 1 ? '' : `🔍 找到 ${students.length} 名相关学生\n\n`;
  return `${header}${lines.join('\n\n──────\n\n')}`;
}
