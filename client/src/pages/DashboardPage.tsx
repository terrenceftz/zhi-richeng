import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ListChecks, CalendarDays, ChevronRight, Plus, GraduationCap, Bell, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTaskStore } from '../stores/taskStore';
import { useAuthStore } from '../stores/authStore';
import { useThemeStore } from '../stores/themeStore';
import type { Palette } from '../stores/themeStore';
import type { Task } from '../types';
import { getNextHolidayCountdown } from '../utils/holidays';
import { getTeachingWeek, getBreakCountdown, type SemesterConfig } from '../utils/academicCalendar';
import { getDailyQuote } from '../utils/quotes';
import client from '../api/client';
import { fetchOverdueTasks } from '../api/tasks';
import SmartBar from '../components/SmartBar';
import TaskCard from '../components/tasks/TaskCard';
import Button from '../components/ui/Button';
import MiniCalendar from '../components/calendar/MiniCalendar';
import TaskForm from '../components/tasks/TaskForm';
import Drawer from '../components/ui/Drawer';
import { EmptyState, LoadingState } from '../components/ui/Feedback';
import Card from '../components/ui/Card';
import { fetchWallpaper, type BingWallpaper } from '../api/wallpaper';
import { KirbyCornerSticker, KirbyHeroDecorations } from '../components/theme/KirbyDecorations';

