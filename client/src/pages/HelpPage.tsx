import { Bot, BookOpenText, MessageCircleQuestion, Lightbulb, CalendarClock, HeartHandshake, Search, Newspaper, Link2 } from 'lucide-react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import { KirbyTitleIcon } from '../components/theme/KirbyDecorations';

interface Example {
  /** 用户输入（发给飞书机器人） */
  say: string;
  /** 系统响应/结果 */
  result: string;
}

interface Command {
  icon: React.ElementType;
  title: string;
  desc: string;
  tips?: string[];
  examples: Example[];
  tone: 'brand' | 'blue' | 'red' | 'amber' | 'green';
}

const commands: Command[] = [
  {
    icon: CalendarClock,
    title: '创建任务',
    desc: '用自然语言描述任务，AI 自动识别日期、时间、优先级、地点，创建到你的任务列表，并纳入日历与每日简报。',
    tone: 'brand',
    tips: ['支持"明天/下周三/下个月X号"等相对日期', '识别"在/会议室"等地点词与"下午3点"等时间词'],
    examples: [
      { say: '明天下午3点在A301开班会', result: '已添加：开班会（2026-08-07 15:00 · 高优先级 · 会议）' },
      { say: '下周三前提交学生资助材料', result: '已添加：提交学生资助材料（2026-08-12 · 资料收集）' },
      { say: '提醒我后天上午10点联系家长', result: '已添加：联系家长（2026-08-08 10:00）' },
    ],
  },
  {
    icon: Lightbulb,
    title: '记录灵感',
    desc: '以「灵感 / 想法 / idea / 记录」开头发消息，内容会保存到系统的「灵感」页面。',
    tone: 'amber',
    examples: [
      { say: '灵感：下周班会主题定为"防诈骗安全教育"', result: '💡 已记录灵感：下周班会主题定为...' },
      { say: '想法：给新生做一份报到流程清单', result: '💡 已记录灵感：给新生做一份报到流程清单' },
    ],
  },
  {
    icon: HeartHandshake,
    title: '台账跟进记录',
    desc: '给台账学生添加跟进记录，系统自动匹配学生、写入跟进档案并更新下次跟进日期。',
    tone: 'red',
    tips: ['同一页可连续追加多条', '多人重名时回复全名即可精确匹配', '已结案或非台账学生将自动建档'],
    examples: [
      { say: '台账跟进 张三：今天谈话情绪稳定多了', result: '✅ 已为「张三」记录跟进（2026-08-06）：今天谈话情绪稳定多了' },
      { say: '给李四添加台账跟进：家长已联系，建议心理咨询', result: '✅ 已为「李四」记录跟进：家长已联系，建议心理咨询' },
      { say: '记录王五的心理跟进：成绩有所回升', result: '✅ 已为「王五」记录跟进：成绩有所回升' },
    ],
  },
  {
    icon: Search,
    title: '学生查询',
    desc: '查询学生信息（姓名 / 班级 / 学号），或直接列出心理台账学生名单。',
    tone: 'blue',
    examples: [
      { say: '查一下张晨睿', result: '📋 张晨睿 · 2022级法学4班 · 境内生 · 电话：138xxxx · 台账：是（一级）' },
      { say: '台账学生列表', result: '📋 心理台账学生（25 人）：张晨睿（一级）、...' },
      { say: '2024级法学1班有哪些学生', result: '📋 2024级法学1班（32 人）：...' },
    ],
  },
  {
    icon: Newspaper,
    title: '每日简报（自动推送）',
    desc: '每天早晨自动推送今日任务简报：待办、截止提醒与逾期任务，无需手动触发。',
    tone: 'green',
    tips: ['推送时间与开关可在「设置 → 提醒设置」中调整', '到点会自动发送，不回复也能收到'],
    examples: [
      { say: '（无需输入，每日自动）', result: '☀️ 今日日程简报\n📋 今日待办（3）：开班会 15:00、联系家长 10:00...' },
    ],
  },
];

export default function HelpPage() {
  return (
    <div>
      <h2 className="mb-1 flex items-center gap-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
        <KirbyTitleIcon icon={BookOpenText} sticker="kirbyHi" className="text-brand-500" />
        使用指南 · 飞书互动
      </h2>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
        在飞书里给机器人发消息，即可用自然语言完成常用操作
      </p>

      {/* 快速开始 */}
      <Card className="mb-5 border-brand-200 dark:border-brand-500/30">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
            <Link2 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">快速开始：绑定飞书账号</h3>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-600 dark:text-slate-300">
              <li>打开「设置 → 飞书互联」，复制你的飞书 OpenID</li>
              <li>填入 OpenID 并点击绑定（或直接给机器人发任意消息获取绑定引导）</li>
              <li>绑定成功后，直接和机器人聊天即可使用下方全部能力</li>
            </ol>
          </div>
        </div>
      </Card>

      {/* 指令列表 */}
      <div className="space-y-5">
        {commands.map((cmd) => {
          const Icon = cmd.icon;
          return (
            <Card key={cmd.title}>
              <div className="mb-3 flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{cmd.title}</h3>
                  <Badge tone={cmd.tone}>可用</Badge>
                </div>
              </div>
              <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">{cmd.desc}</p>

              {cmd.tips && cmd.tips.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {cmd.tips.map((t) => (
                    <span key={t} className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                      💡 {t}
                    </span>
                  ))}
                </div>
              )}

              <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
                {cmd.examples.map((ex, i) => (
                  <div
                    key={i}
                    className={`flex flex-col gap-1 px-3 py-2.5 sm:flex-row sm:items-center sm:gap-3 ${
                      i > 0 ? 'border-t border-slate-200 dark:border-slate-800' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2 sm:w-1/2">
                      <MessageCircleQuestion className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <code className="text-xs leading-relaxed text-slate-700 dark:text-slate-200">{ex.say}</code>
                    </div>
                    <div className="flex items-center gap-2 sm:w-1/2">
                      <span className="text-slate-300 dark:text-slate-600">→</span>
                      <span className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">{ex.result}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>

      {/* 兜底说明 */}
      <Card className="mt-5">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            <Bot className="h-5 w-5" />
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            <span className="font-medium text-slate-800 dark:text-slate-100">其他消息怎么办？</span>
            <br />
            未命中以上指令的普通消息会当作<span className="font-medium">任务</span>处理——飞书机器人的默认能力就是帮你创建日程。不知道说什么时，直接描述你要做的事即可。
          </p>
        </div>
      </Card>
    </div>
  );
}
