import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { LayoutDashboard, Calendar, Lightbulb, Settings, LogOut } from 'lucide-react';

const navItems = [
  { to: '/', label: '今日概览', icon: LayoutDashboard },
  { to: '/calendar', label: '日历', icon: Calendar },
  { to: '/inspiration', label: '灵感', icon: Lightbulb },
  { to: '/settings', label: '设置', icon: Settings },
];

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside className="w-64 bg-bg p-6 flex flex-col h-full shrink-0">
      <div className="flex items-center gap-4 mb-10">
        <div className="w-12 h-12 bg-coral rounded-2xl flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] border-2 border-black">
          <span className="text-white text-2xl font-black">智</span>
        </div>
        <div>
          <h1 className="text-xl font-black text-black tracking-tight">智日程</h1>
          <span className="text-coral font-serif italic font-normal text-sm block -mt-1">ZhiRicheng</span>
        </div>
      </div>

      <nav className="flex-1 flex flex-col gap-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 border-2 font-bold ${
                  isActive
                    ? 'border-black bg-blue shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-black'
                    : 'border-transparent text-gray-600 hover:border-black hover:bg-white hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="mt-auto flex items-center gap-4 p-3 bg-white rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] border-2 border-black">
        <div className="w-10 h-10 bg-mint border-2 border-black rounded-xl flex items-center justify-center text-lg overflow-hidden shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
          {user?.name?.charAt(0) || 'U'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-black text-black truncate text-sm">{user?.name || '用户'}</p>
          <p className="text-xs text-gray-500 font-bold truncate">在线</p>
        </div>
        <button onClick={handleLogout} className="p-2 hover:bg-rose rounded-lg transition-colors" title="退出">
          <LogOut className="w-4 h-4 text-gray-400" />
        </button>
      </div>
    </aside>
  );
}
