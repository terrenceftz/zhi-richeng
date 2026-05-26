import { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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
      if (t.dueDate) set.add(t.dueDate.slice(0, 10));
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
    const newMonth = month + delta;
    const d = new Date(year, newMonth - 1, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setSelectedDate(`${y}-${m}-${day}`);
  };

  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  return (
    <div className="bg-white border-2 border-black rounded-2xl p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => changeMonth(-1)} className="w-7 h-7 flex items-center justify-center rounded-lg border-2 border-black bg-white hover:bg-blue transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <span className="text-sm font-black">{year}年{month}月</span>
        <button onClick={() => changeMonth(1)} className="w-7 h-7 flex items-center justify-center rounded-lg border-2 border-black bg-white hover:bg-blue transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {weekDays.map((d) => (
          <div key={d} className="text-xs font-bold opacity-40 py-1">{d}</div>
        ))}
        {days.map((d, i) => (
          <div key={i} className="py-0.5">
            {d !== null ? (
              <button
                onClick={() => handleClick(d)}
                className={`w-8 h-8 text-xs rounded-lg flex items-center justify-center font-bold transition-all relative ${
                  isSelected(d)
                    ? 'bg-blue border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                    : isToday(d)
                    ? 'bg-coral text-white border-2 border-black'
                    : 'text-black hover:bg-blue/50 border border-transparent'
                }`}
              >
                {d}
                {datesWithTasks.has(
                  `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
                ) && (
                  <span className={`absolute bottom-0.5 w-1.5 h-1.5 rounded-full border border-black ${isToday(d) ? 'bg-white' : 'bg-black'}`} />
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
