import { useEffect, useState } from 'react';
import { BarChart3, Heart, MessageSquareText, ClipboardList, AlertTriangle, BellRing, GraduationCap, Sparkles } from 'lucide-react';
import * as statsApi from '../api/stats';
import type { StatsData } from '../api/stats';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { LoadingState } from '../components/ui/Feedback';
import { useToastStore } from '../stores/toastStore';

export default function StatsPage() {
  const toast = useToastStore();
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [insight, setInsight] = useState('');
  const [insightLoading, setInsightLoading] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    statsApi.fetchStats()
      .then(setData)
      .catch(() => toast.error('加载统计数据失败'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadInsight = async () => {
    setInsightLoading(true);
    try {
      const text = await statsApi.fetchStatsInsight();
      setInsight(text);
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || '生成解读失败';
      toast.error(msg);
    } finally {
      setInsightLoading(false);
    }
  };

  if (loading) return <LoadingState text="统计数据加载中..." />;
  if (!data) return <Card><p className="py-8 text-center text-sm text-slate-400">暂无数据</p></Card>;

  const { overview, studentDist, mentalDist } = data;

  const kpis = [
    { label: '学生总数', value: overview.studentCount, icon: GraduationCap, color: 'bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300', to: '/students' },
    { label: '台账学生', value: overview.mentalTargetCount, icon: Heart, color: 'bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-300', to: '/mental' },
    { label: '谈心记录', value: overview.counselingCount, icon: MessageSquareText, color: 'bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300' },
    { label: '台账跟进记录', value: overview.mentalRecordCount, icon: BarChart3, color: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300' },
    { label: '通知', value: overview.noticeCount, icon: ClipboardList, color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300', to: '/notices' },
    { label: '今日待办', value: overview.todayTasks, icon: BellRing, color: 'bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300', to: '/' },
  ];

  return (
    <div>
      <h2 className="mb-6 flex items-center gap-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
        <BarChart3 className="h-6 w-6 text-brand-500" />
        数据看板
      </h2>

      {/* AI 看板解读 */}
      <Card className="mb-6 border-violet-200 dark:border-violet-500/30">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-500" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">AI 工作解读</h3>
            {insight && <span className="text-xs text-slate-400">基于当前统计数据</span>}
          </div>
          <Button size="sm" variant="ghost" onClick={loadInsight} disabled={insightLoading}>
            <Sparkles className="mr-1 h-4 w-4" />
            {insightLoading ? 'AI 解读中...' : insight ? '重新解读' : '生成解读'}
          </Button>
        </div>
        {insight ? (
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-200">{insight}</p>
        ) : (
          <p className="mt-1 text-xs text-slate-400">点击「生成解读」，AI 将结合学生、台账、谈心等数据给出概况与建议。</p>
        )}
      </Card>

      {/* KPI 卡片 */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <Card key={k.label} hoverable className={k.to ? 'cursor-pointer' : ''} onClick={k.to ? () => { window.location.href = k.to; } : undefined}>
              <div className={`mb-2 flex h-9 w-9 items-center justify-center rounded-lg ${k.color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{k.value}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{k.label}</p>
            </Card>
          );
        })}
      </div>

      {/* 待办警示行 */}
      {(overview.overdueTaskCount > 0 || overview.pendingNoticeCount > 0) && (
        <div className="mb-6 flex flex-wrap gap-3">
          {overview.overdueTaskCount > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
              <AlertTriangle className="h-4 w-4" />
              {overview.overdueTaskCount} 个任务已逾期
            </div>
          )}
          {overview.pendingNoticeCount > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
              <ClipboardList className="h-4 w-4" />
              {overview.pendingNoticeCount} 个通知待处理
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* 学生分布 */}
        <Card>
          <h3 className="mb-4 text-base font-semibold text-slate-900 dark:text-slate-100">学生分布</h3>
          <div className="space-y-4">
            <DistBar title="按年级" items={studentDist.byGrade} color="bg-brand-500" />
            <DistBar title="按类型" items={studentDist.byType} color="bg-sky-500" />
            <DistBar title="按性别" items={studentDist.byGender} color="bg-emerald-500" />
          </div>
        </Card>

        {/* 台账关注级别 */}
        <Card>
          <h3 className="mb-4 text-base font-semibold text-slate-900 dark:text-slate-100">台账关注级别</h3>
          <DistBar items={mentalDist.byLevel} color="bg-red-500" />
          <div className="mt-4 grid grid-cols-2 gap-3">
            <MiniStat label="经济困难生" value={mentalDist.povertyCount} tone="red" />
            <MiniStat label="台账学生占比" value={overview.studentCount > 0 ? `${Math.round((overview.mentalTargetCount / overview.studentCount) * 100)}%` : '0%'} tone="brand" />
          </div>
        </Card>

        {/* 台账类别分布 */}
        <Card>
          <h3 className="mb-4 text-base font-semibold text-slate-900 dark:text-slate-100">台账类别分布</h3>
          {mentalDist.byCategory.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">暂无类别数据</p>
          ) : (
            <DistBar items={mentalDist.byCategory} color="bg-amber-500" />
          )}
        </Card>

        {/* 跟进趋势 */}
        <Card>
          <h3 className="mb-4 text-base font-semibold text-slate-900 dark:text-slate-100">近 6 个月台账动态</h3>
          <TrendChart title="跟进记录数" items={mentalDist.followUpTrend} color="bg-brand-500" />
          <div className="mt-5">
            <TrendChart title="新增台账学生" items={mentalDist.includeTrend} color="bg-red-500" />
          </div>
        </Card>
      </div>
    </div>
  );
}

/** 横向条形分布图（纯 CSS） */
function DistBar({ title, items, color }: { title?: string; items: statsApi.DistItem[]; color: string }) {
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <div>
      {title && <p className="mb-2 text-sm font-medium text-slate-600 dark:text-slate-300">{title}</p>}
      {items.length === 0 ? (
        <p className="py-3 text-center text-xs text-slate-400">暂无数据</p>
      ) : (
        <div className="space-y-1.5">
          {items.map((i) => (
            <div key={i.label} className="flex items-center gap-2">
              <span className="w-24 shrink-0 truncate text-xs text-slate-600 dark:text-slate-300">{i.label}</span>
              <div className="h-4 flex-1 overflow-hidden rounded bg-slate-100 dark:bg-slate-800">
                <div
                  className={`h-full rounded transition-all duration-500 ${color}`}
                  style={{ width: `${(i.count / max) * 100}%` }}
                />
              </div>
              <span className="w-8 shrink-0 text-right text-xs font-medium text-slate-500 dark:text-slate-400">{i.count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** 纵向趋势柱状图（纯 CSS） */
function TrendChart({ title, items, color }: { title: string; items: statsApi.TrendItem[]; color: string }) {
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-slate-600 dark:text-slate-300">{title}</p>
      <div className="flex h-24 items-end gap-2">
        {items.map((i) => (
          <div key={i.key} className="flex flex-1 flex-col items-center gap-1">
            <span className="text-[10px] text-slate-500 dark:text-slate-400">{i.count > 0 ? i.count : ''}</span>
            <div
              className={`w-full rounded-t ${color} transition-all duration-500 ${i.count === 0 ? 'opacity-20' : ''}`}
              style={{ height: `${Math.max(4, (i.count / max) * 100)}%` }}
            />
            <span className="text-[10px] text-slate-400">{i.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: string | number; tone: 'red' | 'brand' }) {
  const color = tone === 'red'
    ? 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300'
    : 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300';
  return (
    <div className={`rounded-lg p-3 ${color}`}>
      <p className="text-lg font-bold">{value}</p>
      <p className="text-xs opacity-80">{label}</p>
    </div>
  );
}
