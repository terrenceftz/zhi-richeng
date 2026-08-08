import { useEffect, useState } from 'react';
import { Repeat, Plus, Pencil, Trash2, Clock, CalendarDays } from 'lucide-react';
import client from '../api/client';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Switch from '../components/ui/Switch';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import { useToastStore } from '../stores/toastStore';

interface RecurringReminder {
  id: string;
  title: string;
  cycleType: 'daily' | 'weekly' | 'monthly';
  time: string;
  weekdays?: string | null;
  dayOfMonth?: number | null;
  content?: string | null;
  contentType: 'text' | 'mental_report';
  enabled: boolean;
  builtin: boolean;
  skipMonths?: string;
  college?: string;
}

const WEEK_LABELS = ['日', '一', '二', '三', '四', '五', '六'];
const inputCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';
const labelCls = 'mb-1 block text-sm font-medium text-slate-600 dark:text-slate-400';

function describe(item: RecurringReminder): string {
  const time = item.time || '09:00';
  if (item.contentType === 'mental_report') return `每月 ${item.dayOfMonth ?? 15} 号 ${time} · 动态生成未跟进清单`;
  switch (item.cycleType) {
    case 'daily':
      return `每天 ${time}`;
    case 'weekly': {
      const wds = String(item.weekdays || '').split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => n >= 0 && n <= 6);
      const label = wds.length === 0 ? '（未选星期）' : `周${wds.map((d) => WEEK_LABELS[d]).join('/')}`;
      return `${label} ${time}`;
    }
    case 'monthly':
      return `每月 ${item.dayOfMonth ?? 1} 号 ${time}`;
    default:
      return time;
  }
}

