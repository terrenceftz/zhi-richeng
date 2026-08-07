import { useState, useEffect } from 'react';
import { Users, Trash2 } from 'lucide-react';
import client from '../../api/client';
import { useAuthStore } from '../../stores/authStore';
import { useToastStore } from '../../stores/toastStore';
import Card from './Card';
import Switch from '../ui/Switch';
import Badge from '../ui/Badge';

interface UserRow {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
}

export default function UsersCard() {
  const { user } = useAuthStore();
  const toast = useToastStore();
  const [regEnabled, setRegEnabled] = useState(false);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [saving, setSaving] = useState(false);

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
        try {
          const sr = await client.get('/settings');
          setRegEnabled(sr.data.regEnabled === 'true');
        } catch {
          /* 忽略 */
        }
      }
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  const toggleReg = async () => {
    setSaving(true);
    try {
      await client.put('/settings', { regEnabled: !regEnabled });
      setRegEnabled(!regEnabled);
      toast.success('已更新');
    } catch {
      toast.error('更新失败');
    } finally {
      setSaving(false);
    }
  };

  const deleteUser = async (id: string) => {
    if (!confirm('确定删除该用户及其所有数据？此操作不可恢复。')) return;
    try {
      await client.delete(`/users/${id}`);
      toast.success('已删除');
      load();
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      toast.error(status === 403 ? '仅管理员可删除用户' : '删除失败');
    }
  };

  // 非管理员只显示注册开关
  if (!isAdmin) {
    return (
      <Card title={<><Users className="h-5 w-5" />用户管理</>} subtitle="管理注册开关">
        <div className="flex items-center justify-between py-1">
          <div>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">开放注册</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{regEnabled ? '当前允许新用户注册' : '当前已关闭注册'}</p>
          </div>
          <Switch checked={regEnabled} onChange={toggleReg} disabled={saving} label="开放注册" />
        </div>
      </Card>
    );
  }

  return (
    <Card title={<><Users className="h-5 w-5" />用户管理</>} subtitle="管理注册开关和用户账户（管理员）">
      <div className="mb-3 flex items-center justify-between border-b border-slate-200 py-3 dark:border-slate-800">
        <div>
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">开放注册</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{regEnabled ? '当前允许新用户注册' : '当前已关闭注册'}</p>
        </div>
        <Switch checked={regEnabled} onChange={toggleReg} disabled={saving} label="开放注册" />
      </div>

      <div className="space-y-1">
        {users.map((u) => (
          <div key={u.id} className="flex items-center justify-between border-b border-slate-100 py-2 last:border-0 dark:border-slate-800">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{u.name}</p>
                {u.id === user?.id && <Badge tone="blue">当前</Badge>}
                {u.role === 'admin' && <Badge tone="brand">管理员</Badge>}
              </div>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">{u.email}</p>
            </div>
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
        ))}
      </div>
    </Card>
  );
}
