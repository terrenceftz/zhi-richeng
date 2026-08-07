import { Moon, Sun } from 'lucide-react';
import { useThemeStore } from '../../stores/themeStore';

export default function ThemeToggle() {
  const { theme, toggle } = useThemeStore();
  const isDark = theme === 'dark';
  return (
    <button
      onClick={toggle}
      aria-label={isDark ? '切换到亮色模式' : '切换到深色模式'}
      title={isDark ? '切换到亮色模式' : '切换到深色模式'}
      className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
    >
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}