export default function RecurringPage() {
  const toast = useToastStore();
  const [items, setItems] = useState<RecurringReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<RecurringReminder | null>(null);
  const [creating, setCreating] = useState(false);

  const load = async () => {
    try {
      const { data } = await client.get('/recurring');
      setItems(data);
    } catch {
      toast.error('加载周期任务失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  const toggle = async (item: RecurringReminder) => {
    try {
      await client.post(`/recurring/${item.id}/toggle`, { enabled: !item.enabled });
      toast.success(item.enabled ? '已停用' : '已启用');
      load();
    } catch {
      toast.error('操作失败');
    }
  };

  const remove = async (item: RecurringReminder) => {
    if (!window.confirm(`确定删除「${item.title}」？`)) return;
    try {
      await client.delete(`/recurring/${item.id}`);
      toast.success('已删除');
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || '删除失败');
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
          <Repeat className="h-6 w-6 text-brand-500" />
          周期任务
        </h2>
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> 新建周期提醒
        </Button>
      </div>

      <Card>
        {loading ? (
          <p className="py-8 text-center text-sm text-slate-400">加载中...</p>
        ) : items.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">还没有周期提醒，点击右上角新建</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{item.title}</p>
                    {item.builtin && <Badge tone="brand">内置</Badge>}
                    {!item.enabled && <Badge tone="gray">已停用</Badge>}
                  </div>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <Clock className="h-3 w-3" />
                    {describe(item)}
                    {item.contentType === 'mental_report' && <CalendarDays className="ml-1 h-3 w-3" />}
                  </p>
                  {item.content && (
                    <p className="mt-1 truncate text-xs text-slate-400 dark:text-slate-500">{item.content}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Switch checked={item.enabled} onChange={() => toggle(item)} label="启用" />
                  <button
                    onClick={() => setEditing(item)}
                    aria-label="编辑"
                    className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-brand-600 dark:hover:bg-slate-800"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  {!item.builtin && (
                    <button
                      onClick={() => remove(item)}
                      aria-label="删除"
                      className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {(creating || editing) && (
        <ReminderForm
          item={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={() => { setCreating(false); setEditing(null); load(); }}
        />
      )}
    </div>
  );
}

function ReminderForm({ item, onClose, onSaved }: { item: RecurringReminder | null; onClose: () => void; onSaved: () => void }) {
  const toast = useToastStore();
  const isBuiltin = !!item?.builtin;
  const [title, setTitle] = useState(item?.title || '');
  const [cycleType, setCycleType] = useState<'daily' | 'weekly' | 'monthly'>(item?.cycleType || 'daily');
  const [time, setTime] = useState(item?.time || '09:00');
  const [weekdays, setWeekdays] = useState<string>(item?.weekdays || '');
  const [dayOfMonth, setDayOfMonth] = useState(item?.dayOfMonth || 15);
  const [content, setContent] = useState(item?.content || '');
  const [enabled, setEnabled] = useState(item?.enabled ?? true);
  // 内置心理报送专属
  const [reportDay, setReportDay] = useState(item?.dayOfMonth ?? 15);
  const [skipMonths, setSkipMonths] = useState(item?.skipMonths || '1,2,7,8');
  const [college, setCollege] = useState(item?.college || '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      if (isBuiltin) {
        await client.put(`/recurring/${item!.id}`, { day: reportDay, time, enabled, skipMonths, college });
      } else if (item) {
        await client.put(`/recurring/${item.id}`, { title, cycleType, time, weekdays, dayOfMonth, content, enabled });
      } else {
        await client.post('/recurring', { title, cycleType, time, weekdays, dayOfMonth, content });
      }
      toast.success('已保存');
      onSaved();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open title={isBuiltin ? '编辑：心理台账报送' : item ? '编辑周期提醒' : '新建周期提醒'} onClose={onClose}>
      <div className="space-y-4">
        {!isBuiltin && (
          <>
            <div>
              <label className={labelCls}>提醒名称</label>
              <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="如：每周一班会提醒" />
            </div>

            <div>
              <label className={labelCls}>周期类型</label>
              <select className={inputCls} value={cycleType} onChange={(e) => setCycleType(e.target.value as any)}>
                <option value="daily">每天</option>
                <option value="weekly">每周（选星期）</option>
                <option value="monthly">每月（选几号）</option>
              </select>
            </div>

            {cycleType === 'weekly' && (
              <div>
                <label className={labelCls}>选择星期（可多选）</label>
                <div className="flex flex-wrap gap-1.5">
                  {WEEK_LABELS.map((w, i) => {
                    const set = new Set(weekdays.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => n >= 0));
                    const active = set.has(i);
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          const next = new Set(set);
                          if (active) next.delete(i);
                          else next.add(i);
                          setWeekdays([...next].sort((a, b) => a - b).join(','));
                        }}
                        className={`h-9 w-9 rounded-lg text-sm font-medium transition-colors ${
                          active
                            ? 'bg-brand-600 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {w}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {cycleType === 'monthly' && (
              <div>
                <label className={labelCls}>每月几号</label>
                <input type="number" min={1} max={28} className={`${inputCls} w-28`} value={dayOfMonth} onChange={(e) => setDayOfMonth(Math.max(1, Math.min(28, parseInt(e.target.value) || 1)))} />
              </div>
            )}

            <div>
              <label className={labelCls}>推送时间</label>
              <input type="time" className={`${inputCls} w-32`} value={time} onChange={(e) => setTime(e.target.value || '09:00')} />
            </div>

            <div>
              <label className={labelCls}>提醒内容（可选）</label>
              <textarea rows={3} className={inputCls} value={content} onChange={(e) => setContent(e.target.value)} placeholder="推送的固定消息内容，留空只发提醒名称" />
            </div>
          </>
        )}

        {isBuiltin && (
          <>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-800/50">
              内置周期任务：每月到达报送日时，通过飞书推送本月尚未跟进的心理台账学生清单（寒暑假自动跳过）。
            </div>
            <div>
              <label className={labelCls}>报送日（每月几号）</label>
              <input type="number" min={1} max={28} className={`${inputCls} w-28`} value={reportDay} onChange={(e) => setReportDay(Math.max(1, Math.min(28, parseInt(e.target.value) || 15)))} />
            </div>
            <div>
              <label className={labelCls}>推送时间</label>
              <input type="time" className={`${inputCls} w-32`} value={time} onChange={(e) => setTime(e.target.value || '08:00')} />
            </div>
            <div>
              <label className={labelCls}>寒暑假不报送月份</label>
              <input className={inputCls} value={skipMonths} onChange={(e) => setSkipMonths(e.target.value)} placeholder="如：1,2,7,8" />
            </div>
            <div>
              <label className={labelCls}>学院名称（导出报送表用）</label>
              <input className={inputCls} value={college} onChange={(e) => setCollege(e.target.value)} placeholder="如：华侨大学法学院" />
            </div>
          </>
        )}

        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-800/50">
          <div>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">启用</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">停用后不再触发推送</p>
          </div>
          <Switch checked={enabled} onChange={(v) => setEnabled(v)} label="启用" />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>取消</Button>
          <Button onClick={save} disabled={saving || (!isBuiltin && !title.trim())}>
            {saving ? '保存中...' : '保存'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
