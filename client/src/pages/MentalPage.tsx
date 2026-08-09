import { useEffect, useState } from 'react';
import { Heart, Download, Upload, Plus, Search, Trash2, Pencil, AlertTriangle, CalendarClock, Sparkles } from 'lucide-react';
import * as mentalApi from '../api/mental';
import * as XLSX from 'xlsx';
import type { Student, MentalRecord, RiskAlert } from '../types';
import { MENTAL_CATEGORIES, CONCERN_LEVEL_LABELS } from '../types';
import Card from '../components/ui/Card';
import { KirbyTitleIcon, KirbyCornerSticker } from '../components/theme/KirbyDecorations';
import Button from '../components/ui/Button';
import Input, { Select, Textarea } from '../components/ui/Input';
import Drawer from '../components/ui/Drawer';
import Badge from '../components/ui/Badge';
import Switch from '../components/ui/Switch';
import { LoadingState, EmptyState } from '../components/ui/Feedback';
import { useToastStore } from '../stores/toastStore';

const levelTone: Record<number, 'red' | 'amber' | 'blue'> = { 3: 'red', 2: 'amber', 1: 'blue' };

export default function MentalPage() {
  const toast = useToastStore();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 12;
  const [editing, setEditing] = useState<Student | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [alerts, setAlerts] = useState<RiskAlert[]>([]);
  const [monthlyPending, setMonthlyPending] = useState<{ pending: Student[]; isHoliday: boolean; skipMonths: number[] } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const list = await mentalApi.fetchMentalStudents();
      setStudents(list);
    } catch {
      toast.error('加载台账失败');
    } finally {
      setLoading(false);
    }
  };

  const loadAlerts = async () => {
    try {
      const [a, m] = await Promise.all([mentalApi.fetchRiskAlerts(), mentalApi.fetchMonthlyPending()]);
      setAlerts(a);
      setMonthlyPending(m);
    } catch {
      /* 忽略 */
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    loadAlerts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = students.filter((s) => {
    if (q && !s.name.includes(q) && !(s.studentNo || '').includes(q)) return false;
    if (levelFilter && String(s.mentalProfile?.concernLevel || 1) !== levelFilter) return false;
    return true;
  });

  // 分页：过滤后切页展示（每页 PAGE_SIZE 人），筛选条件变化回到第一页
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => { setPage(1); }, [q, levelFilter]);

  const handleExport = async () => {
    try {
      await mentalApi.exportMentalExcel();
      toast.success('已导出台账 Excel');
    } catch {
      toast.error('导出失败');
    }
  };

  const handleExportReport = async () => {
    try {
      await mentalApi.exportMentalReport();
      toast.success('已导出月度报送表');
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || '导出失败');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array', cellDates: true });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      if (!sheet) {
        toast.error('文件为空或无法读取');
        return;
      }
      // 读取原始二维数组，智能识别表头行（兼容第一行为标题行的情况）
      const aoa = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });
      const KNOWN_HEADERS = ['姓名', '学号', 'studentno', '关注级别', '类别', '纳入台账时间'];
      let headerIdx = 0;
      if (aoa.length > 1) {
        const firstRow = (aoa[0] || []).map((c) => String(c).trim().toLowerCase());
        const isTitleRow = !firstRow.some((c) => c && (KNOWN_HEADERS.includes(c) || c.includes('学号')));
        if (isTitleRow) headerIdx = 1; // 第一行是标题，跳过
      }
      const headers = (aoa[headerIdx] || []).map((h) => String(h).trim());
      const rows = aoa
        .slice(headerIdx + 1)
        .filter((r) => (r || []).some((c) => String(c).trim() !== ''))
        .map((r) => {
          const obj: Record<string, unknown> = {};
          headers.forEach((h, i) => { obj[h] = (r || [])[i] ?? ''; });
          return obj;
        });

      if (rows.length === 0) {
        toast.error('文件中没有数据行，请检查表格内容');
        return;
      }
      // 校验是否包含学号列
      const hasStudentNo = headers.some((h) => h.includes('学号') || /^studentno$/i.test(h));
      if (!hasStudentNo) {
        toast.error('未找到「学号」列，请确认表头包含学号（姓名、学号、关注级别...）');
        return;
      }
      const res = await mentalApi.importMentalRows(rows);
      toast.success(res.message || `已更新 ${res.updated} 名台账学生`);
      load();
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || '导入失败，请确认是 .xlsx/.xls 文件');
    } finally {
      e.target.value = '';
    }
  };

  const handleDelete = async (s: Student) => {
    if (!confirm(`确定将「${s.name}」移出台账？档案与记录将保留。`)) return;
    try {
      await mentalApi.toggleMentalTarget(s.id, false);
      toast.success('已移出台账');
      load();
    } catch {
      toast.error('操作失败');
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
          <KirbyTitleIcon icon={Heart} sticker="bow" className="fill-red-500 text-red-500" />
          心理台账
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={handleExportReport} title="按每月 15 号报送表格式导出（寒暑假不计入）">
            <Download className="h-4 w-4" /> 导出报送表
          </Button>
          <Button variant="secondary" onClick={handleExport}>
            <Download className="h-4 w-4" /> 导出 Excel
          </Button>
          <label
            title="导入台账档案（按学号匹配，仅更新关注级别/类别/家长信息等台账字段，不会修改学生基本信息，也不会创建新学生）"
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Upload className="h-4 w-4" /> 导入台账
            <input type="file" accept=".xlsx,.xls" onChange={handleImport} className="hidden" />
          </label>
        </div>
      </div>

      {/* 过滤 */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜索姓名 / 学号"
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>
        <Select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)} className="w-32">
          <option value="">全部级别</option>
          <option value="3">三级（最高）</option>
          <option value="2">二级</option>
          <option value="1">一级</option>
        </Select>
      </div>

      {/* 风险预警 + 月度未跟进 */}
      {(alerts.length > 0 || (monthlyPending && !monthlyPending.isHoliday && monthlyPending.pending.length > 0)) && (
        <div className="mb-4 space-y-3">
          {monthlyPending && !monthlyPending.isHoliday && monthlyPending.pending.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-500/30 dark:bg-amber-500/5">
              <div className="mb-2 flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                  本月（{new Date().getMonth() + 1} 月）尚有 {monthlyPending.pending.length} 名台账学生未跟进
                </p>
              </div>
              <p className="mb-2 text-xs text-amber-700/80 dark:text-amber-400/80">
                心理台账跟进于每月 15 号报送，请在 15 号前完成（寒暑假不计入）
              </p>
              <div className="flex flex-wrap gap-1.5">
                {monthlyPending.pending.slice(0, 10).map((s) => (
                  <button
                    key={s.id}
                    onClick={() => { setEditing(s); setDrawerOpen(true); }}
                    className="rounded-full border border-amber-300 bg-white px-2.5 py-1 text-xs text-amber-800 transition-colors hover:bg-amber-100 dark:border-amber-500/40 dark:bg-slate-900 dark:text-amber-300 dark:hover:bg-amber-500/10"
                  >
                    {s.name}（{s.mentalProfile?.concernLevel || 1}级）
                  </button>
                ))}
                {monthlyPending.pending.length > 10 && (
                  <span className="px-2 py-1 text-xs text-amber-700/70 dark:text-amber-400/70">等 {monthlyPending.pending.length} 人</span>
                )}
              </div>
            </div>
          )}

          {alerts.length > 0 && (
            <div className="rounded-xl border border-red-200 bg-red-50/60 p-4 dark:border-red-500/30 dark:bg-red-500/5">
              <div className="mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                <p className="text-sm font-semibold text-red-800 dark:text-red-300">
                  风险预警：{alerts.length} 名台账学生长期未跟进
                </p>
              </div>
              <div className="space-y-1.5">
                {alerts.slice(0, 6).map((a) => (
                  <div key={a.studentId} className="flex items-center justify-between gap-2 text-xs">
                    <span className="min-w-0 truncate text-red-700 dark:text-red-300">
                      {a.name}（{a.concernLevel}级）已 {a.daysSince} 天未跟进
                      {a.extraRisk ? ' 经济困难+心理' : ''}
                    </span>
                    <button
                      onClick={() => { const s = students.find((x) => x.id === a.studentId); if (s) { setEditing(s); setDrawerOpen(true); } }}
                      className="shrink-0 rounded-full border border-red-300 bg-white px-2 py-0.5 text-red-700 hover:bg-red-100 dark:border-red-500/40 dark:bg-slate-900 dark:text-red-300 dark:hover:bg-red-500/10"
                    >
                      去跟进
                    </button>
                  </div>
                ))}
                {alerts.length > 6 && <p className="text-xs text-red-600/70 dark:text-red-400/70">等 {alerts.length} 人...</p>}
              </div>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <LoadingState />
      ) : students.length === 0 ? (
        <Card><EmptyState title="暂无台账学生" hint="到「学生管理」中标记学生为心理台账学生，或导入台账 Excel" icon={<Heart className="h-6 w-6" />} /></Card>
      ) : filtered.length === 0 ? (
        <Card><EmptyState title="没有匹配的台账学生" hint="换个关键词或级别试试" icon={<Search className="h-6 w-6" />} /></Card>
      ) : (
        <>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {pageItems.map((s) => {
            const p = s.mentalProfile;
            const level = p?.concernLevel || 1;
            return (
              <Card key={s.id} hoverable className="relative cursor-pointer overflow-hidden" onClick={() => { setEditing(s); setDrawerOpen(true); }}>
                <KirbyCornerSticker sticker="kirbySit" className="absolute -right-3 -top-4 h-16 w-16 rotate-12 opacity-25" />
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-sm font-semibold text-red-700 dark:bg-red-500/15 dark:text-red-300">
                      {s.name.charAt(0)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{s.name}</p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">{s.className || ''}{s.grade ? ` / ${s.grade}` : ''}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Badge tone={levelTone[level] || 'blue'}>{CONCERN_LEVEL_LABELS[level] || `${level}级`}关注</Badge>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(s); }} aria-label="移出台账" className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mb-2 flex flex-wrap gap-1">
                  {p?.categories?.map((c) => (
                    <Badge key={c} tone={c === '心理健康' ? 'red' : c === '重大疾病' || c === '政治安全' ? 'amber' : 'gray'}>{c}</Badge>
                  ))}
                </div>

                <div className="space-y-1 text-xs text-slate-500 dark:text-slate-400">
                  {p?.isPoverty && <p>家庭经济困难生</p>}
                  {p?.includedAt && <p>纳入：{new Date(p.includedAt).toISOString().slice(0, 10)}</p>}
                  {p?.followUpPerson && <p>跟进人：{p.followUpPerson}</p>}
                  {p?.parentInformed && <p>家长知情{p?.parentPhone ? ` · ${p.parentPhone}` : ''}</p>}
                  {!p?.isPoverty && !p?.includedAt && !p?.followUpPerson && !p?.parentInformed && (
                    <p className="text-slate-400">档案未完善，点击编辑</p>
                  )}
                </div>

                <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2 dark:border-slate-800">
                  <span className="text-xs text-slate-400">台账记录 {s._count?.mentalRecords || 0} 条</span>
                  <span className="inline-flex items-center gap-1 text-xs text-brand-600 dark:text-brand-400">
                    <Pencil className="h-3 w-3" /> 编辑档案
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
        {totalPages > 1 && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>
              共 <span className="font-semibold text-slate-700 dark:text-slate-200">{filtered.length}</span> 人 · 第 {page} / {totalPages} 页
            </span>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>上一页</Button>
              <Button size="sm" variant="secondary" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>下一页</Button>
            </div>
          </div>
        )}
        </>
      )}

      {/* 档案编辑抽屉 */}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={editing ? `${editing.name} · 台账档案` : '台账档案'} width="max-w-lg">
        {editing && (
          <ProfileForm
            key={editing.id}
            student={editing}
            onSaved={async () => {
              setDrawerOpen(false);
              load();
            }}
          />
        )}
      </Drawer>
    </div>
  );
}

/** 档案 + 跟进记录表单 */
function ProfileForm({ student, onSaved }: { student: Student; onSaved: () => Promise<void> }) {
  const toast = useToastStore();
  const p = student.mentalProfile;
  const [isPoverty, setIsPoverty] = useState(p?.isPoverty || false);
  const [concernLevel, setConcernLevel] = useState(p?.concernLevel || 1);
  const [categories, setCategories] = useState<string[]>(p?.categories || []);
  const [includedAt, setIncludedAt] = useState(p?.includedAt?.slice(0, 10) || '');
  const [includeReason, setIncludeReason] = useState(p?.includeReason || '');
  const [followUpPerson, setFollowUpPerson] = useState(p?.followUpPerson || '');
  const [parentInformed, setParentInformed] = useState(p?.parentInformed || false);
  const [parentPhone, setParentPhone] = useState(p?.parentPhone || '');
  const [remark, setRemark] = useState(p?.remark || '');
  const [records, setRecords] = useState<MentalRecord[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    mentalApi.fetchMentalRecords({ studentId: student.id }).then(setRecords).catch(() => setRecords([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student.id]);

  const toggleCategory = (c: string) => {
    setCategories((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      await mentalApi.upsertMentalProfile(student.id, {
        isPoverty,
        concernLevel,
        categories: categories.length > 0 ? categories : ['心理健康'],
        includedAt: includedAt || undefined,
        includeReason: includeReason || undefined,
        followUpPerson: followUpPerson || undefined,
        parentInformed,
        parentPhone: parentPhone || undefined,
        remark: remark || undefined,
      });
      toast.success('档案已保存');
      await onSaved();
    } catch {
      toast.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* 档案字段 */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-400">关注级别</label>
            <div className="flex gap-2">
              {[1, 2, 3].map((lv) => (
                <button
                  key={lv}
                  onClick={() => setConcernLevel(lv)}
                  className={`flex-1 rounded-lg border px-2 py-2 text-sm font-medium transition-colors ${
                    concernLevel === lv
                      ? lv === 3
                        ? 'border-red-400 bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300'
                        : lv === 2
                          ? 'border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'
                          : 'border-sky-400 bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300'
                      : 'border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400'
                  }`}
                >
                  {CONCERN_LEVEL_LABELS[lv]}{lv === 3 ? '（最高）' : ''}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-400">纳入台账时间</label>
            <Input type="date" value={includedAt} onChange={(e) => setIncludedAt(e.target.value)} />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-400">类别（可多选）</label>
          <div className="flex flex-wrap gap-2">
            {MENTAL_CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => toggleCategory(c)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  categories.includes(c)
                    ? 'border-red-400 bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300'
                    : 'border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <Textarea label="纳入原因" value={includeReason} onChange={(e) => setIncludeReason(e.target.value)} placeholder="为什么纳入台账..." />

        <div className="grid grid-cols-2 gap-3">
          <Input label="跟进人" value={followUpPerson} onChange={(e) => setFollowUpPerson(e.target.value)} placeholder="辅导员姓名" />
          <Input label="家长联系电话" value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} placeholder="家长手机号" />
        </div>

        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-800/50">
          <div>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">是否家庭经济困难生</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">涉及资助政策，请如实填写</p>
          </div>
          <Switch checked={isPoverty} onChange={setIsPoverty} label="家庭经济困难生" />
        </div>

        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-800/50">
          <div>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">家长是否知情</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">是否已告知家长学生情况</p>
          </div>
          <Switch checked={parentInformed} onChange={setParentInformed} label="家长知情" />
        </div>

        <Textarea label="备注" value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="其他需要记录的信息..." />

        <Button onClick={saveProfile} disabled={saving} className="w-full">
          {saving ? '保存中...' : '保存档案'}
        </Button>
      </div>

      {/* 跟进记录 */}
      <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
        <FollowUpTimeline studentId={student.id} records={records} onChanged={async () => {
          const r = await mentalApi.fetchMentalRecords({ studentId: student.id });
          setRecords(r);
        }} />
      </div>
    </div>
  );
}

/** 跟进记录时间线（累加显示） */
function FollowUpTimeline({ studentId, records, onChanged }: {
  studentId: string;
  records: MentalRecord[];
  onChanged: () => Promise<void>;
}) {
  const toast = useToastStore();
  const [showForm, setShowForm] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [situation, setSituation] = useState('');
  const [action, setAction] = useState('');
  const [followUp, setFollowUp] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  // AI 台账智囊
  const [advice, setAdvice] = useState('');
  const [adviceLoading, setAdviceLoading] = useState(false);

  const loadAdvice = async () => {
    setAdviceLoading(true);
    try {
      const text = await mentalApi.fetchMentalAdvice(studentId);
      setAdvice(text);
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || '生成建议失败';
      toast.error(msg);
    } finally {
      setAdviceLoading(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!situation.trim()) return;
    try {
      await mentalApi.createMentalRecord({
        studentId, date, situation: situation.trim(),
        action: action.trim() || undefined, followUp: followUp.trim() || undefined,
        followUpDate: followUpDate || undefined,
      });
      toast.success('已添加跟进记录');
      setSituation(''); setAction(''); setFollowUp(''); setFollowUpDate(''); setShowForm(false);
      await onChanged();
    } catch {
      toast.error('保存失败');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除该跟进记录？')) return;
    try {
      await mentalApi.deleteMentalRecord(id);
      toast.success('已删除');
      await onChanged();
    } catch {
      toast.error('删除失败');
    }
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">跟进记录（{records.length}）</h4>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={loadAdvice} disabled={adviceLoading}>
            <Sparkles className="h-4 w-4" /> {adviceLoading ? 'AI 生成中...' : advice ? '重新生成建议' : 'AI 跟进建议'}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4" /> 新增跟进
          </Button>
        </div>
      </div>

      {advice && (
        <div className="mb-4 rounded-lg border border-violet-200 bg-violet-50/60 p-3 dark:border-violet-500/30 dark:bg-violet-500/10">
          <p className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-violet-700 dark:text-violet-300">
            <Sparkles className="h-3.5 w-3.5" /> AI 跟进建议
          </p>
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-200">{advice}</div>
          <p className="mt-2 border-t border-violet-200 pt-1.5 text-[11px] leading-relaxed text-violet-500 dark:border-violet-500/20 dark:text-violet-400">
            仅发送与关怀相关的脱敏摘要（姓名/班级/档案/跟进与谈心记录）；证件号、手机号、住址、家长电话等敏感信息不会发送。
          </p>
        </div>
      )}

      {showForm && (
        <form onSubmit={submit} className="mb-4 space-y-3 rounded-lg border border-red-200 bg-red-50/50 p-3 dark:border-red-500/30 dark:bg-red-500/5">
          <div className="grid grid-cols-2 gap-3">
            <Input label="跟进日期" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <Input label="下次跟进日期（选填）" type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} hint="每月 15 号报送，寒暑假不计" />
          </div>
          <Textarea label="跟进情况" value={situation} onChange={(e) => setSituation(e.target.value)} required placeholder="本次跟进了解到的情况..." />
          <Textarea label="跟进措施" value={action} onChange={(e) => setAction(e.target.value)} placeholder="本次采取的措施..." />
          <Input label="下一步计划（选填）" value={followUp} onChange={(e) => setFollowUp(e.target.value)} placeholder="下次跟进安排" />
          <Button type="submit" size="sm">保存</Button>
        </form>
      )}

      {records.length === 0 ? (
        <p className="py-4 text-center text-sm text-slate-400">暂无跟进记录，点击「新增跟进」添加第一条</p>
      ) : (
        <div className="max-h-[320px] space-y-3 overflow-y-auto pr-1">
          {records.map((r) => (
            <div key={r.id} className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {new Date(r.date).toLocaleDateString('zh-CN')}
                </span>
                <button onClick={() => handleDelete(r.id)} className="text-xs text-slate-400 hover:text-red-500">删除</button>
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-200">{r.situation}</p>
              {r.action && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">措施：{r.action}</p>}
              {r.followUp && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">下一步：{r.followUp}</p>}
              {r.followUpDate && (
                <p className="mt-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                  下次跟进：{new Date(r.followUpDate).toLocaleDateString('zh-CN')}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
