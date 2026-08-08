import { useState, useEffect } from 'react';
import { Users, Trash2 } from 'lucide-react';
import client from '../../api/client';
import { useAuthStore } from '../../stores/authStore';
import { useToastStore } from '../../stores/toastStore';
import type { UserRole } from '../../types';
import Card from './Card';
import Badge from '../ui/Badge';

interface UserRow {
  id: string;
  email: string;
  name: string;
  role: string;
  college?: string;
  createdAt: string;
}

const ROLE_OPTIONS: { value: UserRole; label: string; desc: string }[] = [
  { value: 'user', label: '普通用户', desc: '学生/台账/谈心等业务功能' },
  { value: 'dept_admin', label: '院系管理员', desc: '业务全功能，不可管理系统配置' },
  { value: 'admin', label: '系统管理员', desc: '全部权限（含用户/备份/审计/系统设置）' },
];

const ROLE_BADGE: Record<string, { tone: 'brand' | 'blue' | 'gray'; label: string }> = {
  admin: { tone: 'brand', label: '系统管理员' },
  dept_admin: { tone: 'blue', label: '院系管理员' },
  user: { tone: 'gray', label: '普通用户' },
};

export default function UsersCard() {
  const { user } = useAuthStore();
  const toast = useToastStore();
  const [regEnabled, setRegEnabled] = useState(false);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [saving, setSaving] = useState(false);
  const [changingId, setChangingId] = useState<string | null>(null);

  const load = async () => {
    try {
      const [sr, ur] = await Promise.all([client.get('/settings'), client.get('/users')]);
      setRegEnabled(sr.data.regEnabled === 'true');
      setUsers(ur.data.users || []);
      setIsAdmin(user?.role === 'admin');
    } catch (err) {
      // 非管理员无法访问 /users（403）
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 403) {
        setIsAdmin(false);
      }
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleReg = async () => {
    setSaving(true);
    try {
      const next = !regEnabled;
      await client.put('/settings', { regEnabled: next });
      setRegEnabled(next);
      toast.success(next ? '已开放注册' : '已关闭注册');
    } catch {
      toast.error('操作失败，仅管理员可修改');
    } finally {
      setSaving(false);
    }
  };

  const changeRole = async (id: string, role: UserRole) => {
    setChangingId(id);
    try {
      await client.put(`/users/${id}/role`, { role });
      toast.success('角色已更新，该用户需重新登录后生效');
      await load();
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || '更新失败';
      toast.error(msg);
    } finally {
      setChangingId(null);
    }
  };

  const saveCollege = async (id: string, college: string) => {
    try {
      await client.put(`/users/${id}/role`, { college: college.trim() });
      toast.success('学院已更新');
      await load();
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || '保存失败';
      toast.error(msg);
    }
  };

  const deleteUser = async (id: string) => {
    if (!confirm('确定删除该用户？其所有数据（学生/台账/谈心/任务）将一并删除。')) return;
    try {
      await client.delete(`/users/${id}`);
      toast.success('已删除');
      await load();
    } catch {
      toast.error('删除失败');
    }
  };

  // 非管理员：不展示管理入口（修复此前「能看到注册开关但操作被 403」的问题）
  if (!isAdmin) return null;

  return (
    <Card title={<><Users className="h-5 w-5" />用户管理</>} subtitle="管理注册开关、用户账户与角色分级（系统管理员）">
      <div className="mb-4 flex items-center justify-between border-b border-slate-200 py-3 dark:border-slate-800">
        <div>
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">开放注册</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{regEnabled ? '当前允许新用户注册' : '当前已关闭注册'}</p>
        </div>
        <span className="flex items-center gap-2">
          <span className="text-xs text-slate-400">{regEnabled ? '已开启' : '已关闭'}</span>
          <label className="relative inline-flex h-5 w-9 cursor-pointer items-center">
            <input type="checkbox" checked={regEnabled} onChange={toggleReg} disabled={saving} className="peer sr-only" />
            <span className={`h-5 w-9 rounded-full transition-colors ${regEnabled ? 'bg-brand-600' : 'bg-slate-300 dark:bg-slate-700'} peer-disabled:opacity-50`} />
            <span className={`absolute left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${regEnabled ? 'translate-x-4' : ''}`} />
          </label>
        </span>
      </div>

      <div className="space-y-1">
        {users.map((u) => {
          const badge = ROLE_BADGE[u.role] || ROLE_BADGE.user;
          return (
            <div key={u.id} className="flex items-center justify-between gap-3 border-b border-slate-100 py-2 last:border-0 dark:border-slate-800">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{u.name}</p>
                  {u.id === user?.id && <Badge tone="blue">当前</Badge>}
                  <Badge tone={badge.tone}>{badge.label}</Badge>
                </div>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">{u.email}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <input
                  defaultValue={u.college || ''}
                  placeholder="所属学院"
                  onBlur={(e) => { if ((e.target.value || '').trim() !== (u.college || '')) saveCollege(u.id, e.target.value); }}
                  title="设置该用户所属学院（同学院辅导员共享学生/台账数据）"
                  className="w-28 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                />
                <select
                  value={u.role}
                  disabled={u.id === user?.id || changingId === u.id}
                  onChange={(e) => changeRole(u.id, e.target.value as UserRole)}
                  title={u.id === user?.id ? '不能修改自己的角色' : '切换角色（用户需重新登录生效）'}
                  className="cursor-pointer rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 shadow-sm focus:border-brand-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
                {u.id !== user?.id && (
                  <button
                    onClick={() => deleteUser(u.id)}
                    aria-label="删除用户"
                    title="删除用户"
                    className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
        <span className="font-medium text-slate-600 dark:text-slate-300">角色说明</span>：普通用户可用的全部业务功能（学生/台账/谈心/任务/通知/导出），院系管理员在普通用户基础上获得院系管理标识；系统管理员额外拥有用户管理、备份、审计日志与系统配置权限。切换角色后需重新登录生效。
      </p>
    </Card>
  );
}
