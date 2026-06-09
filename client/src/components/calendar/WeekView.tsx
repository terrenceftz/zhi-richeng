import { useMemo } from 'react';
import type { Task } from '../../types';
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

const priorityBg: Record<string, string> = {
  high: 'bg-rose',
  medium: 'bg-cream',
  low: 'bg-blue',
};

export default function WeekView({ selectedDate, tasks, onTaskClick }: WeekViewProps) {
  const weekDays = ['一', '二', '三', '四', '五', '六', '日'];
  const dates = useMemo(() => getWeekDates(selectedDate), [selectedDate]);

  return (
    <div>
      <div className="grid grid-cols-7 gap-2 mb-2">
        {dates.map((date, i) => {
          const holiday = getHoliday(date);
          const isStatutory = holiday?.isStatutory;
          return (
            <div
              key={date}
              className={`text-center p-2 rounded-xl text-sm border-2 transition-all ${
                date === selectedDate
                  ? 'bg-blue border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-black'
                  : isStatutory
                  ? 'border-red-300 bg-red-50/60 font-bold text-red-500'
                  : 'border-black bg-white font-bold opacity-50'
              }`}
            >
              <div>{weekDays[i]}</div>
              <div>{date.slice(8)}</div>
              {isStatutory && holiday && (
                <div className="text-[10px] mt-0.5 opacity-80">{holiday.name}</div>
              )}
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
              className={`min-h-[120px] rounded-xl p-2 space-y-1 border-2 ${
                isToday
                  ? 'border-black bg-blue/30'
                  : isRestDay
                  ? 'border-red-200 bg-red-50/30'
                  : 'border-black bg-white'
              } ${date === selectedDate ? 'shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : ''}`}
            >
              {dayTasks.slice(0, 3).map((task) => (
                <div
                  key={task.id}
                  onClick={() => onTaskClick(task)}
                  className={`text-xs px-2 py-1 rounded-lg cursor-pointer truncate font-bold border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${priorityBg[task.priority] || 'bg-white'}`}
                >
                  {task.title}
                </div>
              ))}
              {dayTasks.length > 3 && <p className="text-xs font-bold opacity-50 pl-2">+{dayTasks.length - 3} 项</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
