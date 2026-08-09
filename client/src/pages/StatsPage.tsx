import { useEffect, useState } from 'react';
import { BarChart3, Heart, MessageSquareText, ClipboardList, AlertTriangle, BellRing, GraduationCap, Sparkles, Flag, Download } from 'lucide-react';
import * as statsApi from '../api/stats';
import type { StatsData } from '../api/stats';
import Card from '../components/ui/Card';
import { KirbyTitleIcon } from '../components/theme/KirbyDecorations';
import Button from '../components/ui/Button';
import { LoadingState } from '../components/ui/Feedback';
import { useToastStore } from '../stores/toastStore';

export default function StatsPage() {
  const toast = useToastStore();
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [insight, setInsight] = useState('');
  const [insightLoading, setInsightLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

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

  const handleExport = async () => {
    setExporting(true);
    try {
      await statsApi.exportStatsExcel();
      toast.success('人数统计表已导出');
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || '导出失败';
      toast.error(msg);
    } finally {
      setExporting(false);
    }
  };

  if (loading) return <LoadingState text="统计数据加载中..." />;
  if (!data) return <Card><p className="py-8 text-center text-sm text-slate-400">暂无数据</p></Card>;

  const { overview, studentDist, mentalDist } = data;

  const kpis = [
    { label: '学生总数', value: overview.studentCount, sub: `不含澳门班 · 澳门班 ${overview.aomenClassCount} 人（单列）`, icon: GraduationCap, color: 'bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300', to: '/students' },
    { label: '澳门班', value: overview.aomenClassCount, sub: '单独统计口径', icon: Flag, color: 'bg-pink-50 text-pink-600 dark:bg-pink-500/15 dark:text-pink-300' },
    { label: '台账学生', value: overview.mentalTargetCount, icon: Heart, color: 'bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-300', to: '/mental' },
    { label: '谈心记录', value: overview.counselingCount, icon: MessageSquareText, color: 'bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300' },
    { label: '台账跟进记录', value: overview.mentalRecordCount, icon: BarChart3, color: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300' },
    { label: '通知', value: overview.noticeCount, icon: ClipboardList, color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300', to: '/notices' },
    { label: '今日待办', value: overview.todayTasks, icon: BellRing, color: 'bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300', to: '/' },
  ];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
          <KirbyTitleIcon icon={BarChart3} sticker="starCute" className="text-brand-500" />
          数据看板
        </h2>
        <Button size="sm" variant="secondary" onClick={handleExport} disabled={exporting}>
          <Download className="mr-1 h-4 w-4" />
          {exporting ? '导出中...' : '导出人数统计表'}
        </Button>
      </div>

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
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-7">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <Card key={k.label} hoverable className={k.to ? 'cursor-pointer' : ''} onClick={k.to ? () => { window.location.href = k.to; } : undefined}>
              <div className={`mb-2 flex h-9 w-9 items-center justify-center rounded-lg ${k.color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{k.value}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{k.label}</p>
              {k.sub && <p className="mt-0.5 text-[10px] leading-tight text-slate-400 dark:text-slate-500">{k.sub}</p>}
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
        {/* 人数统计表（对齐在读人数报送表；澳门班不计入，单列口径） */}
        <Card className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">在读人数统计（不含澳门班）</h3>
            <span className="text-xs text-slate-400">澳门班 {overview.aomenClassCount} 人单列 · 境外生分生源地见下方各列</span>
          </div>
          <HeadcountTable rows={data.headcount} />
          {/* 表格下方注脚：休学人数（状态维度，不计入在读统计） */}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <span>
              休学 <span className="font-semibold text-amber-600 dark:text-amber-300">{overview.suspendedCount}</span> 人
            </span>
            <span>· 休学/不在籍不计入上表在读统计</span>
          </div>
        </Card>

        {/* 性别分布（年级/类型/学历已在上方人数统计表中展示） */}
        <Card>
          <h3 className="mb-4 text-base font-semibold text-slate-900 dark:text-slate-100">性别分布</h3>
          <DistBar items={studentDist.byGender} color="bg-emerald-500" />
          <div className="mt-4 grid grid-cols-2 gap-3">
            {studentDist.byGender.map((g) => (
              <div key={g.label} className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
                <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{g.count}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{g.label}</p>
              </div>
            ))}
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

/** 人数统计表（现代数据表风格：玻璃粘性表头 · 分组层级 · 占比迷你进度条） */
function HeadcountTable({ rows }: { rows: statsApi.HeadcountRow[] }) {
  // 占比填充色：越高越暖，直观反映境外生比例
  const rateFill = (rate: number) =>
    rate >= 0.3 ? 'bg-amber-500' : rate >= 0.15 ? 'bg-brand-500' : 'bg-slate-400 dark:bg-slate-500';
  // 单元格：0 弱化、非零正常
  const cell = (v: number) =>
    v === 0 ? 'text-slate-300 dark:text-slate-600' : 'text-slate-600 dark:text-slate-300';
  // 左竖线分隔：境内 / 境外生组 / 占比
  const leftBar = 'before:absolute before:left-0 before:top-1/2 before:h-5 before:-translate-y-1/2 before:w-px before:bg-slate-200 dark:before:bg-slate-700';

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200/80 dark:border-slate-700/60">
      <div className="max-h-[560px] overflow-auto">
        <table className="w-full min-w-[920px] border-collapse text-xs">
          <thead className="sticky top-0 z-10">
            {/* 第一层表头 */}
            <tr className="bg-white text-slate-500 shadow-[0_1px_0_0_rgb(0_0_0/0.06)] dark:bg-slate-900 dark:text-slate-400 dark:shadow-[0_1px_0_0_rgb(255_255_255/0.06)]">
              <th rowSpan={2} className="px-3 py-2 text-left font-semibold">类型</th>
              <th rowSpan={2} className="px-3 py-2 text-left font-semibold">年级</th>
              <th rowSpan={2} className="px-3 py-2 text-right font-semibold">总计</th>
              <th rowSpan={2} className={`relative px-3 py-2 text-right font-semibold ${leftBar}`}>境内生</th>
              <th rowSpan={2} className={`relative px-3 py-2 text-right font-semibold ${leftBar}`}>境外生</th>
              <th colSpan={5} className={`relative px-3 py-1.5 text-center font-semibold text-slate-400 dark:text-slate-500 ${leftBar}`}>
                境外生来源构成
              </th>
              <th rowSpan={2} className={`relative px-3 py-2 text-right font-semibold ${leftBar}`}>境外占比</th>
              <th rowSpan={2} className={`relative px-3 py-2 text-left font-semibold ${leftBar}`}>备注</th>
            </tr>
            {/* 第二层：来源 5 列 */}
            <tr className="bg-white text-slate-400 dark:bg-slate-900 dark:text-slate-500">
              <th className="px-2 py-1.5 text-right font-medium">香港</th>
              <th className="px-2 py-1.5 text-right font-medium">澳门</th>
              <th className="px-2 py-1.5 text-right font-medium">台湾</th>
              <th className="px-2 py-1.5 text-right font-medium">华侨</th>
              <th className="px-2 py-1.5 text-right font-medium">留学生</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const isSchool = r.label === '学院总计';
              const isGroupTotal = r.label === '本科总计' || r.label === '研究生总计';
              const rowCls = isSchool
                ? 'border-t-2 border-brand-200 bg-gradient-to-r from-brand-50/80 to-transparent font-bold text-slate-900 dark:border-brand-500/40 dark:from-brand-500/10 dark:text-slate-100'
                : isGroupTotal
                  ? 'border-t border-slate-200 bg-slate-50/70 font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-200'
                  : 'text-slate-700 hover:bg-slate-50/60 dark:text-slate-300 dark:hover:bg-slate-800/25';
              return (
                <tr key={r.label} className={`${rowCls} border-b border-slate-100/70 transition-colors dark:border-slate-800/60`}>
                  {/* 类型：汇总行用品牌小标签；明细行普通 */}
                  <td className="px-3 py-2">
                    {isSchool ? (
                      <span className="rounded-md bg-brand-600 px-1.5 py-0.5 text-[10px] text-white">学院</span>
                    ) : isGroupTotal ? (
                      <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{r.type}</span>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-500">{r.type}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{r.label}</td>
                  <td className="px-3 py-2 text-right tabular-nums font-semibold text-slate-800 dark:text-slate-100">{r.total}</td>
                  <td className={`relative px-3 py-2 text-right tabular-nums ${leftBar} text-slate-600 dark:text-slate-300`}>{r.domestic}</td>
                  {/* 境外总计：品牌色突出 */}
                  <td className={`relative px-3 py-2 text-right tabular-nums ${leftBar} font-bold text-brand-600 dark:text-brand-300`}>{r.overseas}</td>
                  <td className={`px-2 py-2 text-right tabular-nums ${cell(r.hk)}`}>{r.hk}</td>
                  <td className={`px-2 py-2 text-right tabular-nums ${cell(r.macau)}`}>{r.macau}</td>
                  <td className={`px-2 py-2 text-right tabular-nums ${cell(r.taiwan)}`}>{r.taiwan}</td>
                  <td className={`px-2 py-2 text-right tabular-nums ${cell(r.huaqiao)}`}>{r.huaqiao}</td>
                  <td className={`px-2 py-2 text-right tabular-nums ${cell(r.liuxue)}`}>{r.liuxue}</td>
                  {/* 境外占比：迷你进度条 + 数值 */}
                  <td className={`relative px-3 py-2 ${leftBar}`}>
                    <div className="flex items-center justify-end gap-2">
                      <div className="h-1.5 w-14 overflow-hidden rounded-full bg-slate-200/70 dark:bg-slate-700/60">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${rateFill(r.rate)}`}
                          style={{ width: `${Math.min(100, r.rate * 100)}%` }}
                        />
                      </div>
                      <span className="w-11 text-right tabular-nums text-slate-500 dark:text-slate-400">{(r.rate * 100).toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className={`relative max-w-[220px] truncate px-3 py-2 text-slate-400 dark:text-slate-500 ${leftBar}`} title={r.countries.join('、')}>
                    {r.countries.join('、')}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
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
