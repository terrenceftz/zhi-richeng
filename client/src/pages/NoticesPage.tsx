import { useEffect, useState } from 'react';
import { Bell, Plus, Sparkles, Trash2, CheckCircle2, Circle, Clock } from 'lucide-react';
import * as noticesApi from '../api/notices';
import type { Notice } from '../types';
import { NOTICE_STATUS_LABELS } from '../types';
import Card from '../components/ui/Card';
import { KirbyTitleIcon, KirbyCornerSticker } from '../components/theme/KirbyDecorations';
import Button from '../components/ui/Button';
import Input, { Select, Textarea } from '../components/ui/Input';
import Drawer from '../components/ui/Drawer';
import Badge from '../components/ui/Badge';
import { LoadingState, EmptyState } from '../components/ui/Feedback';
import { useToastStore } from '../stores/toastStore';

const STATUSES: Notice['status'][] = ['pending', 'in_progress', 'done'];

export default function NoticesPage() {
  const toast = useToastStore();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [extractOpen, setExtractOpen] = useState(false);
  const [editing, setEditing] = useState<Notice | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const list = await noticesApi.fetchNotices();
      setNotices(list);
    } catch {
      toast.error('加载通知失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  const grouped = (status: Notice['status']) => notices.filter((n) => n.status === status);

  const handleSave = async (data: Partial<Notice>) => {
    try {
      if (editing) {
        await noticesApi.updateNotice(editing.id, data);
        toast.success('已更新');
      } else {
        await noticesApi.createNotice(data);
        toast.success('已创建');
      }
      setDrawerOpen(false);
      load();
    } catch {
      toast.error('保存失败');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除该通知？')) return;
    try {
      await noticesApi.deleteNotice(id);
      toast.success('已删除');
      load();
    } catch {
      toast.error('删除失败');
    }
  };

  const toggleMaterial = async (noticeId: string, index: number, submitted: boolean) => {
    try {
      const updated = await noticesApi.toggleMaterial(noticeId, index, submitted);
      setNotices((prev) => prev.map((n) => (n.id === noticeId ? updated : n)));
    } catch {
      toast.error('更新失败');
    }
  };

  const openCreate = () => { setEditing(null); setDrawerOpen(true); };
  const openEdit = (n: Notice) => { setEditing(n); setDrawerOpen(true); };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
          <KirbyTitleIcon icon={Bell} sticker="candy" className="text-brand-500" />
          通知与材料上报
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setExtractOpen(true)}><Sparkles className="h-4 w-4" /> AI 解析通知</Button>
          <Button onClick={openCreate}><Plus className="h-4 w-4" /> 新建</Button>
        </div>
      </div>

      {loading ? (
        <LoadingState />
      ) : notices.length === 0 ? (
        <Card><EmptyState title="还没有通知" hint="点击「新建」手动添加，或用「AI 解析通知」从文本提取" icon={<Bell className="h-6 w-6" />} /></Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {STATUSES.map((status) => (
            <div key={status} className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{NOTICE_STATUS_LABELS[status]}</h3>
                <Badge tone="gray">{grouped(status).length}</Badge>
              </div>
              {grouped(status).map((n) => (
                <NoticeCard key={n.id} notice={n} onEdit={() => openEdit(n)} onDelete={() => handleDelete(n.id)} onToggleMaterial={(i, s) => toggleMaterial(n.id, i, s)} />
              ))}
              {grouped(status).length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-xs text-slate-400 dark:border-slate-800">暂无</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 新建/编辑 */}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={editing ? '编辑通知' : '新建通知'}>
        <NoticeForm key={editing?.id || 'create'} initial={editing || undefined} onSubmit={handleSave} onCancel={() => setDrawerOpen(false)} />
      </Drawer>

      {/* AI 解析 */}
      <ExtractDrawer open={extractOpen} onClose={() => setExtractOpen(false)} onDone={() => { setExtractOpen(false); load(); }} />
    </div>
  );
}

function NoticeCard({ notice, onEdit, onDelete, onToggleMaterial }: {
  notice: Notice;
  onEdit: () => void;
  onDelete: () => void;
  onToggleMaterial: (index: number, submitted: boolean) => void;
}) {
  const submittedCount = notice.materials.filter((m) => m.submitted).length;
  const overdue = notice.deadline && new Date(notice.deadline) < new Date() && notice.status !== 'done';

  return (
    <Card hoverable className="relative cursor-pointer overflow-hidden" onClick={onEdit}>
      <KirbyCornerSticker sticker="candy" className="absolute -right-3 -top-4 h-16 w-16 rotate-12 opacity-25" />
      <div className="mb-2 flex items-start justify-between gap-2">
        <h4 className="text-sm font-medium leading-snug text-slate-900 dark:text-slate-100">{notice.title}</h4>
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} aria-label="删除" className="shrink-0 rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        {notice.source && <Badge tone="gray">{notice.source}</Badge>}
        {notice.deadline && (
          <Badge tone={overdue ? 'red' : 'amber'}>
            <Clock className="h-3 w-3" /> {new Date(notice.deadline).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
          </Badge>
        )}
      </div>
      {notice.materials.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-slate-500 dark:text-slate-400">材料 {submittedCount}/{notice.materials.length}</p>
          {notice.materials.slice(0, 4).map((m, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); onToggleMaterial(i, !m.submitted); }}
              className="flex w-full items-center gap-1.5 rounded px-1 py-0.5 text-left text-xs hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              {m.submitted ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" /> : <Circle className="h-3.5 w-3.5 shrink-0 text-slate-300 dark:text-slate-600" />}
              <span className={`truncate ${m.submitted ? 'text-slate-400 line-through' : 'text-slate-600 dark:text-slate-300'}`}>
                {m.name}{m.required ? ' *' : ''}
              </span>
            </button>
          ))}
          {notice.materials.length > 4 && <p className="px-1 text-xs text-slate-400">还有 {notice.materials.length - 4} 项…</p>}
        </div>
      )}
      {notice.materials.length === 0 && <p className="text-xs text-slate-400">无材料清单</p>}
    </Card>
  );
}

function NoticeForm({ initial, onSubmit, onCancel }: { initial?: Notice; onSubmit: (d: Partial<Notice>) => Promise<void>; onCancel: () => void }) {
  const [title, setTitle] = useState(initial?.title || '');
  const [source, setSource] = useState(initial?.source || '');
  const [deadline, setDeadline] = useState(initial?.deadline?.slice(0, 10) || '');
  const [status, setStatus] = useState<Notice['status']>(initial?.status || 'pending');
  const [materialsText, setMaterialsText] = useState(
    initial?.materials.map((m) => `${m.name}${m.required ? '*' : ''}`).join('\n') || ''
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const materials = materialsText
      .split('\n').map((l) => l.trim()).filter(Boolean)
      .map((line) => {
        const required = line.endsWith('*');
        return { name: required ? line.slice(0, -1).trim() : line, required, submitted: false, note: '' };
      });
    await onSubmit({ title, source: source || undefined, deadline: deadline || undefined, status, materials });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Input label="通知标题" id="nTitle" value={title} onChange={(e) => setTitle(e.target.value)} required />
      <div className="grid grid-cols-2 gap-3">
        <Input label="来源" id="nSource" value={source} onChange={(e) => setSource(e.target.value)} placeholder="教务处/学工" />
        <Input label="截止日期" id="nDeadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-400">材料清单（每行一项，末尾加 * 表示必填）</label>
        <Textarea value={materialsText} onChange={(e) => setMaterialsText(e.target.value)} placeholder={'学生证扫描件 *\n家庭情况表\n成绩单 *'} />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-400">状态</label>
        <Select value={status} onChange={(e) => setStatus(e.target.value as Notice['status'])}>
          <option value="pending">待处理</option>
          <option value="in_progress">进行中</option>
          <option value="done">已完成</option>
        </Select>
      </div>
      <div className="flex gap-3 pt-1">
        <Button type="submit" className="flex-1">保存</Button>
        <Button type="button" variant="secondary" onClick={onCancel}>取消</Button>
      </div>
    </form>
  );
}

function ExtractDrawer({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const toast = useToastStore();
  const [text, setText] = useState('');
  const [createTask, setCreateTask] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleExtract = async () => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      await noticesApi.noticeFromText(text.trim(), createTask);
      toast.success('已从文本生成通知');
      setText('');
      onDone();
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message || '解析失败';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer open={open} onClose={onClose} title="AI 解析通知">
      <div className="space-y-4">
        <p className="text-sm text-slate-500 dark:text-slate-400">粘贴通知/公文全文，AI 自动提取标题、来源、截止日期与材料清单，并可一键创建关联任务。</p>
        <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="粘贴通知全文..." className="min-h-[160px]" />
        <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <input type="checkbox" checked={createTask} onChange={(e) => setCreateTask(e.target.checked)} className="h-4 w-4 rounded accent-brand-600" />
          同时创建关联任务（高优先级）
        </label>
        <Button onClick={handleExtract} disabled={loading || !text.trim()} className="w-full">
          <Sparkles className="h-4 w-4" /> {loading ? '解析中...' : 'AI 解析并创建'}
        </Button>
      </div>
    </Drawer>
  );
}
