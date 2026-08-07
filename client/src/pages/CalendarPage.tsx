import { useEffect, useState } from 'react';
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
  }, [fetchTasks]);

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
      <div className="mb-6 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
          <CalendarDays className="h-6 w-6 text-brand-500" />
          日历
        </h2>
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setViewMode(key)}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                viewMode === key
                  ? 'bg-brand-600 text-white'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card dark:border-slate-800 dark:bg-slate-900 sm:p-6">
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
