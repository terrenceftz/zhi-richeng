import { type ReactNode } from 'react';

export default function Card({ children, title, subtitle, icon }: { children: ReactNode; title?: ReactNode; subtitle?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card dark:border-slate-800 dark:bg-slate-900">
      {title && (
        <div className="mb-4">
          <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-slate-100">
            {icon}{title}
          </h3>
          {subtitle && <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  );
}
