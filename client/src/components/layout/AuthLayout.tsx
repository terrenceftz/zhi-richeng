import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-dark p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-accent to-primary-light bg-clip-text text-transparent">
            智日程
          </h1>
          <p className="text-muted mt-2">智能管理你的每一天</p>
        </div>
        <div className="bg-surface border border-[#353560] rounded-2xl p-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
