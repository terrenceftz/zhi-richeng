import { useState, FormEvent, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { register, isLoading, error, clearError, hydrate, isAuthenticated } = useAuthStore();
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
      await register(email, password, name);
      navigate('/', { replace: true });
    } catch {}
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">注册</h2>
      {error && <p className="text-danger text-sm mb-4 bg-danger/10 p-3 rounded-lg">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="昵称" value={name} onChange={(e) => setName(e.target.value)} placeholder="你的名字" required />
        <Input label="邮箱" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" required />
        <Input label="密码" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="至少6位密码" required minLength={6} />
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? '注册中...' : '注册'}
        </Button>
      </form>
      <p className="text-muted text-sm text-center mt-4">
        已有账号？<Link to="/login" className="text-primary hover:underline">登录</Link>
      </p>
    </div>
  );
}
