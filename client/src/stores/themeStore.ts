import { create } from 'zustand';

type Theme = 'light' | 'dark';

/** 主题色板（palette）：决定 brand 主色系，与明暗模式正交 */
export type Palette = 'default' | 'ocean' | 'forest' | 'amber' | 'violet' | 'kirby';

export interface PaletteMeta {
  key: Palette;
  name: string;
  desc: string;
  /** 色板缩略图：展示用（50/200/400/600/800 五个档位） */
  swatches: string[];
  /** 是否为带素材的特色主题（影响背景/装饰） */
  special?: boolean;
}

export const PALETTES: PaletteMeta[] = [
  { key: 'default', name: '默认 · 靛蓝', desc: '经典品牌配色', swatches: ['#eef2ff', '#c7d2fe', '#818cf8', '#4f46e5', '#3730a3'] },
  { key: 'ocean', name: '学府蓝', desc: '沉稳学术蓝', swatches: ['#eff6ff', '#bfdbfe', '#60a5fa', '#2563eb', '#1e40af'] },
  { key: 'forest', name: '青翠', desc: '清新自然绿', swatches: ['#ecfdf5', '#a7f3d0', '#34d399', '#059669', '#065f46'] },
  { key: 'amber', name: '暖阳', desc: '温暖活力橙', swatches: ['#fffbeb', '#fde68a', '#fbbf24', '#d97706', '#92400e'] },
  { key: 'violet', name: '典雅紫', desc: '优雅神秘紫', swatches: ['#f5f3ff', '#ddd6fe', '#a78bfa', '#7c3aed', '#5b21b6'] },
  { key: 'kirby', name: '星之卡比', desc: '粉色梦幻 · 含专属素材', swatches: ['#fdf2f8', '#fbcfe8', '#f472b6', '#db2777', '#9d174d'], special: true },
];

export const DEFAULT_PALETTE: Palette = 'default';

interface ThemeState {
  theme: Theme;
  palette: Palette;
  toggle: () => void;
  setTheme: (t: Theme) => void;
  setPalette: (p: Palette) => void;
}

/** 把明暗 + 色板应用到 <html> 上 */
function applyTheme(theme: Theme, palette: Palette) {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.classList.toggle('light', theme === 'light');
  root.style.colorScheme = theme;
  root.dataset.palette = palette;

  const favicon = document.querySelector<HTMLLinkElement>('link[rel~="icon"]');
  if (favicon) {
    favicon.href = palette === 'kirby' ? '/themes/kirby/icon.png' : '/favicon.svg';
    favicon.type = palette === 'kirby' ? 'image/png' : 'image/svg+xml';
  }
}

function getStored<T extends string>(key: string, valid: readonly T[], fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  const v = localStorage.getItem(key) as T | null;
  return v && valid.includes(v) ? v : fallback;
}

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  const stored = localStorage.getItem('theme');
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getInitialPalette(): Palette {
  return getStored<Palette>('palette', PALETTES.map((p) => p.key), DEFAULT_PALETTE);
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: getInitialTheme(),
  palette: getInitialPalette(),

  toggle: () => {
    const next: Theme = get().theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', next);
    applyTheme(next, get().palette);
    set({ theme: next });
  },

  setTheme: (t) => {
    localStorage.setItem('theme', t);
    applyTheme(t, get().palette);
    set({ theme: t });
  },

  setPalette: (p) => {
    localStorage.setItem('palette', p);
    applyTheme(get().theme, p);
    set({ palette: p });
  },
}));

/** 应用启动时调用，把明暗 + 色板同步到 DOM */
export function initTheme() {
  const { theme, palette } = useThemeStore.getState();
  applyTheme(theme, palette);
}
