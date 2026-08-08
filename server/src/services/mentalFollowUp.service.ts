import prisma from '../db';
import * as llmService from './llm.service';
import * as mentalService from './mental.service';
import { getDeepSeekApiKey } from './settings.service';
import { visibleStudentWhere, type UserCtx } from '../utils/scope';

/**
 * 解析飞书消息是否为「添加心理台账跟进记录」请求。
 * 返回 null 表示不是；返回回复文本。
 *
 * 支持的格式示例：
 * - 「台账跟进 张三：今天谈话情绪稳定多了」
 * - 「给李四添加台账跟进：家长已联系，建议心理咨询」
 * - 「记录王五的心理跟进：成绩有所回升」
 * - 「给张三记跟进：今天聊了半小时」
 */
export async function handleMentalFollowUp(userId: string, text: string): Promise<string | null> {
  const trimmed = text.trim();

  // 触发关键词
  if (!/(台账跟进|跟进记录|心理跟进|记录跟进|添加跟进|记跟进|加跟进)/.test(trimmed)) {
    return null;
  }
  // 排除明显是查询的场景（查跟进记录）
  if (/(查询|查看|有哪些|多少|列表|查一下|看看).*(跟进|台账)/.test(trimmed)) {
    return null;
  }

  // 提取：学生姓名/学号 + 跟进内容 + 日期
  const parsed = await extractFollowUpInfo(trimmed);
  if (!parsed) return null;

  const { studentName, content, date } = parsed;

  // 按用户所属学院构建可见范围（本学院共享学生也可跟进）
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, college: true } });
  const ctx: UserCtx = { userId, role: user?.role || 'user', college: user?.college || '' };

  // 查找学生（按姓名，其次学号；本学院范围）
  let student = await prisma.student.findFirst({
    where: { ...visibleStudentWhere(ctx), name: studentName },
  });
  if (!student) {
    student = await prisma.student.findFirst({
      where: { ...visibleStudentWhere(ctx), studentNo: studentName },
    });
  }
  if (!student) {
    // 仅当输入姓名≥2字时做 contains 模糊匹配，且绝不自动落库（避免误写）
    if (studentName.length >= 2) {
      const fuzzy = await prisma.student.findMany({
        where: { ...visibleStudentWhere(ctx), name: { contains: studentName } },
        take: 5,
      });
      if (fuzzy.length === 1) {
        student = fuzzy[0];
      } else if (fuzzy.length > 1) {
        return `🔍 找到多位姓名含「${studentName}」的学生：\n${fuzzy.map((s) => `  · ${s.name}（${s.studentNo || '无学号'}）`).join('\n')}\n请回复「台账跟进 全名：内容」精确指定`;
      }
    }
  }
  if (!student) {
    return `❌ 未找到学生「${studentName}」，请确认姓名或学号是否正确。\n格式：台账跟进 学生姓名：跟进内容`;
  }

  // 创建跟进记录（自动建档 + 标记台账学生）
  try {
    await mentalService.createRecord(ctx, {
      studentId: student.id,
      date: date || new Date().toISOString().slice(0, 10),
      situation: content,
    });
  } catch {
    return '❌ 保存失败，请重试';
  }

  return [
    `✅ 已为 ${student.name} 添加心理台账跟进记录`,
    date ? `📅 ${date}` : `📅 ${new Date().toISOString().slice(0, 10)}`,
    `📝 ${content.slice(0, 100)}`,
    student.isMentalTarget ? '⚠️ 该学生已在心理台账中' : '📋 已自动纳入心理台账',
  ].filter(Boolean).join('\n');
}

/** 提取跟进信息：学生姓名/学号 + 内容 + 日期 */
async function extractFollowUpInfo(text: string): Promise<{ studentName: string; content: string; date?: string } | null> {
  // 规则解析：找「给XX」「XX：内容」「XX：」模式
  // 1) 「给张三添加台账跟进：内容」/「给张三记跟进：内容」
  let m = text.match(/给([^，。；;:：\s]{1,20}?)(?:添加|记录|记)?(?:心理)?(?:台账)?跟进[:：]([\s\S]+)/);
  // 2) 「台账跟进 张三：内容」/「心理跟进 张三：内容」
  if (!m) {
    m = text.match(/(?:台账|心理|记录)?(?:跟进|跟进记录)[：: ]([^，。；;：:]{1,20}?)[：:]([\s\S]+)/);
  }
  if (m && m[1] && m[2]) {
    const studentName = m[1].replace(/^(给|为|向)/, '').trim();
    const content = m[2].trim();
    if (studentName && content) {
      return { studentName, content, date: extractDate(text) };
    }
  }

  // LLM 辅助提取（规则解析失败时）
  try {
    const apiKey = await getDeepSeekApiKey();
    if (!apiKey) return null;
    const parsed = await llmService.extractFollowUp(text);
    if (parsed && parsed.studentName && parsed.content) {
      return { studentName: parsed.studentName, content: parsed.content, date: parsed.date || extractDate(text) };
    }
  } catch {
    /* 忽略，返回 null */
  }
  return null;
}

/** 从文本中提取日期（今天/昨天/明天/YYYY-MM-DD） */
function extractDate(text: string): string | undefined {
  const today = new Date();
  if (/昨天/.test(text)) {
    const d = new Date(today);
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  }
  if (/前天/.test(text)) {
    const d = new Date(today);
    d.setDate(d.getDate() - 2);
    return d.toISOString().slice(0, 10);
  }
  if (/明天|明天跟进/.test(text)) {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }
  const m = text.match(/(\d{4})[-/年](\d{1,2})[-/月](\d{1,2})/);
  if (m) {
    return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  }
  return undefined;
}
