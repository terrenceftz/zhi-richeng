import { useMemo } from 'react';
import type { Task } from '../../types';
import { PRIORITY_COLORS, isOverdue } from '../../types';
import { getHoliday } from '../../utils/holidays';

interface DayViewProps {
  date: string;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 07:00 - 20:00

const prioritySoft: Record<string, string> = {
  high: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30',
  medium: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30',
  low: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:border-sky-500/30',
};

export default function DayView({ date, tasks, onTaskClick }: DayViewProps) {
  const dayTasks = useMemo(
    () => tasks.filter((t) => t.dueDate?.slice(0, 10) === date).sort((a, b) => (a.dueTime || '').localeCompare(b.dueTime || '')),
    [tasks, date]
  );

  const holiday = getHoliday(date);
  const isStatutory = holiday?.isStatutory;
  const isWeekend = holiday?.isRestDay && !isStatutory;

  // 无时间的任务单列展示
  const allDayTasks = dayTasks.filter((t) => !t.dueTime);
  const timedTasks = dayTasks.filter((t) => t.dueTime);

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <span className={`text-base font-semibold md:text-lg ${isStatutory ? 'text-red-500' : 'text-slate-900 dark:text-slate-100'}`}>{date}</span>
        {isStatutory && holiday && (
          <span className="rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-500 dark:border-red-500/30 dark:bg-red-500/10">
            {holiday.name}
          </span>
        )}
        {isWeekend && (
          <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-500 dark:border-slate-800 dark:bg-slate-800/50">
            周末
          </span>
        )}
      </div>

      {allDayTasks.length > 0 && (
        <div className="mb-3 space-y-1">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">全天</p>
          {allDayTasks.map((task) => (
            <div key={task.id} onClick={() => onTaskClick(task)} className={`cursor-pointer rounded-lg border px-2 py-1.5 text-[13px] font-medium md:px-3 md:py-2 md:text-sm ${prioritySoft[task.priority] || prioritySoft.medium}`}>
              {task.title}
            </div>
          ))}
        </div>
      )}

      {timedTasks.length === 0 && allDayTasks.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">
          {isStatutory ? '节假日，好好休息！' : '当天没有日程安排'}
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
          {HOURS.map((hour) => {
            const hourStr = `${String(hour).padStart(2, '0')}:00`;
            const hourTasks = timedTasks.filter((t) => t.dueTime && t.dueTime.startsWith(String(hour).padStart(2, '0')));
            return (
              <div key={hour} className="flex min-h-[48px] border-t border-slate-100 first:border-t-0 dark:border-slate-800 md:min-h-[56px]">
                <div className="w-12 shrink-0 border-r border-slate-100 bg-slate-50/50 px-1 py-2 text-[11px] text-slate-400 dark:border-slate-800 dark:bg-slate-800/30 md:w-16 md:px-2 md:text-xs">{hourStr}</div>
                <div className="flex-1 space-y-1 bg-white px-1 py-1 dark:bg-slate-900">
                  {hourTasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => onTaskClick(task)}
                      className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2 py-1 text-[13px] transition-shadow hover:shadow-sm md:px-3 md:py-1.5 md:text-sm ${
                        isOverdue(task)
                          ? 'border-red-300 bg-red-50 text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300'
                          : prioritySoft[task.priority] || prioritySoft.medium
                      }`}
                    >
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: isOverdue(task) ? '#ef4444' : PRIORITY_COLORS[task.priority] }} />
                      <span className={`truncate font-medium ${isOverdue(task) ? 'line-through' : ''}`}>{isOverdue(task) ? '' : ''}{task.title}</span>
                      {task.dueTime && <span className="ml-auto shrink-0 text-[11px] opacity-70 md:text-xs">{task.dueTime}</span>}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
