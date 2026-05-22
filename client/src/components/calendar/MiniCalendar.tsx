import { useMemo } from 'react';
import { useTaskStore } from '../../stores/taskStore';

interface MiniCalendarProps {
  onDateSelect?: (date: string) => void;
}

export default function MiniCalendar({ onDateSelect }: MiniCalendarProps) {
  const { selectedDate, setSelectedDate, tasks } = useTaskStore();
  const today = new Date();
  const [year, month] = selectedDate.split('-').map(Number);

  const days = useMemo(() => {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const startPad = firstDay.getDay();
    const result: (number | null)[] = [];

    for (let i = 0; i < startPad; i++) result.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) result.push(d);
    return result;
  }, [year, month]);

  const datesWithTasks = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach((t) => {
      if (t.dueDate) set.add(t.dueDate);
    });
    return set;
  }, [tasks]);

  const isToday = (d: number) =>
    d === today.getDate() && month === today.getMonth() + 1 && year === today.getFullYear();

  const isSelected = (d: number) => {
    const ds = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    return ds === selectedDate;
  };

  const handleClick = (d: number) => {
    const ds = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    setSelectedDate(ds);
    onDateSelect?.(ds);
  };

  const changeMonth = (delta: number) => {
    const d = new Date(year, month - 1 + delta, 1);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  return (
    <div className="bg-surface border border-[#252547] rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => changeMonth(-1)} className="text-muted hover:text-white text-sm">&lt;</button>
        <span className="text-sm font-medium">{year}年{month}月</span>
        <button onClick={() => changeMonth(1)} className="text-muted hover:text-white text-sm">&gt;</button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {weekDays.map((d) => (
          <div key={d} className="text-xs text-muted py-1">{d}</div>
        ))}
        {days.map((d, i) => (
          <div key={i} className="py-1">
            {d !== null ? (
              <button
                onClick={() => handleClick(d)}
                className={`w-8 h-8 text-xs rounded-lg flex items-center justify-center transition-all relative ${
                  isSelected(d)
                    ? 'bg-primary text-white font-bold'
                    : isToday(d)
                    ? 'bg-accent/20 text-accent font-bold'
                    : 'text-white hover:bg-surface-light'
                }`}
              >
                {d}
                {datesWithTasks.has(
                  `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
                ) && (
                  <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-primary" />
                )}
              </button>
            ) : (
              <span className="w-8 h-8 block" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
