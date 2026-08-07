import { create } from 'zustand';

type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  toggle: () => void;
  setTheme: (t: Theme) => void;
}

/** 把主题应用到 <html> 的 class 上 */
function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.classList.toggle('light', theme === 'light');
  root.style.colorScheme = theme;
}

/** 初始主题：localStorage > 系统偏好 > light */
function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  const stored = localStorage.getItem('theme') as Theme | null;
  if (stored === 'light' || stored === 'dark') return stored;
  // 跟随系统
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: getInitialTheme(),

  toggle: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', next);
    applyTheme(next);
    set({ theme: next });
  },

  setTheme: (t) => {
    localStorage.setItem('theme', t);
    applyTheme(t);
    set({ theme: t });
  },
}));

/** 应用启动时调用，把主题同步到 DOM */
export function initTheme() {
  applyTheme(useThemeStore.getState().theme);
}
