import OpenAI from 'openai';
import { config } from '../config';

const client = new OpenAI({
  apiKey: config.deepseek.apiKey,
  baseURL: config.deepseek.baseURL,
});

const PARSE_TASK_SYSTEM_PROMPT = `你是一个日程解析助手。将用户的自然语言输入解析为结构化任务数据。

规则：
- 提取任务标题、日期、时间、优先级、任务类型
- 识别相对日期（"明天"、"下周一"、"后天"）转为 YYYY-MM-DD（当前日期参考系统时间）
- 优先级关键词：高/紧急/high → high, 低/不急/low → low, 默认 medium
- 任务类型（category）识别：
  - 涉及"交/提交/上报/收集/材料/资料/申报" → "资料收集"
  - 涉及"审核/评审/审批/审查/公示" → "审核"
  - 涉及"开会/会议/讨论/汇报" → "会议"
  - 其他 → "通用"
- 如果没有明确时间，dueTime 为 null
- 如果没有明确日期，dueDate 为 null（待办任务）

请只返回 JSON，不要包含其他文字。`;

const EXTRACT_TASKS_SYSTEM_PROMPT = `你是一个公文/通知解析助手。从以下文档内容中提取所有关键时间节点和截止日期。

规则：
- 提取每一项有明确截止日期或时间要求的事项
- 每个事项生成一条任务，包含：标题、日期、优先级、任务类型
- 标题应简洁且保留原文关键信息
- 任务类型（category）识别：
  - 涉及"交/提交/上报/收集/材料/资料/申报/填报" → "资料收集"
  - 涉及"审核/评审/审批/审查/公示/复核/检查" → "审核"
  - 涉及"开会/会议/讨论/汇报" → "会议"
  - 其他 → "通用"
- 优先级判断：
  - "截止/必须/务必/逾期" → high
  - "建议/可以/推荐" → low
  - 默认 → medium
- 如果文档中没有明显截止日期的事项，返回空数组

请只返回 JSON，不要包含其他文字。`;

export interface ParsedTask {
  title: string;
  dueDate: string | null;
  dueTime: string | null;
  priority: 'high' | 'medium' | 'low';
  category: string;
  tags: string[];
}

export async function parseTask(text: string): Promise<ParsedTask> {
  const response = await client.chat.completions.create({
    model: config.deepseek.model,
    messages: [
      { role: 'system', content: PARSE_TASK_SYSTEM_PROMPT },
      { role: 'user', content: text },
    ],
    temperature: 0.1,
    max_tokens: 500,
  });

  const content = response.choices[0]?.message?.content || '{}';
  const cleaned = content.replace(/```json|```/g, '').trim();
  return JSON.parse(cleaned);
}

export async function extractTasks(text: string): Promise<{ tasks: ParsedTask[] }> {
  const response = await client.chat.completions.create({
    model: config.deepseek.model,
    messages: [
      { role: 'system', content: EXTRACT_TASKS_SYSTEM_PROMPT },
      { role: 'user', content: text },
    ],
    temperature: 0.1,
    max_tokens: 2000,
  });

  const content = response.choices[0]?.message?.content || '{"tasks":[]}';
  const cleaned = content.replace(/```json|```/g, '').trim();
  return JSON.parse(cleaned);
}
