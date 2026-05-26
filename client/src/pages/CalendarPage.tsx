import { useEffect, useState, useMemo } from 'react';
import { CalendarDays } from 'lucide-react';
import { useTaskStore } from '../stores/taskStore';
import type { Task } from '../types';
import DayView from '../components/calendar/DayView';
import WeekView from '../components/calendar/WeekView';
import MonthView from '../components/calendar/MonthView';
import TaskDetailDrawer from '../components/tasks/TaskDetailDrawer';

type ViewMode = 'day' | 'week' | 'month';

export default function CalendarPage() {
  const { tasks, selectedDate, setSelectedDate, fetchTasks } = useTaskStore();
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, []);

  const [year, month] = selectedDate.split('-').map(Number);

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setDrawerOpen(true);
  };

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    if (viewMode === 'month') setViewMode('day');
    fetchTasks({ date });
  };

  const tabs: { key: ViewMode; label: string }[] = [
    { key: 'day', label: '日' },
    { key: 'week', label: '周' },
    { key: 'month', label: '月' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-black flex items-center gap-2">
          <CalendarDays className="w-6 h-6" />
          日历
        </h2>
        <div className="flex bg-white border-2 border-black rounded-2xl p-1 gap-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setViewMode(key)}
              className={`px-4 py-1.5 text-sm font-bold rounded-xl transition-all ${
                viewMode === key
                  ? 'bg-blue border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] -translate-x-0.5 -translate-y-0.5'
                  : 'text-gray-400 hover:text-black'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white border-2 border-black rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        {viewMode === 'day' && <DayView date={selectedDate} tasks={tasks} onTaskClick={handleTaskClick} />}
        {viewMode === 'week' && <WeekView selectedDate={selectedDate} tasks={tasks} onTaskClick={handleTaskClick} />}
        {viewMode === 'month' && (
          <MonthView
            year={year}
            month={month}
            selectedDate={selectedDate}
            tasks={tasks}
            onTaskClick={handleTaskClick}
            onDateSelect={handleDateSelect}
          />
        )}
      </div>

      <TaskDetailDrawer task={selectedTask} open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
