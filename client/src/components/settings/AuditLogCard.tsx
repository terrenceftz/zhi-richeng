import { useEffect, useState } from 'react';
import { History, ShieldCheck } from 'lucide-react';
import client from '../../api/client';
import Card from './Card';
import Badge from '../ui/Badge';
import { Select } from '../ui/Input';

interface AuditRow {
  id: string;
  action: string;
  detail: string | null;
  ip: string | null;
  createdAt: string;
}

export default function AuditLogCard() {
  const [logs, setLogs] = useState<AuditRow[]>([]);
  const [actions, setActions] = useState<Record<string, string>>({});
  const [actionFilter, setActionFilter] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [total, setTotal] = useState(0);

  const load = async () => {
    try {
      const { data } = await client.get('/audit', { params: actionFilter ? { action: actionFilter } : {} });
      setLogs(data.logs || []);
      setActions(data.actions || {});
      setTotal(data.total || 0);
      setIsAdmin(true);
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      setIsAdmin(status !== 403 && status !== 401);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionFilter]);

  const toneOf = (action: string): 'brand' | 'gray' | 'green' | 'amber' | 'red' | 'blue' => {
    if (action.startsWith('student_delete') || action.startsWith('record_delete') || action.startsWith('counseling_delete') || action.startsWith('backup_restore')) return 'red';
    if (action.startsWith('export') || action.startsWith('backup')) return 'amber';
    if (action.startsWith('student_') || action.startsWith('counseling_')) return 'blue';
    if (action.startsWith('mental') || action.startsWith('record_') || action.startsWith('profile')) return 'brand';
    return 'gray';
  };

  if (!isAdmin && logs.length === 0) return null;

  return (
    <Card
      title={
        <span className="flex items-center gap-2">
          <History className="h-5 w-5 text-slate-400" /> 审计日志
        </span>
      }
      subtitle={
        <span className="flex items-center gap-1">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
          敏感操作留痕（登录/台账/学生/谈心/导出/备份/设置），保留 90 天 · 共 {total} 条
        </span>
      }
    >
      {isAdmin && (
        <>
          <div className="mb-3 flex items-center justify-between gap-2">
            <Select id="audit-filter" value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="w-48">
              <option value="">全部操作</option>
              {Object.entries(actions).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </Select>
          </div>
          {logs.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">暂无审计记录</p>
          ) : (
            <div className="max-h-[380px] space-y-1 overflow-y-auto pr-1">
              {logs.slice(0, 60).map((l) => (
                <div key={l.id} className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-800">
                  <span className="shrink-0 text-xs tabular-nums text-slate-400">
                    {new Date(l.createdAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <Badge tone={toneOf(l.action)}>{actions[l.action] || l.action}</Badge>
                  <span className="min-w-0 flex-1 truncate text-slate-600 dark:text-slate-300">{l.detail || '-'}</span>
                  {l.ip && <span className="shrink-0 text-xs text-slate-400">{l.ip}</span>}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </Card>
  );
}
