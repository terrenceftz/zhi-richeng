import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function AppLayout() {
  return (
    <div className="h-screen w-screen flex items-center justify-center p-4 lg:p-8 bg-bg">
      <div className="w-full h-full max-w-[1400px] flex rounded-[32px] bg-bg shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] overflow-hidden border-2 border-black">
        <Sidebar />
        <main className="flex-1 flex relative overflow-hidden bg-white/50 border-l-2 border-black rounded-r-[32px]">
          <div className="absolute inset-0 overflow-y-auto p-6 lg:p-8 max-md:pb-20">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
