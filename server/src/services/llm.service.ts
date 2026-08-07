import OpenAI from 'openai';
import { config } from '../config';
import { getDeepSeekApiKey } from './settings.service';

let cachedClient: OpenAI | null = null;
let cachedApiKey: string | null = null;

async function getLLMClient(): Promise<OpenAI> {
  const apiKey = await getDeepSeekApiKey();
  const effectiveKey = apiKey || config.deepseek.apiKey;

  // Invalidate cache if API key changed (e.g. user updated via settings)
  if (cachedClient && cachedApiKey !== effectiveKey) {
    cachedClient = null;
  }

  if (!cachedClient) {
    cachedApiKey = effectiveKey;
    cachedClient = new OpenAI({
      apiKey: effectiveKey,
      baseURL: config.deepseek.baseURL,
      timeout: 15000,
    });
  }
  return cachedClient;
}

export function clearLLMCache(): void {
  cachedClient = null;
  cachedApiKey = null;
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
  - 识别"发送至/发送到/报送/发到/发至/邮箱/邮件"后的邮箱地址 → emailTo 字段（如 example@university.edu.cn）
  - 识别"邮件主题命名为/邮件标题为/主题为"后的内容 → emailSubject 字段
  - 将需要提交的材料/附件信息整理到 description 字段（如"电子版《xxx表》（附件6）"）
  - 没有邮件相关信息时 emailTo、emailSubject 为 null
- 时间格式：dueTime 为 HH:mm（24小时制），如 "下午3点" → "15:00"

请只返回 JSON，不要包含其他文字。`;
}

function buildExtractPrompt(): string {
  return `你是公文解析专家。从文档中提取所有有时间要求的待办事项。

**当前日期：${getTodayInfo()}**

关键规则：
- 逐段扫描，任何带日期的动作都要提取为独立任务
- 标题必须包含动作+对象，如"学院网上审核"、"纸质材料报送至学生资助中心"、"提交电子版材料"
- 日期推算：今年未指定年份的日期，根据上下文推断；如当前为2026年，"6月8日"→"2026-06-08"
- 日期范围如"6月8日-6月12日"→取起始日6月8日
- 邮件提取：发送至/报送至后的邮箱→emailTo，"主题命名为"后的内容→emailSubject，材料清单→description
- category：交/提交/报送/申报→"资料收集"，审核/审批/审查→"审核"，会议/开会→"会议"，其他→"通用"
- priority：截止/务必/紧急→high，默认→medium
- 即使只有1条也要提取，绝不返回空数组
- 即使文本中没有明确的"截止日期"字样，只要有日期和时间相关的动作描述，也要提取

输出格式（必须严格返回如下JSON对象，不要只返回数组）：
{"tasks":[{"title":"...","dueDate":"YYYY-MM-DD","dueTime":null,"priority":"medium","category":"资料收集","emailTo":null,"emailSubject":null,"description":null,"location":null}]}`;
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

export async function classifyIntent(text: string): Promise<'schedule' | 'query' | 'chat'> {
  // Fast heuristic check first
  const chatPatterns = /(你帮|帮我做|帮我写|怎么样|如何做|什么意思|怎么用|你是谁|你能做什么)/;
  const schedulePatterns = /(明天|后天|今天|下个?周|下个月|周一|周二|周三|周四|周五|周六|周日|提醒我|日程|添加任务|安排|开会|提交|截止|在.*点|下午|上午|晚上)/;
  const queryPatterns = /(有哪些|多少|查询|查一下|这周|本周|最近|统计|找一下|帮我查|帮我找|帮我看看|还有哪些|所有|哪些|怎么|如何|什么|几个)/;

  if (chatPatterns.test(text)) return 'chat';

  if (schedulePatterns.test(text) && !queryPatterns.test(text)) return 'schedule';
  if (queryPatterns.test(text) && !schedulePatterns.test(text)) return 'query';

  const apiKey = await getDeepSeekApiKey();
  if (!apiKey) return schedulePatterns.test(text) ? 'schedule' : 'chat';

  const client = await getLLMClient();

  const response = await client.chat.completions.create({
    model: config.deepseek.model,
    messages: [
      { role: 'system', content: '你是一个意图分类器。分析用户输入，只回复一个单词：\n- 如果用户想添加、创建、安排日程/待办/任务/提醒 → 回复 schedule\n- 如果用户在询问、查询、搜索任务列表 → 回复 query\n- 其他闲聊、问候、感谢等 → 回复 chat\n\n只回复一个单词，不要解释。' },
      { role: 'user', content: text },
    ],
    temperature: 0,
    max_tokens: 10,
  });

  const result = (response.choices[0]?.message?.content || '').trim().toLowerCase();
  const word = result.split(/\s/)[0];
  if (word === 'schedule') return 'schedule';
  if (word === 'query') return 'query';
  if (result.includes('schedule')) return 'schedule';
  if (result.includes('query')) return 'query';
  return 'chat';
}

export async function chat(text: string): Promise<string> {
  const apiKey = await getDeepSeekApiKey();
  if (!apiKey) return '你好！我是智日程助手，可以帮你添加日程、查询任务。试试说"明天下午3点开会"吧！';

  const client = await getLLMClient();

  const response = await client.chat.completions.create({
    model: config.deepseek.model,
    messages: [
      { role: 'system', content: '你是智日程AI助手，帮助用户管理日程。回答简洁友好（80字以内）。' },
      { role: 'user', content: text },
    ],
    temperature: 0.5,
    max_tokens: 200,
  });

  return response.choices[0]?.message?.content || '有什么我可以帮你的吗？';
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
    max_tokens: 3000,
  });

  const content = response.choices[0]?.message?.content || '{"tasks":[]}';
  const cleaned = content.replace(/```json|```/g, '').trim();

  let parsed = JSON.parse(cleaned);

  // Handle LLM returning a bare array instead of {"tasks":[...]}
  if (Array.isArray(parsed)) {
    parsed = { tasks: parsed };
  }

  if (!parsed.tasks || !Array.isArray(parsed.tasks)) {
    parsed = { tasks: [] };
  }

  return parsed;
}

/** 判断用户输入是否为「学生查询」意图（查学生信息/台账） */
export async function isStudentQueryIntent(text: string): Promise<boolean> {
  // 快速正则：含学生查询关键词
  if (/(学生|台账|心理|查一下|查询|信息|多少个学生|班级.*学生|学号|联系方式)/.test(text)) {
    return true;
  }
  return false;
}

/** 从跟进记录语句中提取结构化信息：学生姓名/学号 + 跟进内容 + 日期（可选） */
export async function extractFollowUp(text: string): Promise<{ studentName: string; content: string; date?: string } | null> {
  const apiKey = await getDeepSeekApiKey();
  if (!apiKey) return null;
  const today = new Date().toISOString().slice(0, 10);
  try {
    const client = new OpenAI({ apiKey, baseURL: config.deepseek.baseURL, timeout: 10000 });
    const response = await client.chat.completions.create({
      model: config.deepseek.model,
      messages: [
        {
          role: 'system',
          content: `当前日期 ${today}。从用户的「心理台账跟进记录」语句中提取：
1. studentName：被跟进的学生姓名或学号（必填）
2. content：跟进内容（简洁概括，去除"跟进"等引导词）
3. date：跟进日期（若提到"昨天/前天/某月某日"则给出 YYYY-MM-DD，未提则为空）
只返回严格 JSON：{"studentName":"","content":"","date":""}`,
        },
        { role: 'user', content: text },
      ],
      temperature: 0,
      max_tokens: 200,
    });
    const raw = (response.choices[0]?.message?.content || '').replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(raw);
    if (parsed.studentName && parsed.content) {
      return {
        studentName: String(parsed.studentName).trim(),
        content: String(parsed.content).trim(),
        date: parsed.date ? String(parsed.date).trim() : undefined,
      };
    }
  } catch {
    /* 解析失败返回 null */
  }
  return null;
}

/** 从学生查询语句中提取搜索关键词（姓名/班级/学号） */
export async function extractStudentQueryKeyword(text: string): Promise<string | null> {
  // 去掉常见前缀动词（多字前缀在前，避免「查一下张三」残留「一下」）
  const cleaned = text
    .replace(/^(我想查|帮我查|查一查|查一下|查查|查询|查找|查看|搜一下|搜索|搜|看看|找一下|了解)\s*/g, '')
    .replace(/(的信息|的资料|的情况|的联系方式|的台账|详细信息|信息)\s*$/g, '')
    .replace(/^(学生|同学)\s*/g, '')
    .trim();
  if (!cleaned) return null;
  // 如果句子太长（>20字），用 LLM 提取；否则直接返回
  if (cleaned.length <= 20) return cleaned;

  const apiKey = await getDeepSeekApiKey();
  const effectiveKey = apiKey || config.deepseek.apiKey;
  if (!effectiveKey) return cleaned.slice(0, 20);

  try {
    const client = new OpenAI({ apiKey: effectiveKey, baseURL: config.deepseek.baseURL, timeout: 10000 });
    const response = await client.chat.completions.create({
      model: config.deepseek.model,
      messages: [
        { role: 'system', content: '从用户语句中提取要查询的学生姓名、班级或学号关键词。只返回关键词本身，不要其他文字。' },
        { role: 'user', content: text },
      ],
      temperature: 0,
      max_tokens: 30,
    });
    const result = (response.choices[0]?.message?.content || '').trim();
    return result || cleaned.slice(0, 20);
  } catch {
    return cleaned.slice(0, 20);
  }
}
export async function extractNotice(text: string): Promise<{
  title: string;
  source: string | null;
  deadline: string | null;
  materials: { name: string; required: boolean }[];
}> {
  const apiKey = await getDeepSeekApiKey();
  const effectiveKey = apiKey || config.deepseek.apiKey;
  if (!effectiveKey) {
    throw Object.assign(new Error('未配置 DeepSeek API Key，无法使用 AI 解析'), { statusCode: 400 });
  }
  const client = new OpenAI({ apiKey: effectiveKey, baseURL: config.deepseek.baseURL, timeout: 20000 });

  const today = new Date().toISOString().slice(0, 10);

  const response = await client.chat.completions.create({
    model: config.deepseek.model,
    messages: [
      {
        role: 'system',
        content: `你是公文解析助手。当前日期 ${today}。从用户提供的通知文本中提取结构化信息。
返回严格 JSON，格式：
{"title":"通知标题（含动作）","source":"发布单位（如无则 null）","deadline":"截止日期 YYYY-MM-DD（如无明确截止则 null）","materials":[{"name":"材料名称","required":true}]}
规则：title 必填；materials 是需要上报/提交的材料清单，没有则为空数组。只返回 JSON。`,
      },
      { role: 'user', content: text },
    ],
    temperature: 0.1,
    max_tokens: 800,
  });

  const content = response.choices[0]?.message?.content || '{}';
  const cleaned = content.replace(/```json|```/g, '').trim();
  const parsed = JSON.parse(cleaned);
  if (!parsed.title) throw new Error('未能解析出通知标题');
  return {
    title: String(parsed.title),
    source: parsed.source ? String(parsed.source) : null,
    deadline: parsed.deadline || null,
    materials: Array.isArray(parsed.materials)
      ? parsed.materials.map((m: any) => ({ name: String(m.name || ''), required: !!m.required }))
      : [],
  };
}

/** 生成台账学生下一步跟进建议（AI 台账智囊） */
export async function mentalAdvice(profile: string, records: string): Promise<string> {
  const apiKey = await getDeepSeekApiKey();
  const effectiveKey = apiKey || config.deepseek.apiKey;
  if (!effectiveKey) {
    throw Object.assign(new Error('未配置 DeepSeek API Key，无法生成建议'), { statusCode: 400 });
  }
  const client = new OpenAI({ apiKey: effectiveKey, baseURL: config.deepseek.baseURL, timeout: 20000 });
  const response = await client.chat.completions.create({
    model: config.deepseek.model,
    messages: [
      {
        role: 'system',
        content:
          '你是高校辅导员的学生心理关怀助手。根据台账学生档案和历史跟进记录，生成下一步跟进建议（3-5 条）。' +
          '要求：具体可操作、体现人文关怀与隐私保护、结合该生的关注级别和类别给出差异化建议；' +
          '不要空话套话；分条列出，每条一句话到两句话。',
      },
      { role: 'user', content: `【学生档案】\n${profile}\n\n【历史跟进记录】\n${records}` },
    ],
    temperature: 0.4,
    max_tokens: 700,
  });
  return response.choices[0]?.message?.content?.trim() || '暂无可生成的建议';
}

/** 生成数据看板智能解读（AI 周报/月报） */
export async function statsInsight(summary: string): Promise<string> {
  const apiKey = await getDeepSeekApiKey();
  const effectiveKey = apiKey || config.deepseek.apiKey;
  if (!effectiveKey) {
    throw Object.assign(new Error('未配置 DeepSeek API Key，无法生成解读'), { statusCode: 400 });
  }
  const client = new OpenAI({ apiKey: effectiveKey, baseURL: config.deepseek.baseURL, timeout: 20000 });
  const response = await client.chat.completions.create({
    model: config.deepseek.model,
    messages: [
      {
        role: 'system',
        content:
          '你是高校辅导员工作数据解读助手。根据系统统计数据，生成一份 150 字以内的中文工作解读。' +
          '结构：1) 整体概况（一句话）2) 需要关注的风险点 3) 建议优先处理的动作。' +
          '语言平实、面向辅导员工作实际，不要重复罗列所有数字，只提炼重点。',
      },
      { role: 'user', content: `统计数据：\n${summary}` },
    ],
    temperature: 0.4,
    max_tokens: 500,
  });
  return response.choices[0]?.message?.content?.trim() || '暂无可生成的解读';
}
