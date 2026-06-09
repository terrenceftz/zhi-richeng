import Card from './Card';

export default function AboutCard() {
  return (
    <Card>
      <h3 className="text-lg font-black mb-1">关于</h3>
      <p className="font-bold text-sm opacity-50">智日程 Phase 1 -- AI 驱动的智能日程管理</p>
      <div className="mt-3 text-xs font-bold opacity-50 space-y-1">
        <p>React 18 + Vite + TailwindCSS</p>
        <p>Express + Prisma + SQLite</p>
        <p>DeepSeek API 提供 AI 解析能力</p>
      </div>
    </Card>
  );
}
