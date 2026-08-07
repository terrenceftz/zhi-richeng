import Card from './Card';

export default function AboutCard() {
  return (
    <Card title="关于" subtitle="智日程 — 辅导员智能工作台">
      <div className="space-y-1 text-xs text-slate-500 dark:text-slate-400">
        <p>React 19 + Vite + TailwindCSS</p>
        <p>Express + Prisma + SQLite</p>
        <p>DeepSeek API 提供 AI 解析能力</p>
      </div>
    </Card>
  );
}
