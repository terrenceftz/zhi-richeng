import { useMemo } from 'react';
import type { Task } from '../../types';
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
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['日', '一', '二', '三', '四', '五', '六'].map((d) => (
          <div key={d} className="text-center text-xs font-black py-2 opacity-50">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((d, i) => {
          if (d === null) return <div key={i} className="aspect-square bg-gray-50/50 rounded-lg" />;
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
              className={`aspect-square rounded-lg p-1 cursor-pointer border-2 transition-all overflow-hidden ${
                isSelected
                  ? 'bg-blue border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                  : isToday
                  ? 'ring-2 ring-black bg-white border-black'
                  : isRestDay
                  ? 'bg-red-50/50 border-red-200'
                  : 'bg-white border-gray-300 hover:border-black'
              }`}
            >
              {/* 日期数字 */}
              <div className="flex items-center gap-0.5 mb-0.5 px-0.5">
                <span
                  className={`text-xs font-bold ${
                    isToday
                      ? 'text-white bg-coral rounded-full w-5 h-5 flex items-center justify-center'
                      : isStatutory
                      ? 'text-red-500'
                      : isRestDay
                      ? 'text-red-400'
                      : isSelected
                      ? ''
                      : 'opacity-50'
                  }`}
                >
                  {d}
                </span>
                {/* 节假日名称 */}
                {isStatutory && holiday && (
                  <span className="text-[9px] font-bold text-red-400 truncate leading-none">
                    {holiday.name}
                  </span>
                )}
              </div>

              {/* 任务列表 */}
              <div className="space-y-0.5">
                {dayTasks.slice(0, 2).map((task) => (
                  <div
                    key={task.id}
                    onClick={(e) => { e.stopPropagation(); onTaskClick(task); }}
                    className="text-[10px] px-1 py-0.5 rounded-md truncate font-bold bg-black text-white cursor-pointer"
                  >
                    {task.title}
                  </div>
                ))}
                {dayTasks.length > 2 && (
                  <div className="text-[10px] font-bold opacity-50 px-1">+{dayTasks.length - 2}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
