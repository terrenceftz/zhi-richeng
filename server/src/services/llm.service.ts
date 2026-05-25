import OpenAI from 'openai';
import { config } from '../config';
import { getDeepSeekApiKey } from './settings.service';

let cachedClient: OpenAI | null = null;

async function getLLMClient(): Promise<OpenAI> {
  if (cachedClient) return cachedClient;
  const apiKey = await getDeepSeekApiKey();
  cachedClient = new OpenAI({
    apiKey: apiKey || config.deepseek.apiKey,
    baseURL: config.deepseek.baseURL,
    timeout: 15000,
  });
  return cachedClient;
}

function getTodayInfo(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const weekDay = ['日', '一', '二', '三', '四', '五', '六'][now.getDay()];
  return `${year}-${month}-${day} (星期${weekDay})`;
}

function buildParsePrompt(): string {
  return `你是一个日程解析助手。将用户的自然语言输入解析为结构化任务数据。

**当前日期：${getTodayInfo()}**

规则：
- 提取任务标题、日期、时间、优先级、任务类型
- 日期推算（基于上述当前日期）：
  - "今天/今" → 当前日期
  - "明天/明" → 当前日期 +1 天
  - "后天/后" → 当前日期 +2 天
  - "大后天" → 当前日期 +3 天
  - "昨天" → 当前日期 -1 天
  - "这周三/本周三/这周X/本周X" → 本周的星期X，已过的也是本周
  - "下周三/下周X" → 下周的星期X
  - "周三/周X"（无前缀）→ 如果该星期X在当前日期之后 → 本周；如果已过 → 下周
  - "下周"（无具体天）→ 下周一
  - "下个月/下月X号" → 下个月的第X天
  - 示例：当前日期是周五（2026-05-22），用户说"周三" → 下一个周三 = 2026-05-27
  - 示例：当前日期是周五，用户说"下周三" → 下周周三 = 2026-06-03
- 优先级关键词：高/紧急/high/urgent → high, 低/不急/low → low, 默认 medium
- 任务类型（category）识别：
  - 涉及"交/提交/上报/收集/材料/资料/申报" → "资料收集"
  - 涉及"审核/评审/审批/审查/公示" → "审核"
  - 涉及"开会/会议/讨论/汇报" → "会议"
  - 其他 → "通用"
- 如果没有明确时间，dueTime 为 null
- 如果没有明确日期，dueDate 为 null（待办任务）
- 提取地点信息：识别"在/地点/位置/地址/会议室/室/教室/餐厅/咖啡厅"等关键词后的地点，提取为 location 字段。没有明确地点时 location 为 null
- 提取邮件信息：
  - 识别"发送至/发送到/报送/发到/发至/邮箱/邮件"后的邮箱地址 → emailTo 字段（如 zztx@hqu.edu.cn）
  - 识别"邮件主题命名为/邮件标题为/主题为"后的内容 → emailSubject 字段
  - 将需要提交的材料/附件信息整理到 description 字段（如"电子版《xxx表》（附件6）"）
  - 没有邮件相关信息时 emailTo、emailSubject 为 null
- 时间格式：dueTime 为 HH:mm（24小时制），如 "下午3点" → "15:00"

请只返回 JSON，不要包含其他文字。`;
}

