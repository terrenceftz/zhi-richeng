import { useMemo } from 'react';
import type { Task } from '../../types';
import { isOverdue } from '../../types';
import { getHoliday } from '../../utils/holidays';

interface WeekViewProps {
  selectedDate: string;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

function getWeekDates(dateStr: string): string[] {
  const d = new Date(dateStr);
  const day = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return Array.from({ length: 7 }, (_, i) => {
    const dt = new Date(monday);
    dt.setDate(monday.getDate() + i);
    return dt.toISOString().slice(0, 10);
  });
}

const prioritySoft: Record<string, string> = {
  high: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30',
  medium: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30',
  low: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:border-sky-500/30',
};

export default function WeekView({ selectedDate, tasks, onTaskClick }: WeekViewProps) {
  const weekDays = ['一', '二', '三', '四', '五', '六', '日'];
  const dates = useMemo(() => getWeekDates(selectedDate), [selectedDate]);

  return (
    <div>
      <div className="mb-2 grid grid-cols-7 gap-2">
        {dates.map((date, i) => {
          const holiday = getHoliday(date);
          const isStatutory = holiday?.isStatutory;
          return (
            <div
              key={date}
              className={`rounded-lg border p-2 text-center text-sm transition-colors ${
                date === selectedDate
                  ? 'border-brand-500 bg-brand-50 font-semibold text-brand-700 dark:bg-brand-500/10 dark:text-brand-300'
                  : isStatutory
                    ? 'border-red-200 bg-red-50/60 font-medium text-red-500 dark:bg-red-500/5'
                    : 'border-slate-200 bg-white font-medium text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400'
              }`}
            >
              <div>{weekDays[i]}</div>
              <div>{date.slice(8)}</div>
              {isStatutory && holiday && <div className="mt-0.5 text-[10px] opacity-80">{holiday.name}</div>}
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {dates.map((date) => {
          const dayTasks = tasks.filter((t) => t.dueDate?.slice(0, 10) === date);
          const isToday = date === new Date().toISOString().slice(0, 10);
          const holiday = getHoliday(date);
          const isRestDay = holiday?.isRestDay;
          return (
            <div
              key={date}
              className={`min-h-[120px] space-y-1 rounded-lg border p-2 ${
                isToday
                  ? 'border-brand-300 bg-brand-50/30 dark:border-brand-500/40 dark:bg-brand-500/5'
                  : isRestDay
                    ? 'border-red-200 bg-red-50/20 dark:border-red-500/20'
                    : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
              }`}
            >
              {dayTasks.slice(0, 3).map((task) => (
                <div
                  key={task.id}
                  onClick={() => onTaskClick(task)}
                  className={`cursor-pointer truncate rounded-md border px-2 py-1 text-xs font-medium ${
                    isOverdue(task)
                      ? 'border-red-300 bg-red-50 text-red-700 line-through dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300'
                      : prioritySoft[task.priority] || prioritySoft.medium
                  }`}
                >
                  {isOverdue(task) ? '🔴 ' : ''}{task.title}
                </div>
              ))}
              {dayTasks.length > 3 && <p className="pl-2 text-xs text-slate-400">+{dayTasks.length - 3} 项</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
