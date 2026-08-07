import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldBan } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import client from '../api/client';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [regOpen, setRegOpen] = useState(true);
  const { register, isLoading, error, clearError, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    client.get('/settings').then((r) => setRegOpen(r.data.regEnabled === 'true')).catch(() => {});
  }, []);

  useEffect(() => {
    if (isAuthenticated) navigate('/', { replace: true });
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      await register(email, password, name);
      navigate('/', { replace: true });
    } catch {
      /* 错误已在 store 中 */
    }
  };

  return (
    <div>
      <h2 className="mb-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">创建账号</h2>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">注册一个辅导员工作台账号</p>

      {!regOpen ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 py-10 text-center dark:border-slate-800 dark:bg-slate-800/50">
          <ShieldBan className="mx-auto mb-3 h-10 w-10 text-slate-400" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">注册已关闭</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">请联系管理员开通账号</p>
          <Link to="/login" className="mt-4 inline-block text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
            返回登录
          </Link>
        </div>
      ) : (
        <>
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="昵称" id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="你的名字" required />
            <Input label="邮箱" id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" required />
            <Input label="密码" id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="至少6位密码" required minLength={6} />
            <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
              {isLoading ? '注册中...' : '注册'}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
            已有账号？{' '}
            <Link to="/login" className="font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
              登录
            </Link>
          </p>
        </>
      )}
    </div>
  );
}
