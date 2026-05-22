import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading, error, clearError, hydrate } = useAuthStore();
  const navigate = useNavigate();

  hydrate();

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
      <h2 className="text-xl font-bold mb-6">登录</h2>
      {error && <p className="text-danger text-sm mb-4 bg-danger/10 p-3 rounded-lg">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="邮箱" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" required />
        <Input label="密码" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="输入密码" required />
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? '登录中...' : '登录'}
        </Button>
      </form>
      <p className="text-muted text-sm text-center mt-4">
        还没有账号？<Link to="/register" className="text-primary hover:underline">注册</Link>
      </p>
    </div>
  );
}
