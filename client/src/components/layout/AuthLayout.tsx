import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import ThemeToggle from '../ui/ThemeToggle';
import { fetchWallpaper, type BingWallpaper } from '../../api/wallpaper';

export default function AuthLayout() {
  const [wallpaper, setWallpaper] = useState<BingWallpaper | null>(null);

  // 拉取必应每日壁纸；失败时保持品牌渐变兜底
  useEffect(() => {
    let alive = true;
    fetchWallpaper().then((w) => {
      if (alive) setWallpaper(w);
    });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* 必应每日壁纸背景 */}
      {wallpaper && (
        <img
          src={wallpaper.url}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}

      {/* 品牌渐变遮罩：保证文字可读，深色模式更深 */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand-950/80 via-brand-900/40 to-black/60 dark:from-slate-950/90 dark:via-slate-900/70 dark:to-black/80" />

      {/* 主题切换 */}
      <div className="absolute right-4 top-4 z-20">
        <ThemeToggle />
      </div>

      {/* 壁纸版权角标 */}
      {wallpaper?.copyright && (
        <p className="absolute bottom-3 left-4 z-20 hidden max-w-md truncate text-xs text-white/60 lg:block">
          {wallpaper.copyright}
        </p>
      )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 flex w-full"
      >
        {/* 左侧品牌区 */}
        <div className="hidden flex-1 flex-col justify-between p-12 lg:flex">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 text-xl font-bold text-white backdrop-blur">
              智
            </div>
            <span className="text-lg font-semibold text-white drop-shadow">智日程</span>
          </div>
          <div className="max-w-md">
            <h2 className="text-3xl font-bold leading-tight text-white drop-shadow-md">
              辅导员智能工作台
            </h2>
            <p className="mt-3 text-brand-100">
              一句话创建任务、AI 解析通知材料、学生花名册与谈心记录、飞书自动提醒——把琐碎事务交给智日程。
            </p>
            <ul className="mt-6 space-y-2 text-sm text-brand-100">
              <li>· 自然语言建任务，自动识别时间/地点/优先级</li>
              <li>· 粘贴通知一键提取材料上报清单</li>
              <li>· 日历三视图 + 冲突检测 + 每日简报</li>
            </ul>
          </div>
          <p className="text-xs text-brand-200">© {new Date().getFullYear()} 智日程 · MIT</p>
        </div>

        {/* 右侧表单区 */}
        <div className="flex min-h-screen flex-1 items-center justify-center p-4 sm:p-6">
          <div className="w-full max-w-sm">
            {/* 移动端品牌 */}
            <div className="mb-6 text-center lg:hidden">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 text-xl font-bold text-white shadow-sm backdrop-blur">
                智
              </div>
              <h1 className="text-xl font-semibold text-white drop-shadow">智日程</h1>
              <p className="text-sm text-white/80">辅导员智能工作台</p>
            </div>

            {/* 毛玻璃卡片 */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
              className="rounded-2xl border border-white/25 bg-white/75 p-6 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-7 dark:border-white/10 dark:bg-slate-900/65"
            >
              <Outlet />
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