function buildExtractPrompt(): string {
  return `你是一个公文/通知解析助手。从以下文档内容中提取所有关键时间节点和截止日期。

**当前日期：${getTodayInfo()}**

规则：
- 提取每一项有明确截止日期或时间要求的事项
- 每个事项生成一条任务，包含：标题、日期、优先级、任务类型
- 标题应简洁且保留原文关键信息
- 日期推算：参考当前日期，处理文中的相对日期（规则同日程解析）
- 提取邮件信息：
  - 识别"发送至/发送到/报送/发到/发至/邮箱/邮件"后的邮箱地址 → emailTo 字段
  - 识别"邮件主题命名为/邮件标题为/主题为"后的内容 → emailSubject 字段
  - 将需要提交的材料/附件信息整理到 description 字段
  - 没有邮件相关时 emailTo、emailSubject 为 null
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
}

export interface ParsedTask {
  title: string;
  dueDate: string | null;
  dueTime: string | null;
  priority: 'high' | 'medium' | 'low';
  category: string;
  location?: string;
  emailTo?: string;
  emailSubject?: string;
  description?: string;
  tags: string[];
}

export async function parseTask(text: string): Promise<ParsedTask> {
  const client = await getLLMClient();

  const response = await client.chat.completions.create({
    model: config.deepseek.model,
    messages: [
      { role: 'system', content: buildParsePrompt() },
      { role: 'user', content: text },
    ],
    temperature: 0.1,
    max_tokens: 500,
  });

  const content = response.choices[0]?.message?.content || '{}';
  const cleaned = content.replace(/```json|```/g, '').trim();
  return JSON.parse(cleaned);
}

export async function decomposeTask(title: string, description?: string): Promise<string[]> {
  const client = await getLLMClient();

  const prompt = `你是一个任务管理助手。将以下任务拆解为3-5个可执行的子步骤。

任务标题：${title}
${description ? `任务描述：${description}` : ''}

规则：
- 每个子步骤应具体、可操作
- 按逻辑顺序排列
- 每个子步骤一句话，简洁明了

请只返回 JSON 数组，格式：["子步骤1", "子步骤2", ...]`;

  const response = await client.chat.completions.create({
    model: config.deepseek.model,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    max_tokens: 500,
  });

  const content = response.choices[0]?.message?.content || '[]';
  const cleaned = content.replace(/```json|```/g, '').trim();
  return JSON.parse(cleaned);
}

export async function queryTasks(question: string, todayTasks: string): Promise<string> {
  const client = await getLLMClient();

  const today = new Date().toISOString().slice(0, 10);

  const response = await client.chat.completions.create({
    model: config.deepseek.model,
    messages: [
      { role: 'system', content: `你是任务查询助手。当前日期${today}。根据任务列表直接回答用户问题。列出匹配的任务标题和日期。简洁回答。` },
      { role: 'user', content: `任务列表：\n${todayTasks}\n\n${question}` },
    ],
    temperature: 0.1,
    max_tokens: 400,
  });

  return response.choices[0]?.message?.content || '抱歉，无法回答该问题。';
}

export async function checkConflict(
  newTitle: string, newDate: string, newTime: string,
  existingTasks: { title: string; dueTime: string | null }[]
): Promise<string | null> {
  const client = await getLLMClient();

  if (existingTasks.length === 0) return null;

  const taskList = existingTasks.map((t) => `- ${t.title} (${t.dueTime || '全天'})`).join('\n');

  const prompt = `检查时间冲突：
新任务：${newTitle} (${newDate} ${newTime})
现有任务：
${taskList}

如果新任务与现有任务时间接近（30分钟内），用中文简要提醒（20字以内）。
如果没有冲突，回复"无冲突"。

直接输出文本。`;

  const response = await client.chat.completions.create({
    model: config.deepseek.model,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.1,
    max_tokens: 80,
  });

  const result = response.choices[0]?.message?.content || '无冲突';
  return result.includes('无冲突') ? null : result;
}

export async function extractTasks(text: string): Promise<{ tasks: ParsedTask[] }> {
  const client = await getLLMClient();

  const response = await client.chat.completions.create({
    model: config.deepseek.model,
    messages: [
      { role: 'system', content: buildExtractPrompt() },
      { role: 'user', content: text },
    ],
    temperature: 0.1,
    max_tokens: 2000,
  });

  const content = response.choices[0]?.message?.content || '{"tasks":[]}';
  const cleaned = content.replace(/```json|```/g, '').trim();
  return JSON.parse(cleaned);
}
