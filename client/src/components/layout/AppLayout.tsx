import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function AppLayout() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-64 p-6 lg:p-8 max-md:ml-0 max-md:pb-20">
        <Outlet />
      </main>
      <nav className="hidden max-md:flex fixed bottom-0 left-0 right-0 bg-surface border-t border-[#252547] z-40 justify-around py-2">
        <a href="/" className="flex flex-col items-center text-xs text-muted hover:text-primary px-4 py-1">
          <span className="text-lg">📋</span>概览
        </a>
        <a href="/calendar" className="flex flex-col items-center text-xs text-muted hover:text-primary px-4 py-1">
          <span className="text-lg">📅</span>日历
        </a>
      </nav>
    </div>
  );
}
