import { useMemo } from 'react';
import type { Task } from '../../types';

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
          <div key={d} className="text-center text-xs text-muted py-2 font-medium">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((d, i) => {
          if (d === null) return <div key={i} className="aspect-square bg-surface-light/30 rounded-lg" />;
          const ds = fmt(d);
          const dayTasks = tasksByDate[ds] || [];
          const isSelected = ds === selectedDate;
          const isToday = ds === new Date().toISOString().slice(0, 10);

          return (
            <div
              key={i}
              onClick={() => onDateSelect(ds)}
              className={`aspect-square bg-surface-light rounded-lg p-1 cursor-pointer hover:border-primary/50 border border-transparent transition-colors overflow-hidden ${isSelected ? 'border-primary bg-primary/10' : ''} ${isToday ? 'ring-1 ring-accent' : ''}`}
            >
              <div className={`text-xs mb-0.5 px-1 ${isToday ? 'text-accent font-bold' : 'text-muted'}`}>{d}</div>
              <div className="space-y-0.5">
                {dayTasks.slice(0, 2).map((task) => (
                  <div
                    key={task.id}
                    onClick={(e) => { e.stopPropagation(); onTaskClick(task); }}
                    className="text-[10px] px-1 py-0.5 rounded truncate bg-primary/20 text-primary cursor-pointer"
                  >
                    {task.title}
                  </div>
                ))}
                {dayTasks.length > 2 && <div className="text-[10px] text-muted px-1">+{dayTasks.length - 2}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
