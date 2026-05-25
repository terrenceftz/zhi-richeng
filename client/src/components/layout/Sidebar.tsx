import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import ThemeToggle from '../ui/ThemeToggle';

const navItems = [
  { to: '/', label: '今日概览', icon: '📋' },
  { to: '/calendar', label: '日历', icon: '📅' },
  { to: '/inspiration', label: '灵感', icon: '💡' },
  { to: '/settings', label: '设置', icon: '⚙️' },
];

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside className="w-64 h-screen bg-surface border-r border-border flex flex-col fixed left-0 top-0 z-40">
      <div className="p-6">
        <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          智日程
        </h1>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all ${
                isActive
                  ? 'bg-primary/20 text-primary font-medium'
                  : 'text-muted hover:text-text hover:bg-surface-light'
              }`
            }
          >
            <span>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-border space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xs font-bold">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <span className="text-sm text-text truncate">{user?.name || '用户'}</span>
          </div>
          <ThemeToggle />
        </div>
        <button
          onClick={handleLogout}
          className="w-full text-left text-xs text-muted hover:text-danger transition-colors px-2"
        >
          退出登录
        </button>
      </div>
    </aside>
  );
}
