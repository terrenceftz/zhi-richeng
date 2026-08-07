import { type ReactNode } from 'react';
import { cn } from '../../utils/cn';

type Tone = 'brand' | 'gray' | 'green' | 'amber' | 'red' | 'blue';

const toneMap: Record<Tone, string> = {
  brand: 'bg-brand-100 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300',
  gray: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  green: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  amber: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  red: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
  blue: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
};

interface BadgeProps {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}

export default function Badge({ tone = 'gray', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        toneMap[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

/** 优先级徽章 */
export function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, { tone: Tone; label: string }> = {
    high: { tone: 'red', label: '高' },
    medium: { tone: 'amber', label: '中' },
    low: { tone: 'blue', label: '低' },
  };
  const { tone, label } = map[priority] || map.medium;
  return <Badge tone={tone}>{label}</Badge>;
}

/** 任务状态徽章 */
export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { tone: Tone; label: string }> = {
    todo: { tone: 'gray', label: '待办' },
    in_progress: { tone: 'brand', label: '进行中' },
    done: { tone: 'green', label: '完成' },
  };
  const { tone, label } = map[status] || map.todo;
  return <Badge tone={tone}>{label}</Badge>;
}
