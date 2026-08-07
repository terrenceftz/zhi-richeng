import { Loader2, Inbox } from 'lucide-react';
import { cn } from '../../utils/cn';

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('h-5 w-5 animate-spin text-brand-500', className)} />;
}

export function LoadingState({ text = '加载中...' }: { text?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-slate-500 dark:text-slate-400">
      <Spinner className="h-4 w-4" />
      <span className="text-sm">{text}</span>
    </div>
  );
}

export function EmptyState({ title, hint, icon }: { title: string; hint?: string; icon?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      <div className="rounded-full bg-slate-100 p-3 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
        {icon || <Inbox className="h-6 w-6" />}
      </div>
      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{title}</p>
      {hint && <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
    </div>
  );
}
