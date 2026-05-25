import { useEffect, useState, useMemo } from 'react';
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
        <h2 className="text-2xl font-bold">日历</h2>
        <div className="flex bg-surface-light rounded-xl p-1 gap-1">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setViewMode(key)}
              className={`px-4 py-1.5 text-sm rounded-lg transition-all ${viewMode === key ? 'bg-primary text-white font-medium' : 'text-muted hover:text-text'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-surface border border-border rounded-2xl p-6">
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