export default function DashboardPage() {
  const { tasks, selectedDate, isLoading, fetchTasks, createTask, deleteTask, setSelectedDate } = useTaskStore();
  const { user } = useAuthStore();
  const palette = useThemeStore((s) => s.palette);
  const isKirby = palette === 'kirby';

  // 主题专属首页 banner：仅声明了素材的主题使用本地图，其余主题回退必应每日壁纸。
  // 新增主题时：把素材放到 client/public/themes/<palette>/banner.jpg，并在此登记一行即可。
  const THEME_BANNERS: Partial<Record<Palette, string>> = {
    kirby: '/themes/kirby/banner.jpg',
  };
  const themeBanner = THEME_BANNERS[palette];
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showTodayDone, setShowTodayDone] = useState(false);
  const quote = useMemo(() => getDailyQuote(), []);
  const holidayCountdown = useMemo(() => getNextHolidayCountdown(), []);
  const [teachingWeek, setTeachingWeek] = useState<{ name: string; week: number | null; isBreak: boolean } | null>(null);
  const [breakCountdown, setBreakCountdown] = useState<{ label: string; daysUntil: number } | null>(null);
  const [wallpaper, setWallpaper] = useState<BingWallpaper | null>(null);
  const [overdueTasks, setOverdueTasks] = useState<Task[]>([]);
  const [showOverdue, setShowOverdue] = useState(false);

  useEffect(() => {
    // 拉取逾期任务
    fetchOverdueTasks()
      .then(setOverdueTasks)
      .catch(() => setOverdueTasks([]));
  }, [tasks]);

  // 拉取必应每日壁纸（有主题专属 banner 时跳过；失败时保持渐变兜底）
  useEffect(() => {
    if (themeBanner) return;
    let alive = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchWallpaper().then((w) => { if (alive) setWallpaper(w); });
    return () => { alive = false; };
  }, [themeBanner]);

  useEffect(() => {
    const CACHE_KEY = 'zrc_semester_cache';
    const CACHE_TTL = 24 * 60 * 60 * 1000;
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const { data, ts } = JSON.parse(cached);
        if (Date.now() - ts < CACHE_TTL && data.semesterName && data.semesterStart) {
          const config: SemesterConfig = { name: data.semesterName, start: data.semesterStart, end: data.semesterEnd || '' };
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setTeachingWeek(getTeachingWeek(config));
          setBreakCountdown(getBreakCountdown(config));
          return;
        }
      } catch {
        /* ignore */
      }
    }
    client.get('/settings').then(({ data }) => {
      // 只缓存学期相关字段，避免把 imToken/OpenID 等凭据写入 localStorage
      const semester = { name: data.semesterName || '', start: data.semesterStart || '', end: data.semesterEnd || '' };
      localStorage.setItem(CACHE_KEY, JSON.stringify({ data: semester, ts: Date.now() }));
      if (semester.name && semester.start) {
        const config: SemesterConfig = { name: semester.name, start: semester.start, end: semester.end };
        setTeachingWeek(getTeachingWeek(config));
        setBreakCountdown(getBreakCountdown(config));
      }
    }).catch(() => {});
  }, []);

  // 选中日期变化时重新拉取
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTasks();
  }, [selectedDate, fetchTasks]);

  const todayActive = useMemo(
    () => tasks.filter((t) => t.dueDate?.slice(0, 10) === selectedDate && t.status !== 'done'),
    [tasks, selectedDate]
  );
  const todayDone = useMemo(
    () => tasks.filter((t) => t.dueDate?.slice(0, 10) === selectedDate && t.status === 'done'),
    [tasks, selectedDate]
  );
  const unscheduledActive = useMemo(() => tasks.filter((t) => !t.dueDate && t.status !== 'done'), [tasks]);

  const totalToday = todayActive.length + todayDone.length;
  const completionRate = totalToday > 0 ? Math.round((todayDone.length / totalToday) * 100) : 0;

  const handleTaskClick = (task: Task) => {
    setEditingTask(task);
    setFormMode('edit');
    setShowForm(true);
  };
  const handleDateSelect = (date: string) => setSelectedDate(date);
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

  const isToday = selectedDate === new Date().toISOString().slice(0, 10);

  // 时段问候
  const hour = new Date().getHours();
  const greetingWord = hour < 6 ? '夜深了' : hour < 11 ? '早上好' : hour < 14 ? '中午好' : hour < 18 ? '下午好' : '晚上好';

  // 背景图：主题专属 banner 优先，否则必应每日壁纸（再兜底品牌渐变）
  const bannerImage = themeBanner || wallpaper?.url;

  return (
    <div>
      {/* 问候卡 */}
      <Card className="relative mb-6 min-h-[140px] overflow-hidden !border-0 bg-gradient-to-br from-brand-600 via-brand-700 to-brand-800 text-white shadow-lg shadow-brand-900/20 dark:from-brand-700 dark:via-brand-800 dark:to-slate-900">
        {/* 背景图：主题专属 banner / 必应每日壁纸（无图时保持上方渐变兜底） */}
        {bannerImage && (
          <img
            src={bannerImage}
            alt=""
            aria-hidden
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        {/* 深色渐变遮罩：保证文字可读 */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/80 via-brand-900/60 to-black/40 dark:from-black/85 dark:via-slate-900/70 dark:to-black/55" />

        {/* 装饰光斑 */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 right-1/3 h-40 w-40 rounded-full bg-amber-300/20 blur-3xl" />
        <KirbyHeroDecorations />

        <div className="relative flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight drop-shadow-sm">
              {greetingWord}，{user?.name || '老师'}
              <motion.span
                animate={{ rotate: [0, 14, -8, 14, 0] }}
                transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 3 }}
                className="inline-block"
              >
                👋
              </motion.span>
            </h2>
            <p className="mt-1.5 text-sm text-white/85">
              {new Date(selectedDate).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {teachingWeek && !teachingWeek.isBreak && teachingWeek.week && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-xs font-medium backdrop-blur-sm ring-1 ring-white/25">
                  📚 {teachingWeek.name} · 第 {teachingWeek.week} 周
                </span>
              )}
              {holidayCountdown && (
                holidayCountdown.isToday ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/40 px-3 py-1 text-xs font-medium ring-1 ring-amber-200/40 backdrop-blur-sm">
                    🎉 今天是{holidayCountdown.name}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/40 px-3 py-1 text-xs font-medium ring-1 ring-amber-200/40 backdrop-blur-sm">
                    🎉 距{holidayCountdown.name} {holidayCountdown.daysUntil} 天
                  </span>
                )
              )}
              {breakCountdown && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/35 px-3 py-1 text-xs font-medium ring-1 ring-emerald-200/30 backdrop-blur-sm">
                  🏖️ 距{breakCountdown.label} {breakCountdown.daysUntil} 天
                </span>
              )}
            </div>
          </div>
          <div className="hidden max-w-[220px] flex-col items-end gap-2 sm:flex">
            <p className="text-right text-sm italic leading-relaxed text-white/90">“{quote}”</p>
          </div>
        </div>

        {/* 壁纸版权角标（仅必应壁纸显示） */}
        {!themeBanner && wallpaper?.copyright && (
          <p className="absolute bottom-2 right-3 z-10 hidden max-w-[55%] truncate text-[10px] text-white/55 lg:block">
            {wallpaper.copyright}
          </p>
        )}
      </Card>

      {/* 逾期任务提醒 */}
      {overdueTasks.length > 0 && (
        <Card className="mb-6 !border-red-200 bg-red-50/50 dark:!border-red-500/30 dark:bg-red-500/5">
          <button
            onClick={() => setShowOverdue(!showOverdue)}
            className="flex w-full items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400">
                <AlertTriangle className="h-5 w-5" />
              </span>
              <div className="text-left">
                <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                  {overdueTasks.length} 个任务已逾期
                </p>
                <p className="text-xs text-red-600/70 dark:text-red-400/70">
                  {overdueTasks.slice(0, 2).map((t) => t.title).join('、')}{overdueTasks.length > 2 ? ' 等' : ''}
                </p>
              </div>
            </div>
            <motion.span animate={{ rotate: showOverdue ? 90 : 0 }} className="text-red-400">
              <ChevronRight className="h-5 w-5" />
            </motion.span>
          </button>
          <AnimatePresence>
            {showOverdue && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 space-y-2 overflow-hidden"
              >
                {overdueTasks.map((task) => (
                  <KirbyTaskCard key={task.id} task={task} onClick={() => handleTaskClick(task)} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      )}

      {/* 快捷入口 */}
      <div className="mb-7 grid grid-cols-2 gap-x-4 gap-y-5 py-2 sm:grid-cols-4">
        {isKirby ? (
          <>
            <QuickLink to="/students" icon={<GraduationCap className="h-5 w-5" />} label="学生管理" sticker="kirbySit" kirby />
            <QuickLink to="/notices" icon={<Bell className="h-5 w-5" />} label="通知看板" sticker="bow" kirby />
            <QuickLink to="/calendar" icon={<CalendarDays className="h-5 w-5" />} label="日历视图" sticker="starCute" kirby />
            <QuickLink to="/inspiration" icon={<ListChecks className="h-5 w-5" />} label="灵感记录" sticker="candy" kirby />
          </>
        ) : (
          <>
            <QuickLink to="/students" icon={<GraduationCap className="h-5 w-5" />} label="学生管理" />
            <QuickLink to="/notices" icon={<Bell className="h-5 w-5" />} label="通知看板" />
            <QuickLink to="/calendar" icon={<CalendarDays className="h-5 w-5" />} label="日历视图" />
            <QuickLink to="/inspiration" icon={<ListChecks className="h-5 w-5" />} label="灵感记录" />
          </>
        )}
      </div>

      <SmartBar />

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="min-w-0 flex-1">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
              <ListChecks className="h-5 w-5 text-brand-500" />
              {isToday ? '今日任务' : '当日任务'}
            </h3>
            <Button size="sm" onClick={() => { setFormMode('create'); setEditingTask(null); setShowForm(true); }}>
              <Plus className="h-4 w-4" /> 添加
            </Button>
          </div>

          {isLoading ? (
            <LoadingState />
          ) : (
            <AnimatePresence mode="popLayout">
              {todayActive.length > 0 ? (
                <motion.div layout className="space-y-2">
                  {todayActive.map((task) => (
                  <motion.div key={task.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                      <KirbyTaskCard task={task} onClick={() => handleTaskClick(task)} />
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <EmptyState title="今天还没有任务" hint="用上方输入框一句话添加，或点击右上角「添加」" icon={<CalendarDays className="h-6 w-6" />} />
              )}

              {todayDone.length > 0 && (
                <div className="mt-6">
                  <button onClick={() => setShowTodayDone(!showTodayDone)} className="mb-3 flex items-center gap-2 text-xs font-medium text-slate-500 transition-opacity hover:opacity-70 dark:text-slate-400">
                    <motion.span animate={{ rotate: showTodayDone ? 90 : 0 }}><ChevronRight className="h-4 w-4" /></motion.span>
                    已完成 ({todayDone.length})
                  </button>
                  <AnimatePresence>
                    {showTodayDone && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-2 overflow-hidden">
                        {todayDone.map((task) => (
                          <motion.div key={task.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                            <KirbyTaskCard task={task} onClick={() => handleTaskClick(task)} />
                          </motion.div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </AnimatePresence>
          )}

          {unscheduledActive.length > 0 && (
            <div className="mt-8">
              <h3 className="mb-3 text-base font-semibold text-slate-900 dark:text-slate-100">待安排任务</h3>
              <div className="space-y-2">
                {unscheduledActive.map((task) => (
                  <motion.div key={task.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <KirbyTaskCard task={task} onClick={() => handleTaskClick(task)} />
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 侧栏 */}
        <div className="w-full shrink-0 space-y-4 lg:w-72">
          <MiniCalendar onDateSelect={handleDateSelect} />
          <Card className="relative overflow-hidden">
            <KirbyCornerSticker sticker="kirbyWalk" className="absolute -right-3 -top-4 h-20 w-20 opacity-50" />
            <p className="relative mb-1 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">今日完成率</p>
            <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{completionRate}%</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div className="h-full rounded-full bg-brand-600 transition-all duration-500" style={{ width: `${completionRate}%` }} />
            </div>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{todayDone.length}/{totalToday} 项已完成</p>
          </Card>
        </div>
      </div>

      <Drawer open={showForm} onClose={() => setShowForm(false)} title={formMode === 'create' ? '新建任务' : '编辑任务'}>
        <TaskForm
          key={editingTask?.id || 'create'}
          initial={formMode === 'edit' ? editingTask || undefined : { dueDate: selectedDate }}
          onSubmit={handleFormSubmit}
          onCancel={() => setShowForm(false)}
        />
        {formMode === 'edit' && (
          <div className="mt-6 border-t border-slate-200 pt-6 dark:border-slate-800">
            <Button variant="danger" onClick={handleDelete} className="w-full">删除任务</Button>
          </div>
        )}
      </Drawer>
    </div>
  );
}

function QuickLink({ to, icon, label, sticker, kirby }: { to: string; icon: React.ReactNode; label: string; sticker?: React.ComponentProps<typeof KirbyCornerSticker>['sticker']; kirby?: boolean }) {
  if (!kirby) {
    return (
      <Link
        to={to}
        className="flex min-h-[86px] items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm transition-all hover:border-brand-300 hover:shadow-card-hover dark:border-slate-800 dark:bg-slate-900 dark:hover:border-brand-500/40"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
          {icon}
        </span>
        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span>
      </Link>
    );
  }

  return (
    <Link
      to={to}
      className="group relative flex min-h-[86px] items-center gap-3 rounded-xl border border-slate-200 bg-white py-3 pl-3 pr-24 shadow-sm transition-all hover:border-brand-300 hover:shadow-card-hover dark:border-slate-800 dark:bg-slate-900 dark:hover:border-brand-500/40"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
        {icon}
      </span>
      <span className="relative text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span>
      <div className="pointer-events-none absolute inset-y-0 right-0 w-24 rounded-l-[1.15rem] bg-gradient-to-br from-pink-50 via-white to-pink-100/80 dark:from-pink-500/10 dark:via-slate-900 dark:to-pink-500/5" />
      {sticker && <KirbyCornerSticker sticker={sticker} className="absolute -right-1 top-1/2 h-[4.25rem] w-[4.25rem] -translate-y-1/2 rotate-6 opacity-95" />}
    </Link>
  );
}

const TASK_STICKERS = ['kirbyWink', 'starCute', 'cakeSmall', 'kirbySit', 'bow'] as const;

function KirbyTaskCard({ task, onClick }: { task: Task; onClick: () => void }) {
  const isKirby = useThemeStore((s) => s.palette === 'kirby');
  if (!isKirby) return <TaskCard task={task} onClick={onClick} />;

  // 按任务 id 稳定轮换贴纸，避免所有任务卡都是同一张
  const hash = task.id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const sticker = TASK_STICKERS[hash % TASK_STICKERS.length];

  return (
    <div className="relative">
      <TaskCard task={task} onClick={onClick} />
      <KirbyCornerSticker sticker={sticker} className="absolute -bottom-1.5 right-1.5 h-14 w-14 rotate-[-8deg] opacity-25" />
    </div>
  );
}
