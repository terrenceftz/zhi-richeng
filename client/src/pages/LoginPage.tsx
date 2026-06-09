import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading, error, clearError, hydrate, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    hydrate();
  }, []);

  useEffect(() => {
    if (isAuthenticated) navigate('/', { replace: true });
  }, [isAuthenticated]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch {}
  };

  return (
    <div>
      <h2 className="text-xl font-black mb-6 flex items-center gap-2">
        <LogIn className="w-5 h-5" />
        登录
      </h2>
      {error && (
        <p className="text-red-500 text-sm font-bold mb-4 bg-red-50 border-2 border-red-500 p-3 rounded-xl">{error}</p>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="邮箱" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" required />
        <Input label="密码" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="输入密码" required />
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? '登录中...' : '登录'}
        </Button>
      </form>
      <p className="font-bold text-sm text-center mt-4 opacity-50">
        还没有账号？<Link to="/register" className="text-black underline hover:opacity-70">注册</Link>
      </p>
    </div>
  );
}
