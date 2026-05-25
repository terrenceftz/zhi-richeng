import * as Lark from '@larksuiteoapi/node-sdk';
import prisma from '../db';
import * as settingsService from './settings.service';
import * as tasksService from './tasks.service';
import * as llmService from './llm.service';


let wsClient: Lark.WSClient | null = null;
let connected = false;

export function isFeishuConnected(): boolean {
  return connected;
}

async function getFeishuClient(): Promise<Lark.Client | null> {
  const settings = await settingsService.getAllSettings();
  const appId = settings.feishu_app_id || process.env.FEISHU_APP_ID || '';
  const appSecret = settings.feishu_app_secret || process.env.FEISHU_APP_SECRET || '';
  if (!appId || !appSecret) return null;
  return new Lark.Client({ appId, appSecret, disableTokenCache: false });
}

// Create a Feishu native task with reminder
export async function createFeishuTaskReminder(
  userId: string,
  taskTitle: string,
  dueDate: Date,
  dueTime: string,
  location?: string
): Promise<void> {
  try {
    const client = await getFeishuClient();
    if (!client) return;

    const openId = await settingsService.getSetting(`feishu_openid_${userId}`);
    if (!openId) return;

    const [h, m] = dueTime.split(':').map(Number);
    const due = new Date(dueDate);
    due.setHours(h, m, 0, 0);

    const summary = `📌 ${taskTitle}`;
    const description = [
      `🕐 ${dueTime}`,
      location ? `📍 ${location}` : '',
    ].filter(Boolean).join('\n');

    await client.task.v2.task.create({
      data: {
        summary,
        description,
        due: { timestamp: String(due.getTime()) },
        reminders: [{ relative_fire_minute: 0 }],
        members: [{ id: openId, type: 'user' as const, role: 'assignee' as const }],
      },
    });

    console.log(`[飞书] 原生提醒已创建: ${taskTitle} (${dueTime})`);
  } catch (err) {
    console.error('[飞书] 创建原生提醒失败:', err);
  }
}

