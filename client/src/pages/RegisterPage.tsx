import { useState, FormEvent, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, ShieldBan } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import client from '../api/client';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [regOpen, setRegOpen] = useState(true);
  const { register, isLoading, error, clearError, hydrate, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    hydrate();
    client.get('/settings').then(r => {
      setRegOpen(r.data.regEnabled === 'true');
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (isAuthenticated) navigate('/', { replace: true });
  }, [isAuthenticated]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      await register(email, password, name);
      navigate('/', { replace: true });
    } catch {}
  };

  return (
    <div>
      <h2 className="text-xl font-black mb-6 flex items-center gap-2">
        <UserPlus className="w-5 h-5" />
        注册
      </h2>
      {!regOpen ? (
        <div className="text-center py-4">
          <ShieldBan className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-black">注册已关闭</p>
          <p className="text-xs font-bold opacity-50 mt-1">请联系管理员开通账号</p>
          <Link to="/login" className="inline-block mt-4 text-sm font-bold text-black underline hover:opacity-70">返回登录</Link>
        </div>
      ) : (
        <>
          {error && (
            <p className="text-red-500 text-sm font-bold mb-4 bg-red-50 border-2 border-red-500 p-3 rounded-xl">{error}</p>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="昵称" value={name} onChange={(e) => setName(e.target.value)} placeholder="你的名字" required />
            <Input label="邮箱" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" required />
            <Input label="密码" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="至少6位密码" required minLength={6} />
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? '注册中...' : '注册'}
            </Button>
          </form>
          <p className="font-bold text-sm text-center mt-4 opacity-50">
            已有账号？<Link to="/login" className="text-black underline hover:opacity-70">登录</Link>
          </p>
        </>
      )}
    </div>
  );
}
