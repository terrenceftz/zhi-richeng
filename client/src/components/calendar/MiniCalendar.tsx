import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTaskStore } from '../../stores/taskStore';
import { getHoliday } from '../../utils/holidays';

interface MiniCalendarProps {
  onDateSelect?: (date: string) => void;
}

export default function MiniCalendar({ onDateSelect }: MiniCalendarProps) {
  const { selectedDate, setSelectedDate, tasks } = useTaskStore();
  const today = new Date();

  // 视图月份独立于 selectedDate，避免翻月时意外改动选中日
  const [viewYear, setViewYear] = useState(() => {
    const [y] = selectedDate.split('-').map(Number);
    return y || today.getFullYear();
  });
  const [viewMonth, setViewMonth] = useState(() => {
    const [, m] = selectedDate.split('-').map(Number);
    return m || today.getMonth() + 1;
  });

  const days = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth - 1, 1);
    const lastDay = new Date(viewYear, viewMonth, 0);
    const startPad = firstDay.getDay();
    const result: (number | null)[] = [];
    for (let i = 0; i < startPad; i++) result.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) result.push(d);
    return result;
  }, [viewYear, viewMonth]);

  const datesWithTasks = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach((t) => {
      if (t.dueDate) set.add(t.dueDate.slice(0, 10));
    });
    return set;
  }, [tasks]);

  const isToday = (d: number) =>
    d === today.getDate() && viewMonth === today.getMonth() + 1 && viewYear === today.getFullYear();

  const dateStr = (d: number) => `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  const handleClick = (d: number) => {
    const ds = dateStr(d);
    setSelectedDate(ds);
    onDateSelect?.(ds);
  };

  const changeMonth = (delta: number) => {
    const d = new Date(viewYear, viewMonth - 1 + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth() + 1);
  };

  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 flex items-center justify-between">
        <button
          onClick={() => changeMonth(-1)}
          aria-label="上个月"
          className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{viewYear}年{viewMonth}月</span>
        <button
          onClick={() => changeMonth(1)}
          aria-label="下个月"
          className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {weekDays.map((d) => (
          <div key={d} className="py-1 text-xs font-medium text-slate-400 dark:text-slate-500">{d}</div>
        ))}
        {days.map((d, i) => (
          <div key={i} className="py-0.5">
            {d !== null ? (
              <button
                onClick={() => handleClick(d)}
                className={`relative flex h-8 w-8 items-center justify-center rounded-lg text-xs font-medium transition-colors ${
                  selectedDate === dateStr(d)
                    ? 'bg-brand-600 text-white'
                    : isToday(d)
                      ? 'bg-brand-100 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300'
                      : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                <span className={(() => {
                  const h = getHoliday(dateStr(d));
                  return h?.isStatutory && selectedDate !== dateStr(d) ? 'text-red-500' : '';
                })()}>
                  {d}
                </span>
                {(() => {
                  const h = getHoliday(dateStr(d));
                  return h?.isStatutory && (
                    <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-red-400" />
                  );
                })()}
                {datesWithTasks.has(dateStr(d)) && (
                  <span className={`absolute bottom-0.5 h-1 w-1 rounded-full ${selectedDate === dateStr(d) ? 'bg-white' : 'bg-brand-500'}`} />
                )}
              </button>
            ) : (
              <span className="block h-8 w-8" />
            )}
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-3 border-t border-slate-200 pt-3 dark:border-slate-800">
        <div className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
          <span className="text-[10px] text-slate-500 dark:text-slate-400">日程</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
          <span className="text-[10px] text-slate-500 dark:text-slate-400">节假日</span>
        </div>
      </div>
    </div>
  );
}
