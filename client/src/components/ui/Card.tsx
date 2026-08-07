import { type HTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** 是否去掉默认的内边距 */
  noPadding?: boolean;
  /** 是否使用 hover 效果 */
  hoverable?: boolean;
}

export default function Card({ className, noPadding, hoverable, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-slate-200 bg-white shadow-card dark:border-slate-800 dark:bg-slate-900',
        hoverable && 'transition-shadow hover:shadow-card-hover',
        !noPadding && 'p-5',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action }: { title: React.ReactNode; subtitle?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
