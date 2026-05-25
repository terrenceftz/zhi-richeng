import { Outlet, NavLink } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function AppLayout() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-64 p-6 lg:p-8 max-md:ml-0 max-md:pb-20">
        <Outlet />
      </main>
      <nav className="hidden max-md:flex fixed bottom-0 left-0 right-0 bg-surface border-t border-border z-40 justify-around py-2">
        <NavLink to="/" end className={({ isActive }) => `flex flex-col items-center text-xs px-4 py-1 ${isActive ? 'text-primary' : 'text-muted'}`}>
          <span className="text-lg">📋</span>概览
        </NavLink>
        <NavLink to="/calendar" className={({ isActive }) => `flex flex-col items-center text-xs px-4 py-1 ${isActive ? 'text-primary' : 'text-muted'}`}>
          <span className="text-lg">📅</span>日历
        </NavLink>
      </nav>
    </div>
  );
}
