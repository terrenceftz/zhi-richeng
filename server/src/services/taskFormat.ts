/**
 * 任务列表的共享文本格式化（用于 LLM 上下文、飞书回复、每日简报等）。
 * 消除原来散落在 tasks.controller / digest.service / feishu.service 的重复实现。
 */

const STATUS_CN: Record<string, string> = { todo: '待办', in_progress: '进行中', done: '完成' };

function priorityEmoji(priority?: string): string {
  if (priority === 'high') return '🔴';
  if (priority === 'medium') return '🟡';
  return '🟢';
}

function dateStr(dueDate?: Date | string | null): string {
  if (!dueDate) return '待安排';
  return new Date(dueDate).toISOString().slice(0, 10);
}

export interface FormatableTask {
  title: string;
  priority?: string;
  status?: string;
  dueDate?: Date | string | null;
  dueTime?: string | null;
  location?: string | null;
  category?: string | null;
}

/**
 * 紧凑单行格式，适合喂给 LLM 做查询/冲突判断：
 * 🔴 标题 → 2026-05-22 15:00 [进行中] #资料收集
 */
export function formatTaskLine(t: FormatableTask): string {
  return [
    `${priorityEmoji(t.priority)} ${t.title}`,
    t.dueDate ? `→ ${dateStr(t.dueDate)}` : '',
    t.dueTime ? t.dueTime : '',
    t.status ? `[${STATUS_CN[t.status] || t.status}]` : '',
    t.category ? `#${t.category}` : '',
  ].filter(Boolean).join(' ');
}

/** 把任务列表格式化成多行文本 */
export function formatTaskList(tasks: FormatableTask[]): string {
  return tasks.map(formatTaskLine).join('\n');
}

/** 飞书风格的卡片式回复（多行 + emoji 前缀） */
export function formatTaskCard(t: FormatableTask): string {
  return [
    `✅ 已添加：${t.title}`,
    t.dueDate ? `📅 ${dateStr(t.dueDate)}` : '📋 待安排',
    t.dueTime ? `⏰ ${t.dueTime}` : '',
    t.location ? `📍 ${t.location}` : '',
    t.priority === 'high' ? '🔥 高优先级' : '',
  ].filter(Boolean).join('\n');
}
