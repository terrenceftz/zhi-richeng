import { useEffect, useState, useMemo } from 'react';
import { useTaskStore } from '../stores/taskStore';
import { useAuthStore } from '../stores/authStore';
import type { Task } from '../types';
import SmartInput from '../components/SmartInput';
import TaskList from '../components/tasks/TaskList';
import MiniCalendar from '../components/calendar/MiniCalendar';
import TaskForm from '../components/tasks/TaskForm';
import Drawer from '../components/ui/Drawer';

export default function DashboardPage() {
  const { tasks, selectedDate, isLoading, fetchTasks, createTask, setSelectedDate } = useTaskStore();
  const { user } = useAuthStore();
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  useEffect(() => {
    fetchTasks({ date: selectedDate });
  }, [selectedDate]);

  useEffect(() => {
    if (user && !useAuthStore.getState().user) {
      fetchTasks({ date: selectedDate });
    }
  }, [user]);

  const todayTasks = useMemo(
    () => tasks.filter((t) => t.dueDate === selectedDate),
    [tasks, selectedDate]
  );

  const unscheduledTasks = useMemo(
    () => tasks.filter((t) => !t.dueDate),
    [tasks]
  );

  const doneCount = todayTasks.filter((t) => t.status === 'done').length;
  const completionRate = todayTasks.length > 0 ? Math.round((doneCount / todayTasks.length) * 100) : 0;

  const handleTaskClick = (task: Task) => {
    setEditingTask(task);
    setFormMode('edit');
    setShowForm(true);
  };

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    fetchTasks({ date });
  };

  const handleFormSubmit = async (data: Partial<Task>) => {
    if (formMode === 'create') {
      await createTask({ ...data, dueDate: selectedDate });
    } else if (editingTask) {
      const { updateTask } = useTaskStore.getState();
      await updateTask(editingTask.id, data);
    }
    setShowForm(false);
    setEditingTask(null);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-1">
        你好，{user?.name || '用户'} 👋
      </h2>
      <p className="text-muted text-sm mb-6">{new Date().toLocaleDateString('zh-CN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>

      <SmartInput />

      <div className="flex gap-6 max-lg:flex-col">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">今日任务</h3>
            <button onClick={() => { setFormMode('create'); setEditingTask(null); setShowForm(true); }}
              className="text-sm text-primary hover:underline">+ 添加</button>
          </div>

          {isLoading ? (
            <div className="text-center text-muted py-12">加载中...</div>
          ) : (
            <TaskList
              tasks={todayTasks}
              onTaskClick={handleTaskClick}
              emptyMessage="今天还没有任务，用上方输入框快速添加"
            />
          )}

          {unscheduledTasks.length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-bold mb-4">待安排任务</h3>
              <TaskList tasks={unscheduledTasks} onTaskClick={handleTaskClick} />
            </div>
          )}
        </div>

        <div className="w-72 flex-shrink-0 max-lg:w-full space-y-4">
          <MiniCalendar onDateSelect={handleDateSelect} />

          <div className="bg-gradient-to-br from-surface-light to-[#1a1b3a] rounded-xl p-5">
            <p className="text-xs text-muted uppercase tracking-wider mb-1">今日完成率</p>
            <p className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {completionRate}%
            </p>
            <div className="mt-3 bg-[#1e1e3a] rounded-full h-2 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
                style={{ width: `${completionRate}%` }}
              />
            </div>
            <p className="text-xs text-muted mt-2">
              {doneCount}/{todayTasks.length} 项已完成
            </p>
          </div>
        </div>
      </div>

      <Drawer open={showForm} onClose={() => setShowForm(false)} title={formMode === 'create' ? '新建任务' : '编辑任务'}>
        <TaskForm
          initial={formMode === 'edit' ? editingTask || undefined : { dueDate: selectedDate }}
          onSubmit={handleFormSubmit}
          onCancel={() => setShowForm(false)}
        />
      </Drawer>
    </div>
  );
}
