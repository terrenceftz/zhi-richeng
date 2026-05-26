import { useMemo } from 'react';
import type { Task } from '../../types';

interface DayViewProps {
  date: string;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7);

const priorityBg: Record<string, string> = {
  high: 'bg-rose',
  medium: 'bg-cream',
  low: 'bg-blue',
};

const priorityBorder: Record<string, string> = {
  high: 'border-red-400',
  medium: 'border-yellow-500',
  low: 'border-blue-400',
};

export default function DayView({ date, tasks, onTaskClick }: DayViewProps) {
  const dayTasks = useMemo(
    () => tasks.filter((t) => t.dueDate?.slice(0, 10) === date).sort((a, b) => (a.dueTime || '').localeCompare(b.dueTime || '')),
    [tasks, date]
  );

  return (
    <div>
      <div className="text-lg font-black mb-4">{date}</div>
      {dayTasks.length === 0 ? (
        <p className="font-bold text-sm opacity-40 py-8 text-center">当天没有日程安排</p>
      ) : (
        <div className="border-2 border-black rounded-2xl overflow-hidden">
          {HOURS.map((hour) => {
            const hourStr = `${String(hour).padStart(2, '0')}:00`;
            const hourTasks = dayTasks.filter((t) => t.dueTime && t.dueTime.startsWith(String(hour).padStart(2, '0')));
            return (
              <div key={hour} className="flex border-t-2 border-black first:border-t-0 min-h-[56px]">
                <div className="w-16 text-xs font-bold py-3 flex-shrink-0 border-r-2 border-black bg-gray-50 px-2">{hourStr}</div>
                <div className="flex-1 py-1 px-1 space-y-1 bg-white">
                  {hourTasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => onTaskClick(task)}
                      className={`border-2 border-black rounded-xl px-3 py-2 cursor-pointer transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${priorityBg[task.priority] || 'bg-white'}`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full border border-black flex-shrink-0 ${priorityBorder[task.priority] || 'bg-gray-400'}`} style={{ backgroundColor: task.priority === 'high' ? '#f7768e' : task.priority === 'medium' ? '#e2b714' : '#7aa2f7' }} />
                        <span className="text-sm font-bold">{task.title}</span>
                        {task.dueTime && <span className="text-xs font-bold opacity-50 ml-auto">{task.dueTime}</span>}
                      </div>
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
