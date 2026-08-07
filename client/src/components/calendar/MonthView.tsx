import { useMemo } from 'react';
import type { Task } from '../../types';
import { isOverdue } from '../../types';
import { getHoliday } from '../../utils/holidays';

interface MonthViewProps {
  year: number;
  month: number;
  selectedDate: string;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onDateSelect: (date: string) => void;
}

export default function MonthView({ year, month, selectedDate, tasks, onTaskClick, onDateSelect }: MonthViewProps) {
  const days = useMemo(() => {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const startPad = firstDay.getDay();
    const result: (number | null)[] = [];
    for (let i = 0; i < startPad; i++) result.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) result.push(d);
    return result;
  }, [year, month]);

  const tasksByDate = useMemo(() => {
    const map: Record<string, Task[]> = {};
    tasks.forEach((t) => {
      const dk = t.dueDate?.slice(0, 10);
      if (dk) {
        if (!map[dk]) map[dk] = [];
        map[dk].push(t);
      }
    });
    return map;
  }, [tasks]);

  const fmt = (d: number) => `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  return (
    <div>
      <div className="mb-2 grid grid-cols-7 gap-1">
        {['日', '一', '二', '三', '四', '五', '六'].map((d) => (
          <div key={d} className="py-2 text-center text-xs font-medium text-slate-400 dark:text-slate-500">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((d, i) => {
          if (d === null) return <div key={i} className="aspect-square rounded-lg bg-slate-50/50 dark:bg-slate-900/50" />;
          const ds = fmt(d);
          const holiday = getHoliday(ds);
          const dayTasks = tasksByDate[ds] || [];
          const isSelected = ds === selectedDate;
          const isToday = ds === new Date().toISOString().slice(0, 10);
          const isRestDay = holiday?.isRestDay;
          const isStatutory = holiday?.isStatutory;

          return (
            <div
              key={i}
              onClick={() => onDateSelect(ds)}
              className={`aspect-square cursor-pointer overflow-hidden rounded-lg border p-1 transition-colors ${
                isSelected
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10'
                  : isToday
                    ? 'border-brand-300 bg-white dark:border-brand-500/40 dark:bg-slate-900'
                    : isRestDay
                      ? 'border-red-200 bg-red-50/40 dark:border-red-500/20 dark:bg-red-500/5'
                      : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700'
              }`}
            >
              <div className="mb-0.5 flex items-center gap-0.5 px-0.5">
                <span
                  className={`text-xs font-medium ${
                    isToday
                      ? 'flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-white'
                      : isStatutory
                        ? 'text-red-500'
                        : isRestDay
                          ? 'text-red-400'
                          : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {d}
                </span>
                {isStatutory && holiday && (
                  <span className="truncate text-[9px] font-medium leading-none text-red-400">{holiday.name}</span>
                )}
              </div>

              <div className="space-y-0.5">
                {dayTasks.slice(0, 2).map((task) => (
                  <div
                    key={task.id}
                    onClick={(e) => { e.stopPropagation(); onTaskClick(task); }}
                    className={`truncate rounded px-1 py-0.5 text-[10px] font-medium text-white ${
                      isOverdue(task) ? 'bg-red-500' : 'bg-brand-600'
                    }`}
                  >
                    {isOverdue(task) ? '🔴 ' : ''}{task.title}
                  </div>
                ))}
                {dayTasks.length > 2 && (
                  <div className="px-1 text-[10px] text-slate-400">+{dayTasks.length - 2}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
