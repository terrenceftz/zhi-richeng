import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ListChecks, CalendarDays, ChevronRight } from 'lucide-react';
import { useTaskStore } from '../stores/taskStore';
import { useAuthStore } from '../stores/authStore';
import type { Task } from '../types';
import { getNextHolidayCountdown } from '../utils/holidays';
import { getTeachingWeek, type SemesterConfig } from '../utils/academicCalendar';
import client from '../api/client';
import SmartBar from '../components/SmartBar';
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
  const [quote, setQuote] = useState('');
  const holidayCountdown = useMemo(() => getNextHolidayCountdown(), []);
  const [teachingWeek, setTeachingWeek] = useState<{ name: string; week: number | null; isBreak: boolean } | null>(null);

  useEffect(() => {
    client.get('/settings').then(({ data }) => {
      if (data.semesterName && data.semesterStart) {
        const config: SemesterConfig = {
          name: data.semesterName,
          start: data.semesterStart,
          end: data.semesterEnd || '',
        };
        setTeachingWeek(getTeachingWeek(config));
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    fetch('https://v1.hitokoto.cn/?c=a&c=b&c=c&c=d&c=i&c=k&encode=text&max_length=30')
      .then(r => r.text())
      .then(setQuote)
      .catch(() => setQuote('每一天都是新的开始'));

  }, []);

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
      {/* Greeting header card */}
      <div className="bg-rose border-2 border-black rounded-2xl px-4 py-3 mb-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-between gap-4 max-md:flex-col max-md:items-start relative overflow-hidden">
        <svg className="absolute -right-1 -top-1 w-7 h-7 opacity-50" viewBox="0 0 24 24"><path d="M12 0l3 8 8 3-8 3-3 8-3-8L1 11l8-3 3-8z" fill="#FFD700" stroke="#000" strokeWidth="1"/></svg>
        <svg className="absolute right-16 -bottom-2 w-4 h-4 opacity-30" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6" fill="none" stroke="#000" strokeWidth="1.5"/></svg>
        <div className="relative z-10">
          <h2 className="text-lg font-black">你好，{user?.name || '用户'}</h2>
          <p className="font-bold text-xs opacity-50">{new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' })}</p>
          {teachingWeek && !teachingWeek.isBreak && teachingWeek.week && (
            <p className="font-black text-sm mt-1">
              📚 {teachingWeek.name} · 第<span className="text-base">{teachingWeek.week}</span>周
            </p>
          )}
          {holidayCountdown && (
            holidayCountdown.isToday ? (
              <p className="font-black text-sm mt-1">🎉 今天是<span className="underline decoration-2 underline-offset-2">{holidayCountdown.name}</span>，节日快乐！</p>
            ) : (
              <p className="font-black text-sm mt-1">
                🎉 距离<span className="underline decoration-2 underline-offset-2">{holidayCountdown.name}</span>还有 <span className="text-base">{holidayCountdown.daysUntil}</span> 天
              </p>
            )
          )}
        </div>
        {quote && (
          <p className="font-serif italic text-sm text-black/60 max-w-[180px] text-right max-md:text-left relative z-10">&ldquo;{quote}&rdquo;</p>
        )}
      </div>

      <SmartBar />

      <div className="flex gap-6 max-lg:flex-col">
        <div className="flex-1 min-w-0 overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-black flex items-center gap-2">
              <ListChecks className="w-5 h-5" />
              今日任务
            </h3>
            <button onClick={() => { setFormMode('create'); setEditingTask(null); setShowForm(true); }}
              className="text-sm font-bold bg-black text-white px-4 py-1.5 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all">
              + 添加
            </button>
          </div>

          {isLoading ? (
            <div className="text-center py-12 font-bold">加载中...</div>
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
                <motion.div layout className="text-center py-12">
                  <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-40" />
                  <p className="text-sm font-bold opacity-50">今天还没有任务，用上方输入框快速添加</p>
                </motion.div>
              )}

              {todayDone.length > 0 && (
                <motion.div layout className="mt-6">
                  <button
                    onClick={() => setShowTodayDone(!showTodayDone)}
                    className="flex items-center gap-2 text-xs font-bold hover:opacity-70 transition-opacity mb-3"
                  >
                    <motion.span animate={{ rotate: showTodayDone ? 90 : 0 }} transition={{ duration: 0.2 }}>
                      <ChevronRight className="w-4 h-4" />
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
              <h3 className="text-lg font-black mb-4">待安排任务</h3>
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
              <p className="text-xs font-bold opacity-50 mb-2">已完成的待安排任务 ({unscheduledDone.length})</p>
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

          {/* Completion rate card */}
          <div className="bg-white border-2 border-black rounded-2xl p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden">
            <svg className="absolute right-2 top-2 w-8 h-8 opacity-10" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="none" stroke="#000" strokeWidth="1.5"/><circle cx="12" cy="12" r="4" fill="#000"/></svg>
            <p className="text-xs font-bold uppercase tracking-wider mb-1 opacity-50 relative z-10">今日完成率</p>
            <p className="text-3xl font-black">
              {completionRate}%
            </p>
            <div className="mt-3 bg-gray-100 rounded-full h-2 overflow-hidden border border-black">
              <div
                className="h-full rounded-full bg-black transition-all duration-500"
                style={{ width: `${completionRate}%` }}
              />
            </div>
            <p className="text-xs font-bold opacity-50 mt-2">
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
          <div className="mt-6 pt-6 border-t-2 border-black">
            <Button variant="danger" onClick={handleDelete} className="w-full">删除任务</Button>
          </div>
        )}
      </Drawer>
    </div>
  );
}
