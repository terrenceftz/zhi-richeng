import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-coral rounded-2xl flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] border-2 border-black mx-auto mb-4">
            <span className="text-white text-3xl font-black">智</span>
          </div>
          <h1 className="text-3xl font-black text-black">智日程</h1>
          <p className="text-coral font-serif italic mt-1">AI 驱动的智能日程管理</p>
        </div>
        <div className="bg-white border-2 border-black rounded-[32px] p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
