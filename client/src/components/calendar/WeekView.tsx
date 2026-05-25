import { useMemo } from 'react';
import type { Task } from '../../types';

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

export default function WeekView({ selectedDate, tasks, onTaskClick }: WeekViewProps) {
  const weekDays = ['一', '二', '三', '四', '五', '六', '日'];
  const dates = useMemo(() => getWeekDates(selectedDate), [selectedDate]);

  return (
    <div>
      <div className="grid grid-cols-7 gap-2 mb-2">
        {dates.map((date, i) => (
          <div key={date} className={`text-center p-2 rounded-lg text-sm ${date === selectedDate ? 'bg-primary/20 text-primary font-bold' : 'text-muted'}`}>
            <div>{weekDays[i]}</div>
            <div>{date.slice(8)}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {dates.map((date) => {
          const dayTasks = tasks.filter((t) => t.dueDate?.slice(0, 10) === date);
          return (
            <div key={date} className="min-h-[120px] bg-surface-light rounded-lg p-2 space-y-1">
              {dayTasks.slice(0, 3).map((task) => (
                <div
                  key={task.id}
                  onClick={() => onTaskClick(task)}
                  className="text-xs bg-primary/20 px-2 py-1 rounded cursor-pointer hover:bg-primary/30 truncate"
                  style={{ borderLeft: `2px solid ${task.priority === 'high' ? '#f7768e' : task.priority === 'medium' ? '#e2b714' : '#7aa2f7'}` }}
                >
                  {task.title}
                </div>
              ))}
              {dayTasks.length > 3 && <p className="text-xs text-muted pl-2">+{dayTasks.length - 3} 项</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
