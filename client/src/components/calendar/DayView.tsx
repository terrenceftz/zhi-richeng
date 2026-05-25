import { useMemo } from 'react';
import type { Task } from '../../types';

interface DayViewProps {
  date: string;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7);

export default function DayView({ date, tasks, onTaskClick }: DayViewProps) {
  const dayTasks = useMemo(
    () => tasks.filter((t) => t.dueDate?.slice(0, 10) === date).sort((a, b) => (a.dueTime || '').localeCompare(b.dueTime || '')),
    [tasks, date]
  );

  return (
    <div>
      <div className="text-lg font-bold mb-4">{date}</div>
      {dayTasks.length === 0 ? (
        <p className="text-muted text-sm py-8 text-center">当天没有日程安排</p>
      ) : (
        <div>
          {HOURS.map((hour) => {
            const hourStr = `${String(hour).padStart(2, '0')}:00`;
            const hourTasks = dayTasks.filter((t) => t.dueTime && t.dueTime.startsWith(String(hour).padStart(2, '0')));
            return (
              <div key={hour} className="flex border-t border-border min-h-[56px]">
                <div className="w-16 text-xs text-muted py-3 flex-shrink-0">{hourStr}</div>
                <div className="flex-1 py-1 space-y-1">
                  {hourTasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => onTaskClick(task)}
                      className="bg-primary/20 border-l-2 border-primary rounded-r-lg px-3 py-2 cursor-pointer hover:bg-primary/30 transition-colors"
                      style={{ borderLeftColor: task.priority === 'high' ? '#f7768e' : task.priority === 'medium' ? '#e2b714' : '#7aa2f7' }}
                    >
                      <span className="text-sm">{task.title}</span>
                      {task.dueTime && <span className="text-xs text-muted ml-2">{task.dueTime}</span>}
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
