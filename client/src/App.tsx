import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './stores/authStore';
import { initTheme } from './stores/themeStore';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import CalendarPage from './pages/CalendarPage';
import SettingsPage from './pages/SettingsPage';
import InspirationPage from './pages/InspirationPage';
import StudentsPage from './pages/StudentsPage';
import MentalPage from './pages/MentalPage';
import CounselingPage from './pages/CounselingPage';
import ExportsPage from './pages/ExportsPage';
import StatsPage from './pages/StatsPage';
import NoticesPage from './pages/NoticesPage';
import AppLayout from './components/layout/AppLayout';
import AuthLayout from './components/layout/AuthLayout';
import ErrorBoundary from './components/ErrorBoundary';
import ToastContainer from './components/ui/Toast';

// 应用启动时同步初始化：主题 + 登录态（必须在首次渲染前完成，否则
// ProtectedRoute 会把整页刷新的深链（如 /students）重定向回首页）
initTheme();
useAuthStore.getState().hydrate();

// 各路由对应的浏览器标签页标题
const PAGE_TITLES: Record<string, string> = {
  '/login': '登录',
  '/register': '注册',
  '/': '今日概览',
  '/stats': '数据看板',
  '/calendar': '日历',
  '/students': '学生管理',
  '/mental': '心理台账',
  '/counseling': '谈心记录',
  '/notices': '通知看板',
  '/exports': '导出中心',
  '/inspiration': '灵感',
  '/settings': '设置',
};
const APP_NAME = '辅导员智能工作台';

function PageTitle() {
  const location = useLocation();
  useEffect(() => {
    const page = PAGE_TITLES[location.pathname];
    document.title = page ? `${page} · ${APP_NAME}` : APP_NAME;
  }, [location.pathname]);
  return null;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <PageTitle />
        <Routes>
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>
          <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/stats" element={<StatsPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/students" element={<StudentsPage />} />
            <Route path="/mental" element={<MentalPage />} />
            <Route path="/counseling" element={<CounselingPage />} />
            <Route path="/notices" element={<NoticesPage />} />
            <Route path="/exports" element={<ExportsPage />} />
            <Route path="/inspiration" element={<InspirationPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <ToastContainer />
    </ErrorBoundary>
  );
}
