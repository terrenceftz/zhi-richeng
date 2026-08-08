import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '../../utils/cn';

export interface DropdownOption {
  value: string;
  label: ReactNode;
  disabled?: boolean;
}

/** 下拉弹层状态：打开/关闭 + 点击外部/ESC 关闭 */
export function useDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return { open, setOpen, ref };
}

/** 圆角卡片弹层：选项列表 */
export function DropdownPanel({ options, value, onSelect, onClose, align = 'left' }: {
  options: DropdownOption[];
  value: string;
  onSelect: (value: string) => void;
  onClose: () => void;
  align?: 'left' | 'right';
}) {
  return (
    <div
      className={cn(
        'absolute z-30 mt-1 max-h-60 min-w-full overflow-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-800',
        align === 'right' ? 'right-0' : 'left-0'
      )}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          disabled={o.disabled}
          onClick={() => { onSelect(o.value); onClose(); }}
          className={cn(
            'block w-full rounded-md px-2.5 py-1.5 text-left text-sm transition-colors',
            o.value === value
              ? 'bg-brand-50 font-medium text-brand-700 dark:bg-brand-500/15 dark:text-brand-300'
              : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700/60',
            o.disabled && 'cursor-not-allowed opacity-50'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
