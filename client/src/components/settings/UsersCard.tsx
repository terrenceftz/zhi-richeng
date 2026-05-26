import { useState, useEffect } from 'react';
import { Users, Trash2 } from 'lucide-react';
import client from '../../api/client';
import { useAuthStore } from '../../stores/authStore';

interface UserRow { id: string; email: string; name: string; createdAt: string; }
interface SettingsData { regEnabled: boolean; users: UserRow[]; isAdmin: boolean; }

export default function UsersCard() {
  const { user } = useAuthStore();
  const [data, setData] = useState<SettingsData>({ regEnabled: false, users: [], isAdmin: false });
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const [sr, ur] = await Promise.all([client.get('/settings'), client.get('/users')]);
      const users: UserRow[] = ur.data.users || [];
      setData({
        regEnabled: sr.data.regEnabled === 'true',
        users,
        isAdmin: user?.email === 'admin@mboker.cn',
      });
    } catch {}
  };

  const toggleReg = async () => {
    setSaving(true);
    try {
      await client.put('/settings', { regEnabled: !data.regEnabled });
      setData({ ...data, regEnabled: !data.regEnabled });
      setMsg('已更新');
      setTimeout(() => setMsg(''), 2000);
    } catch { setMsg('更新失败'); }
    finally { setSaving(false); }
  };

  const deleteUser = async (id: string) => {
    if (!confirm('确定删除该用户及其所有数据？此操作不可恢复。')) return;
    try {
      await client.delete(`/users/${id}`);
      setMsg('已删除');
      setTimeout(() => { setMsg(''); load(); }, 1000);
    } catch { setMsg('删除失败'); }
  };

  return (
    <div className="bg-white border-2 border-black rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
      <h3 className="text-lg font-black mb-1 flex items-center gap-2">
        <Users className="w-5 h-5" />
        用户管理
      </h3>
      <p className="font-bold text-sm opacity-50 mb-4">管理注册开关和用户账户</p>

      {/* Registration toggle */}
      <div className="flex items-center justify-between py-3 border-b-2 border-black mb-3">
        <div>
          <p className="font-black text-sm">开放注册</p>
          <p className="text-xs font-bold opacity-50">{data.regEnabled ? '当前允许新用户注册' : '当前已关闭注册'}</p>
        </div>
        <button
          onClick={toggleReg}
          disabled={saving}
          className={`w-12 h-6 rounded-full border-2 border-black transition-colors relative ${data.regEnabled ? 'bg-coral' : 'bg-gray-300'}`}
        >
          <div className={`w-4 h-4 bg-white border border-black rounded-full absolute top-0.5 transition-transform ${data.regEnabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
        </button>
      </div>

      {/* User list */}
      <div className="space-y-2">
        {data.users.map((u) => (
          <div key={u.id} className="flex items-center justify-between py-2 border-b border-black/20 last:border-0">
            <div>
              <p className="text-sm font-black">{u.name} {u.id === user?.id && <span className="text-xs bg-blue border border-black rounded-full px-2 py-0.5 ml-1">当前</span>}{u.id === data.users[0]?.id && !data.isAdmin ? '' : u.id === data.users[0]?.id ? <span className="text-xs bg-coral border border-black rounded-full px-2 py-0.5 ml-1">管理员</span> : null}</p>
              <p className="text-xs font-bold opacity-50">{u.email}</p>
            </div>
            {data.isAdmin && u.id !== user?.id && (
              <button
                onClick={() => deleteUser(u.id)}
                className="p-2 border-2 border-black rounded-xl hover:bg-rose transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                title="删除用户"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>
      {msg && <p className="text-sm font-bold text-green-600 mt-3">{msg}</p>}
    </div>
  );
}
