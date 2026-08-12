import { useEffect, useRef, useState } from 'react';
import { HeartHandshake, Pencil, Plus, Trash2, Search, AlertTriangle, Sparkles } from 'lucide-react';
import * as counselingApi from '../api/counseling';
import { fetchStudents } from '../api/students';
import type { Counseling, Student } from '../types';
import { COUNSELING_TYPES } from '../types';
import Card from '../components/ui/Card';
import { KirbyHeaderSticker, KirbyCornerSticker } from '../components/theme/KirbyDecorations';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Input, { Select, Textarea } from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import { LoadingState, EmptyState } from '../components/ui/Feedback';
import { useToastStore } from '../stores/toastStore';
import { cn } from '../utils/cn';

function coverageColor(coverage: number): string {
  if (coverage < 60) return 'bg-red-500';
  if (coverage < 80) return 'bg-amber-500';
  return 'bg-emerald-500';
}

export default function CounselingPage() {
  const toast = useToastStore();
  const [stats, setStats] = useState<counselingApi.CounselingStats | null>(null);
  const [records, setRecords] = useState<Counseling[]>([]);
  const [loading, setLoading] = useState(true);

  // 筛选
  const [keyword, setKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // 新增/编辑
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Counseling | null>(null);
  const [presetStudentId, setPresetStudentId] = useState<string | undefined>();

  const load = async () => {
    setLoading(true);
    try {
      const [s, r] = await Promise.all([
        counselingApi.fetchCounselingStats(),
        counselingApi.fetchCounselings(),
      ]);
      setStats(s);
      setRecords(r);
    } catch {
      toast.error('加载谈心记录失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 前端过滤记录
  const filtered = records.filter((r) => {
    const studentName = r.student?.name || '';
    if (keyword && !studentName.includes(keyword)) return false;
    if (typeFilter && r.type !== typeFilter) return false;
    return true;
  });

  const openCreate = (studentId?: string) => {
    setEditing(null);
    setPresetStudentId(studentId);
    setModalOpen(true);
  };

  const openEdit = (record: Counseling) => {
    setEditing(record);
    setPresetStudentId(record.studentId);
    setModalOpen(true);
  };

  const handleDelete = async (record: Counseling) => {
    if (!confirm('确定删除这条谈心记录？')) return;
    try {
      await counselingApi.deleteCounseling(record.id);
      toast.success('已删除');
      load();
    } catch {
      toast.error('删除失败');
    }
  };

  const fmtDate = (d: string) => d.slice(0, 10);

  if (loading && !stats) return <LoadingState text="加载谈心记录..." />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold text-slate-900 dark:text-slate-100">
            <KirbyHeaderSticker sticker="kirbyWink" />
            谈心记录
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            本学期：{stats?.range.start} ~ {stats?.range.end} · 与台账、学生档案联动
          </p>
        </div>
        <Button onClick={() => openCreate()}>
          <Plus className="mr-1.5 h-4 w-4" /> 记录谈心
        </Button>
      </div>

      {/* 统计卡 */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">学生总数</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{stats?.total ?? '-'}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">本学期已谈心</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats?.counseledCount ?? '-'}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">谈心覆盖率</p>
          <div className="mt-2 flex items-center gap-2">
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats?.coverage ?? 0}%</p>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <div
                className={cn('h-full rounded-full transition-all', coverageColor(stats?.coverage ?? 0))}
                style={{ width: `${stats?.coverage ?? 0}%` }}
              />
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">未谈心学生</p>
          <p className={cn('mt-1 text-2xl font-bold', (stats?.notCounseledCount ?? 0) > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400')}>
            {stats?.notCounseledCount ?? '-'}
          </p>
        </Card>
      </div>

      {/* 类型分布 */}
      {stats && stats.byType.length > 0 && (
        <Card className="p-4">
          <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">谈心类型分布</p>
          <div className="flex flex-wrap gap-2">
            {stats.byType.map((t) => (
              <Badge key={t.label} tone="brand">{t.label} · {t.count}</Badge>
            ))}
          </div>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-5">
        {/* 未谈心名单 */}
        <Card className="lg:col-span-2">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              本学期未谈心 <span className="text-xs font-normal text-slate-400">（台账学生优先）</span>
            </h3>
          </div>
          {!stats ? (
            <p className="text-sm text-slate-400">加载中...</p>
          ) : stats.notCounseled.length === 0 ? (
            <EmptyState icon={<HeartHandshake className="h-8 w-8" />} title="全员已谈心 " />
          ) : (
            <div className="max-h-[420px] space-y-1.5 overflow-y-auto pr-1">
              {stats.notCounseled.slice(0, 60).map((s) => (
                <div
                  key={s.id}
                  className={cn(
                    'flex items-center justify-between rounded-lg border px-3 py-2',
                    s.isMentalTarget
                      ? 'border-red-200 bg-red-50/60 dark:border-red-500/30 dark:bg-red-500/10'
                      : 'border-slate-200 dark:border-slate-800'
                  )}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                      {s.name}
                      {s.isMentalTarget && <Badge tone="red" className="ml-1.5">台账</Badge>}
                    </p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                      {[s.grade, s.className].filter(Boolean).join(' · ') || '未分班'}
                    </p>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => openCreate(s.id)}>
                    补录
                  </Button>
                </div>
              ))}
              {stats.notCounseled.length > 60 && (
                <p className="pt-1 text-center text-xs text-slate-400">共 {stats.notCounseled.length} 人，仅显示前 60 人</p>
              )}
            </div>
          )}
        </Card>

        {/* 记录列表 */}
        <Card className="lg:col-span-3">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                id="counseling-search"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="搜索学生姓名"
                className="pl-8"
              />
            </div>
            <Select id="counseling-type" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="w-32">
              <option value="">全部类型</option>
              {COUNSELING_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </Select>
          </div>

          {filtered.length === 0 ? (
            <EmptyState icon={<HeartHandshake className="h-8 w-8" />} title="暂无谈心记录" />
          ) : (
            <div className="max-h-[420px] space-y-1.5 overflow-y-auto pr-1">
              {filtered.map((r) => {
                const s = r.student;
                return (
                  <div
                    key={r.id}
                    className="group relative flex items-center justify-between gap-3 overflow-hidden rounded-lg border border-slate-200 px-3 py-2 transition-colors hover:border-brand-300 dark:border-slate-800 dark:hover:border-brand-500/40"
                  >
                    <KirbyCornerSticker sticker="kirbyWink" className="absolute -right-2 -top-3 h-12 w-12 rotate-12 opacity-20" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{s?.name || '未知学生'}</span>
                        <Badge tone="blue">{r.type}</Badge>
                        {s?.isMentalTarget && <Badge tone="red">台账</Badge>}
                        <span className="text-xs text-slate-400">{fmtDate(r.date)}</span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                        {[s?.className, r.content].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100">
                      <button
                        onClick={() => openEdit(r)}
                        className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-600 dark:hover:bg-slate-800"
                        aria-label="编辑"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(r)}
                        className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                        aria-label="删除"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      <CounselingFormModal
        key={editing ? `edit-${editing.id}` : `new-${presetStudentId ?? 'blank'}`}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editing={editing}
        presetStudentId={presetStudentId}
        onSaved={() => {
          setModalOpen(false);
          load();
        }}
      />
    </div>
  );
}

/** 学生搜索选择器：输入关键词即时搜索并下拉选择 */
function StudentPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<Student[]>([]);
  const [open, setOpen] = useState(false);
  const [selectedName, setSelectedName] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = async (q: string) => {
    try {
      const res = await fetchStudents({ q: q || undefined, page: 1, pageSize: 20 });
      setOptions(res.students);
    } catch {
      setOptions([]);
    }
  };

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => search(query), 300);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [query]);

  return (
    <div className="relative">
      <Input
        id="counseling-student-picker"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="输入姓名 / 学号搜索学生"
        hint={value ? `已选择：${selectedName}` : undefined}
        required
      />
      {open && options.length > 0 && (
        <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
          {options.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                onChange(s.id);
                setQuery(s.name);
                setSelectedName(s.name);
                setOpen(false);
              }}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              <span className="text-slate-800 dark:text-slate-200">{s.name}</span>
              <span className="text-xs text-slate-400">{[s.grade, s.className].filter(Boolean).join(' · ')}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CounselingFormModal({
  open, onClose, editing, presetStudentId, onSaved,
}: {
  open: boolean;
  onClose: () => void;
  editing: Counseling | null;
  presetStudentId?: string;
  onSaved: () => void;
}) {
  const toast = useToastStore();
  // 通过父组件 key 重挂载来重置表单，无需 effect 同步
  const [studentId, setStudentId] = useState(editing?.studentId ?? presetStudentId ?? '');
  const [date, setDate] = useState(editing ? editing.date.slice(0, 10) : new Date().toISOString().slice(0, 10));
  const [type, setType] = useState(editing?.type ?? '日常');
  const [content, setContent] = useState(editing?.content ?? '');
  const [followUp, setFollowUp] = useState(editing?.followUp ?? '');
  const [submitting, setSubmitting] = useState(false);
  // AI 谈心助手
  const [outline, setOutline] = useState('');
  const [outlineLoading, setOutlineLoading] = useState(false);
  const [draft, setDraft] = useState('');
  const [summarizing, setSummarizing] = useState(false);

  const loadOutline = async () => {
    if (!studentId) {
      toast.error('请先选择学生');
      return;
    }
    setOutlineLoading(true);
    try {
      const text = await counselingApi.fetchCounselingOutline(studentId);
      setOutline(text);
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || '生成提纲失败';
      toast.error(msg);
    } finally {
      setOutlineLoading(false);
    }
  };

  const handleSummarize = async () => {
    if (!draft.trim()) {
      toast.error('请先输入谈话简述');
      return;
    }
    setSummarizing(true);
    try {
      const result = await counselingApi.summarizeCounseling(draft.trim(), studentId || undefined);
      setContent(result.content);
      if (result.followUp) setFollowUp(result.followUp);
      toast.success('已生成记录，可继续编辑后保存');
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || '整理失败';
      toast.error(msg);
    } finally {
      setSummarizing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId || !content) {
      toast.error('请选择学生并填写内容');
      return;
    }
    setSubmitting(true);
    try {
      if (editing) {
        await counselingApi.updateCounseling(editing.id, { date, type, content, followUp: followUp || undefined });
      } else {
        await counselingApi.createCounseling({ studentId, date, type, content, followUp: followUp || undefined });
      }
      toast.success(editing ? '已更新' : '已记录');
      onSaved();
    } catch {
      toast.error('保存失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? '编辑谈心记录' : '记录谈心'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <StudentPicker
          value={studentId}
          onChange={(id) => setStudentId(id)}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="谈心日期"
            id="counseling-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
          <div className="space-y-1.5">
            <label htmlFor="counseling-type" className="block text-sm font-medium text-slate-700 dark:text-slate-300">类型</label>
            <Select id="counseling-type" value={type} onChange={(e) => setType(e.target.value)}>
              {COUNSELING_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="counseling-content" className="block text-sm font-medium text-slate-700 dark:text-slate-300">谈话内容</label>
          <Textarea
            id="counseling-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="记录谈话要点、学生反映的问题等"
            required
          />
        </div>

        {/* AI 谈心助手 */}
        <div className="rounded-lg border border-violet-200 bg-violet-50/50 p-3 dark:border-violet-500/30 dark:bg-violet-500/5">
          <p className="mb-2 flex items-center gap-1 text-xs font-semibold text-violet-700 dark:text-violet-300">
            <Sparkles className="h-3.5 w-3.5" /> AI 谈心助手
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={loadOutline} disabled={outlineLoading || !studentId}>
              <Sparkles className="mr-1 h-3.5 w-3.5" />
              {outlineLoading ? '生成中...' : '生成谈话提纲'}
            </Button>
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <Input
                id="counseling-draft"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="输入一句话描述，AI 整理成记录"
                className="flex-1"
              />
              <Button type="button" size="sm" variant="secondary" onClick={handleSummarize} disabled={summarizing}>
                {summarizing ? '整理中...' : '整理'}
              </Button>
            </div>
          </div>
          {outline && (
            <div className="mt-2 whitespace-pre-wrap rounded-md bg-white/70 p-2 text-xs leading-relaxed text-slate-600 dark:bg-slate-900/60 dark:text-slate-300">
              {outline}
            </div>
          )}
          <p className="mt-2 text-[11px] text-violet-500 dark:text-violet-400">
            仅发送脱敏摘要（学生姓名与学号已匿名；证件号、手机号、住址、家长电话不发送）
          </p>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="counseling-followup" className="block text-sm font-medium text-slate-700 dark:text-slate-300">后续跟进</label>
          <Textarea
            id="counseling-followup"
            value={followUp}
            onChange={(e) => setFollowUp(e.target.value)}
            placeholder="下一步计划（可选）"
          />
        </div>
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? '保存中...' : '保存'}
        </Button>
      </form>
    </Modal>
  );
}
