import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTaskStore } from '../stores/taskStore';
import { useAuthStore } from '../stores/authStore';
import type { Task } from '../types';
import SmartInput from '../components/SmartInput';
import AIChatBar from '../components/AIChatBar';
import TaskCard from '../components/tasks/TaskCard';
import Button from '../components/ui/Button';
import MiniCalendar from '../components/calendar/MiniCalendar';
import TaskForm from '../components/tasks/TaskForm';
import Drawer from '../components/ui/Drawer';

export default function DashboardPage() {
  const { tasks, selectedDate, isLoading, fetchTasks, createTask, deleteTask, setSelectedDate } = useTaskStore();
  const { user } = useAuthStore();
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showTodayDone, setShowTodayDone] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, [selectedDate]);

  useEffect(() => {
    if (user && !useAuthStore.getState().user) {
      fetchTasks();
    }
  }, [user]);

  const todayActive = useMemo(
    () => tasks.filter((t) => t.dueDate?.slice(0, 10) === selectedDate && t.status !== 'done'),
    [tasks, selectedDate]
  );

  const todayDone = useMemo(
    () => tasks.filter((t) => t.dueDate?.slice(0, 10) === selectedDate && t.status === 'done'),
    [tasks, selectedDate]
  );

  const unscheduledActive = useMemo(
    () => tasks.filter((t) => !t.dueDate && t.status !== 'done'),
    [tasks]
  );

  const unscheduledDone = useMemo(
    () => tasks.filter((t) => !t.dueDate && t.status === 'done'),
    [tasks]
  );

  const totalToday = todayActive.length + todayDone.length;
  const completionRate = totalToday > 0 ? Math.round((todayDone.length / totalToday) * 100) : 0;

  const handleTaskClick = (task: Task) => {
    setEditingTask(task);
    setFormMode('edit');
    setShowForm(true);
  };

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
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

  const handleDelete = async () => {
    if (!editingTask) return;
    if (!confirm('确定删除这个任务？')) return;
    await deleteTask(editingTask.id);
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

      {/* AI Query bar */}
      <AIChatBar />

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
            <AnimatePresence mode="popLayout">
              {todayActive.length > 0 ? (
                <motion.div layout className="space-y-2">
                  {todayActive.map((task) => (
                    <motion.div
                      key={task.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8, transition: { duration: 0.2 } }}
                    >
                      <TaskCard
                        task={task}
                        onClick={() => handleTaskClick(task)}
                      />
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <motion.div layout className="text-center text-muted py-12">
                  <p className="text-4xl mb-3">📭</p>
                  <p className="text-sm">今天还没有任务，用上方输入框快速添加</p>
                </motion.div>
              )}

              {todayDone.length > 0 && (
                <motion.div layout className="mt-6">
                  <button
                    onClick={() => setShowTodayDone(!showTodayDone)}
                    className="flex items-center gap-2 text-xs text-muted hover:text-text transition-colors mb-3"
                  >
                    <motion.span animate={{ rotate: showTodayDone ? 90 : 0 }} transition={{ duration: 0.2 }}>
                      ▶
                    </motion.span>
                    已完成 ({todayDone.length})
                  </button>
                  <AnimatePresence>
                    {showTodayDone && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-2 overflow-hidden"
                      >
                        {todayDone.map((task) => (
                          <motion.div
                            key={task.id}
                            layout
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                          >
                            <TaskCard
                              task={task}
                              onClick={() => handleTaskClick(task)}
                            />
                          </motion.div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          )}

          {unscheduledActive.length > 0 && (
            <motion.div layout className="mt-8">
              <h3 className="text-lg font-bold mb-4">待安排任务</h3>
              <div className="space-y-2">
                {unscheduledActive.map((task) => (
                  <motion.div key={task.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <TaskCard task={task} onClick={() => handleTaskClick(task)} />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {unscheduledDone.length > 0 && (
            <motion.div layout className="mt-4">
              <p className="text-xs text-muted mb-2">已完成的待安排任务 ({unscheduledDone.length})</p>
              <div className="space-y-2 opacity-50">
                {unscheduledDone.map((task) => (
                  <motion.div key={task.id} layout>
                    <TaskCard task={task} onClick={() => handleTaskClick(task)} />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        <div className="w-72 flex-shrink-0 max-lg:w-full space-y-4">
          <MiniCalendar onDateSelect={handleDateSelect} />

          <div className="bg-gradient-to-br from-surface-light to-surface-dark rounded-xl p-5">
            <p className="text-xs text-muted uppercase tracking-wider mb-1">今日完成率</p>
            <p className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {completionRate}%
            </p>
            <div className="mt-3 bg-surface-dark rounded-full h-2 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
                style={{ width: `${completionRate}%` }}
              />
            </div>
            <p className="text-xs text-muted mt-2">
              {todayDone.length}/{totalToday} 项已完成
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
        {formMode === 'edit' && (
          <div className="mt-6 pt-6 border-t border-border">
            <Button variant="danger" onClick={handleDelete} className="w-full">删除任务</Button>
          </div>
        )}
      </Drawer>
    </div>
  );
}
