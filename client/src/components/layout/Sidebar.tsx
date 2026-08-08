import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { LayoutDashboard, Calendar, Lightbulb, Settings, LogOut, GraduationCap, Bell, Heart, BarChart3, HeartHandshake, FileSpreadsheet, BookOpenText, ShieldCheck, Building2 } from 'lucide-react';
import ThemeToggle from '../ui/ThemeToggle';
import Badge from '../ui/Badge';

const navItems = [
  { to: '/', label: '今日概览', icon: LayoutDashboard },
  { to: '/stats', label: '数据看板', icon: BarChart3 },
  { to: '/calendar', label: '日历', icon: Calendar },
  { to: '/students', label: '学生管理', icon: GraduationCap },
  { to: '/mental', label: '心理台账', icon: Heart },
  { to: '/counseling', label: '谈心记录', icon: HeartHandshake },
  { to: '/notices', label: '通知看板', icon: Bell },
  { to: '/exports', label: '导出中心', icon: FileSpreadsheet },
  { to: '/inspiration', label: '灵感', icon: Lightbulb },
  { to: '/settings', label: '设置', icon: Settings },
];

export default function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside className="flex h-full w-full flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      {/* 品牌 */}
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-sm">
          <span className="text-lg font-bold">智</span>
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold text-slate-900 dark:text-slate-100">智日程</h1>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">辅导员智能工作台</p>
        </div>
      </div>

      {/* 导航 */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={onNavigate}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
                }`
              }
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* 页脚：使用指南 + 主题切换 */}
      <div className="flex items-center justify-between border-t border-slate-200 px-4 py-2 dark:border-slate-800">
        <NavLink
          to="/help"
          onClick={onNavigate}
          className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs text-slate-500 transition-colors hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-300"
        >
          <BookOpenText className="h-3.5 w-3.5" />
          使用指南
        </NavLink>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400">主题</span>
          <ThemeToggle />
        </div>
      </div>

      {/* 用户卡片 */}
      <div className="border-t border-slate-200 p-3 dark:border-slate-800">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{user?.name || '用户'}</p>
              {user?.role === 'admin' && (
                <span title="系统管理员" aria-label="系统管理员" className="flex items-center">
                  <Badge tone="brand" className="!px-1 !py-0.5"><ShieldCheck className="h-3.5 w-3.5" /></Badge>
                </span>
              )}
              {user?.role === 'dept_admin' && (
                <span title="院系管理员" aria-label="院系管理员" className="flex items-center">
                  <Badge tone="blue" className="!px-1 !py-0.5"><Building2 className="h-3.5 w-3.5" /></Badge>
                </span>
              )}
            </div>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            aria-label="退出登录"
            title="退出登录"
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-red-600 dark:hover:bg-slate-800 dark:hover:text-red-400"
          >
            <LogOut className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>
    </aside>
  );
}
