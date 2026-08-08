import prisma from '../db';
import * as settingsService from './settings.service';
import { sendReminder } from './feishu.service';
import OpenAI from 'openai';
import { config } from '../config';
import { getDeepSeekApiKey } from './settings.service';

const CHECK_INTERVAL = 60_000;
const DEFAULT_HOUR = 8;
let intervalId: ReturnType<typeof setInterval> | null = null;

export function startDigestService(): void {
  if (intervalId) return;
  console.log('[摘要] 已启动');
  checkAndDigest();
  intervalId = setInterval(checkAndDigest, CHECK_INTERVAL);
}

export function stopDigestService(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

async function checkAndDigest(): Promise<void> {
  try {
    const allSettings = await settingsService.getAllSettings();
    const digestHour = parseInt(allSettings.digest_hour || String(DEFAULT_HOUR));
    const digestEnabled = allSettings.digest_enabled !== 'false';
    const digestAi = allSettings.digest_ai !== 'false';

    if (!digestEnabled) return;

    const now = new Date();
    // 未到推送时刻不处理；到达 digestHour 之后任意时刻均可触发（当天补发一次，避免服务在
    // 窗口外启动导致简报永久漏发）。补发通过下方 reminderLog「当天未发过」去重保证一天一次。
    if (now.getHours() < digestHour) return;

    // 使用本地时区的日期（toISOString 是 UTC，跨零点时会差一天）
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
    const today = local.toISOString().slice(0, 10);
    const users = await prisma.user.findMany();

    for (const user of users) {
      // 持久化去重：当天已发则跳过（重启不会重复/漏发）
      const already = await prisma.reminderLog.findUnique({
        where: { taskId_key: { taskId: user.id, key: `digest_${today}` } },
      });
      if (already) continue;

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

      // 逾期任务：截止时间已过且未完成
      const overdueTasks = await prisma.task.findMany({
        where: {
          userId: user.id,
          status: { not: 'done' },
          dueDate: { lt: new Date(today) },
        },
        orderBy: [{ dueDate: 'asc' }],
        take: 10,
      });

      if (tasks.length === 0 && overdueTasks.length === 0) continue;

      // 简报内容：开启 AI 时用大模型生成（无 Key 自动回退简单版），关闭时直接用简单版
      const summary = digestAi ? await generateSummary(tasks, today) : buildSimpleSummary(tasks, today);
      const overdueSection = overdueTasks.length > 0
        ? `\n\n🔴 逾期任务（${overdueTasks.length}）\n${overdueTasks.map((t) =>
            `  ⚠️ ${t.title}${t.dueDate ? `（截止 ${new Date(t.dueDate).toISOString().slice(0, 10)}）` : ''}`
          ).join('\n')}\n请尽快处理！`
        : '';
      const msg = `☀️ 今日日程简报\n\n${summary}${overdueSection}`;

      // 发送成功才写去重记录；失败保留补发机会（下次轮询重试）
      const ok = await sendReminder(openId, msg);
      if (ok) {
        try {
          await prisma.reminderLog.create({ data: { taskId: user.id, key: `digest_${today}` } });
        } catch {
          // 唯一约束冲突 = 已记录，忽略
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

/** Date 转本地时区 YYYY-MM-DD（任务 dueDate 为 Date，直接 slice 会得到 undefined） */
function localDateStr(d: Date | null | undefined): string {
  if (!d) return '';
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function buildSimpleSummary(tasks: any[], _today: string): string {
  const high = tasks.filter((t) => t.priority === 'high').length;
  const todayTasks = tasks.filter((t) => localDateStr(t.dueDate) === _today);

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
