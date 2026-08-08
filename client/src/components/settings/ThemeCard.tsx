import { Check } from 'lucide-react';
import { PALETTES, useThemeStore } from '../../stores/themeStore';
import Card from './Card';
import { cn } from '../../utils/cn';

/** 主题外观管理：选择品牌色板（与明暗模式正交） */
export default function ThemeCard() {
  const palette = useThemeStore((s) => s.palette);
  const setPalette = useThemeStore((s) => s.setPalette);

  return (
    <Card title="主题外观" subtitle="选择品牌主色主题，实时生效并保存">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {PALETTES.map((p) => {
          const active = palette === p.key;
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => setPalette(p.key)}
              className={cn(
                'group rounded-xl border p-3 text-left transition-all',
                active
                  ? 'border-brand-500 bg-brand-50 shadow-sm dark:bg-brand-500/10'
                  : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'
              )}
            >
              {/* 色板缩略图 */}
              <div className="flex h-8 w-full items-stretch gap-1 overflow-hidden rounded-md">
                {p.swatches.map((c, i) => (
                  <span key={i} className="flex-1" style={{ backgroundColor: c }} />
                ))}
              </div>
              <div className="mt-2 flex items-center justify-between gap-1">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">{p.name}</p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">{p.desc}</p>
                </div>
                {active && (
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white">
                    <Check className="h-3 w-3" />
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
        当前为「{PALETTES.find((p) => p.key === palette)?.name || '默认'}」主题 · 明暗模式仍由侧边栏「主题」开关控制
      </p>
    </Card>
  );
}