export async function startFeishuClient(): Promise<void> {
  try {
    const settings = await settingsService.getAllSettings();
    const appId = settings.feishu_app_id || process.env.FEISHU_APP_ID || '';
    const appSecret = settings.feishu_app_secret || process.env.FEISHU_APP_SECRET || '';

    if (!appId || !appSecret) {
      console.log('[飞书] 未配置 App ID / Secret，跳过启动');
      return;
    }

    // Build a client for sending replies
    const client = new Lark.Client({
      appId,
      appSecret,
      disableTokenCache: false,
    });

    wsClient = new Lark.WSClient({
      appId,
      appSecret,
      loggerLevel: Lark.LoggerLevel.info,
    });

    const dispatcher = new Lark.EventDispatcher({})
      .register({
        'im.message.receive_v1': async (event: any) => {
          try {
            console.log('[飞书] 收到消息事件:', JSON.stringify(event, null, 2).slice(0, 500));

            // Try multiple event structure paths
            const msg = event?.event?.message || event?.message;
            const from = event?.event?.sender || event?.sender;
            if (!msg || !from) {
              console.log('[飞书] 事件结构不匹配，完整事件:', JSON.stringify(event));
              return;
            }

            const senderId = from.sender_id?.open_id;
            const chatId = msg.chat_id;
            const msgContent = msg.content;

            if (!senderId || !chatId || !msgContent) {
              console.log('[飞书] 缺少字段:', { senderId, chatId, msgContent: !!msgContent });
              return;
            }

            // Extract text from Feishu message content (JSON string)
            let text = '';
            try {
              const content = typeof msgContent === 'string' ? JSON.parse(msgContent) : msgContent;
              text = content.text || '';
            } catch {
              text = String(msgContent);
            }

            if (!text.trim()) return;

            // Find user by Feishu open_id
            const users = await prisma.user.findMany();
            let targetUserId: string | null = null;
            for (const user of users) {
              const fsId = await settingsService.getSetting(`feishu_openid_${user.id}`);
              if (fsId === senderId) { targetUserId = user.id; break; }
            }

            if (!targetUserId) {
              await sendReply(client, chatId, `请先在智日程设置页中绑定你的飞书账号。\n\n你的 OpenID 是：\n${senderId}\n\n复制上面的 OpenID，到设置页「飞书互联」中填入并点击绑定。`);
              return;
            }

            // Check if this is an inspiration/idea
            const isIdea = /^(灵感|想法|idea|记录|💡)/i.test(text.trim());
            if (isIdea) {
              const cleanText = text.replace(/^(灵感|想法|idea|记录|💡)\s*/i, '').trim() || text.trim();
              await prisma.idea.create({
                data: { userId: targetUserId, content: cleanText.slice(0, 500), source: 'feishu' },
              });
              await sendReply(client, chatId, `💡 已记录灵感：${cleanText.slice(0, 50)}${cleanText.length > 50 ? '...' : ''}`);
              return;
            }

            // NLP parse + create task
            let parsed: llmService.ParsedTask;
            try {
              parsed = await llmService.parseTask(text);
            } catch {
              parsed = { title: text.slice(0, 100), dueDate: null, dueTime: null, priority: 'medium', category: '通用', tags: [] };
            }

            const task = await tasksService.createTask(targetUserId, {
              title: parsed.title || text.slice(0, 100),
              location: parsed.location,
              priority: parsed.priority,
              category: parsed.category || '通用',
              dueDate: parsed.dueDate || undefined,
              dueTime: parsed.dueTime || undefined,
              tags: parsed.tags || [],
            });

            const dateStr = task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : null;
            const reply = [
              `✅ 已添加：${task.title}`,
              dateStr ? `📅 ${dateStr}` : '📋 待安排',
              task.dueTime ? `⏰ ${task.dueTime}` : '',
              task.location ? `📍 ${task.location}` : '',
              task.priority === 'high' ? '🔥 高优先级' : '',
            ].filter(Boolean).join('\n');

            await sendReply(client, chatId, reply);
          } catch (err) {
            console.error('[飞书] 消息处理错误:', err);
          }
        },
      });

    // Catch-all for events not matching registered types
    dispatcher.register({
      '': (data: any) => {
        console.log('[飞书] 未注册事件:', JSON.stringify(data).slice(0, 400));
      },
    });

    wsClient.start({ eventDispatcher: dispatcher });

    connected = true;
    console.log('[飞书] WebSocket 已连接，等待消息...');
  } catch (err) {
    console.error('[飞书] 连接失败:', err);
    connected = false;
  }
}

export async function sendReminder(openId: string, text: string): Promise<void> {
  const settings = await settingsService.getAllSettings();
  const appId = settings.feishu_app_id || process.env.FEISHU_APP_ID || '';
  const appSecret = settings.feishu_app_secret || process.env.FEISHU_APP_SECRET || '';

  if (!appId || !appSecret) return;

  const client = new Lark.Client({ appId, appSecret, disableTokenCache: false });

  try {
    await client.im.v1.message.create({
      params: { receive_id_type: 'open_id' },
      data: {
        receive_id: openId,
        msg_type: 'text',
        content: JSON.stringify({ text }),
      },
    });
    console.log('[飞书] 提醒发送成功:', text.slice(0, 60));
  } catch (err) {
    console.error('[飞书] 提醒发送失败:', err);
  }
}

async function sendReply(client: Lark.Client, chatId: string, text: string) {
  try {
    console.log('[飞书] 发送回复:', { chatId, text: text.slice(0, 50) });
    const res = await client.im.v1.message.create({
      params: { receive_id_type: 'chat_id' },
      data: {
        receive_id: chatId,
        msg_type: 'text',
        content: JSON.stringify({ text }),
      },
    });
    console.log('[飞书] 回复成功:', res?.data?.message_id || 'ok');
  } catch (err) {
    console.error('[飞书] 回复失败:', err);
  }
}
