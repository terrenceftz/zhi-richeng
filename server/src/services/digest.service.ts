import prisma from '../db';
import * as settingsService from './settings.service';
import { sendReminder } from './feishu.service';
import OpenAI from 'openai';
import { config } from '../config';
import { getDeepSeekApiKey } from './settings.service';

const CHECK_INTERVAL = 60_000;
const DEFAULT_HOUR = 8;
let intervalId: ReturnType<typeof setInterval> | null = null;
const sentToday = new Set<string>(); // "userId_date" to avoid duplicate

export function startDigestService(): void {
  if (intervalId) return;
  console.log('[摘要] 已启动');
  checkAndDigest();
  intervalId = setInterval(checkAndDigest, CHECK_INTERVAL);
}

async function checkAndDigest(): Promise<void> {
  try {
    const allSettings = await settingsService.getAllSettings();
    const digestHour = parseInt(allSettings.digest_hour || String(DEFAULT_HOUR));
    const digestEnabled = allSettings.digest_enabled !== 'false';

    if (!digestEnabled) return;

    const now = new Date();
    if (now.getHours() !== digestHour || now.getMinutes() > 1) return;

    const today = now.toISOString().slice(0, 10);
    const users = await prisma.user.findMany();

    for (const user of users) {
      const key = `${user.id}_${today}`;
      if (sentToday.has(key)) continue;

      const openId = await settingsService.getSetting(`feishu_openid_${user.id}`);
      if (!openId) continue;

      const tasks = await prisma.task.findMany({
        where: {
          userId: user.id,
          status: { not: 'done' },
          OR: [
            { dueDate: { gte: new Date(today) } },
            { dueDate: null },
          ],
        },
        orderBy: [{ priority: 'asc' }, { dueTime: 'asc' }],
        take: 20,
      });

      if (tasks.length === 0) continue;

      // Generate summary
      const summary = await generateSummary(tasks, today);
      const msg = `☀️ 今日日程简报\n\n${summary}`;

      await sendReminder(openId, msg);
      sentToday.add(key);

      // Clean old keys (remove entries older than 3 days)
      if (sentToday.size > 500) {
        const cutoff = new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10);
        for (const k of sentToday) {
          const datePart = k.split('_').pop();
          if (datePart && datePart < cutoff) sentToday.delete(k);
        }
      }
    }
  } catch (err) {
    console.error('[摘要] 错误:', err);
  }
}

async function generateSummary(tasks: any[], today: string): Promise<string> {
  try {
    const apiKey = await getDeepSeekApiKey();
    if (!apiKey) return buildSimpleSummary(tasks, today);

    const client = new OpenAI({ apiKey, baseURL: config.deepseek.baseURL });

    const taskList = tasks.map((t) =>
      `${t.priority === 'high' ? '🔴' : t.priority === 'medium' ? '🟡' : '🟢'} ${t.title}` +
      `${t.dueTime ? ` (${t.dueTime})` : ''}${t.dueDate ? ` [${new Date(t.dueDate).toISOString().slice(0, 10)}]` : ' [待安排]'}`
    ).join('\n');

    const prompt = `今天是${today}。以下是用户今天的任务列表：

${taskList}

请用中文生成一段简洁的今日简报（100字以内），包括：
1. 任务总数和高优先级数量
2. 按时间排的关键事项（前3个）
3. 一句建议（如"上午任务较多，建议优先处理高优事项"）

直接输出文本，不要JSON。`;

    const response = await client.chat.completions.create({
      model: config.deepseek.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 300,
    });

    return response.choices[0]?.message?.content || buildSimpleSummary(tasks, today);
  } catch {
    return buildSimpleSummary(tasks, today);
  }
}

function buildSimpleSummary(tasks: any[], _today: string): string {
  const high = tasks.filter((t) => t.priority === 'high').length;
  const todayTasks = tasks.filter((t) => t.dueDate?.slice(0, 10) === _today);

  const lines = [
    `📊 共 ${tasks.length} 个任务，其中 ${high} 个高优先级`,
    todayTasks.length > 0 ? `📅 今日 ${todayTasks.length} 个事项：` : '',
    ...todayTasks.slice(0, 5).map((t) =>
      `  ${t.priority === 'high' ? '🔥' : '·'} ${t.title}${t.dueTime ? ` ${t.dueTime}` : ''}`
    ),
    tasks.filter((t) => !t.dueDate).length > 0
      ? `📋 ${tasks.filter((t) => !t.dueDate).length} 个待安排任务`
      : '',
  ];
  return lines.filter(Boolean).join('\n');
}
