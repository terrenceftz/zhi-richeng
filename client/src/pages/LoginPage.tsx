import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useToastStore } from '../stores/toastStore';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Switch from '../components/ui/Switch';

const EMAIL_KEY = 'rememberedEmail';
const PASSWORD_KEY = 'rememberedPassword';

export default function LoginPage() {
  // 首次渲染时直接读取上次记住的凭据
  const [email, setEmail] = useState(() => localStorage.getItem(EMAIL_KEY) ?? '');
  const [password, setPassword] = useState(() => localStorage.getItem(PASSWORD_KEY) ?? '');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberAccount, setRememberAccount] = useState(() => !!localStorage.getItem(EMAIL_KEY));
  const [rememberPassword, setRememberPassword] = useState(() => !!localStorage.getItem(PASSWORD_KEY));
  const { login, isLoading, error, clearError, isAuthenticated } = useAuthStore();
  const toast = useToastStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) navigate('/', { replace: true });
  }, [isAuthenticated, navigate]);

  const handleRememberAccount = (checked: boolean) => {
    setRememberAccount(checked);
    if (checked && email) localStorage.setItem(EMAIL_KEY, email);
    else localStorage.removeItem(EMAIL_KEY);
  };

  const handleRememberPassword = (checked: boolean) => {
    setRememberPassword(checked);
    if (checked && password) localStorage.setItem(PASSWORD_KEY, password);
    else localStorage.removeItem(PASSWORD_KEY);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      await login(email, password);
      // 登录成功后按开关持久化/清除记住的凭据
      if (rememberAccount && email) localStorage.setItem(EMAIL_KEY, email);
      else localStorage.removeItem(EMAIL_KEY);
      if (rememberPassword && password) localStorage.setItem(PASSWORD_KEY, password);
      else localStorage.removeItem(PASSWORD_KEY);
      navigate('/', { replace: true });
    } catch {
      /* 错误已在 store 中 */
    }
  };

  const handleForgotPassword = () => {
    toast.info('请通过飞书联系管理员重置密码');
  };

  return (
    <div>
      <h2 className="mb-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">欢迎回来</h2>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">登录以继续使用辅导员工作台</p>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="邮箱"
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          autoComplete="email"
        />
        <Input
          label="密码"
          id="password"
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="输入密码"
          required
          autoComplete="current-password"
          rightElement={
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? '隐藏密码' : '显示密码'}
              className="rounded-md p-1 text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-200"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
        />

        <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/40">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">记住账号</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">下次打开自动填充登录邮箱</p>
            </div>
            <Switch checked={rememberAccount} onChange={handleRememberAccount} label="记住账号" />
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-2 dark:border-slate-800">
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">记住密码</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">仅在个人设备上启用</p>
            </div>
            <Switch checked={rememberPassword} onChange={handleRememberPassword} label="记住密码" />
          </div>
        </div>

        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={handleForgotPassword}
            className="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
          >
            忘记密码？
          </button>
        </div>

        <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
          {isLoading ? '登录中...' : '登录'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
        还没有账号？{' '}
        <Link to="/register" className="font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
          注册
        </Link>
      </p>

      <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
        演示账号：demo@zhi.com / 123456
      </div>
    </div>
  );
}
