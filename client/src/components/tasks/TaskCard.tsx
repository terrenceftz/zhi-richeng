import { motion } from 'framer-motion';
import { Flame, Clock, MapPin } from 'lucide-react';
import type { Task } from '../../types';
import { PRIORITY_COLORS, STATUS_LABELS, CATEGORY_LABELS, isOverdue } from '../../types';
import { useTaskStore } from '../../stores/taskStore';
import Badge, { PriorityBadge } from '../ui/Badge';

interface TaskCardProps {
  task: Task;
  onClick: () => void;
  compact?: boolean;
}

const statusCycle: Record<string, string> = {
  todo: 'in_progress',
  in_progress: 'done',
  done: 'todo',
};

export default function TaskCard({ task, onClick, compact }: TaskCardProps) {
  const updateStatus = useTaskStore((s) => s.updateStatus);

  const handleStatusClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = statusCycle[task.status];
    if (next) updateStatus(task.id, next);
  };

  const isHigh = task.priority === 'high' && task.status !== 'done';
  const isDone = task.status === 'done';
  const overdue = isOverdue(task);

  // 提取邮件相关行
  const desc = task.description || '';
  const emailLines: string[] = [];
  if (desc) {
    for (const line of desc.split('\n')) {
      if (/^[📧📋📎]/u.test(line)) emailLines.push(line.replace(/^[📧📋📎]\s*/u, ''));
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      onClick={onClick}
      className={`group relative cursor-pointer overflow-hidden rounded-xl border bg-white p-3 shadow-sm transition-all hover:shadow-card-hover dark:bg-slate-900 ${
        overdue
          ? 'border-red-300 bg-red-50/40 dark:border-red-500/40 dark:bg-red-500/5'
          : isHigh
            ? 'border-red-200 dark:border-red-500/40'
            : 'border-slate-200 dark:border-slate-800'
      } ${isDone ? 'opacity-60' : ''}`}
    >
      {/* 左侧色条：逾期用红色脉冲，否则用优先级色 */}
      <span
        className={`absolute inset-y-0 left-0 w-1 ${overdue ? 'animate-pulse' : ''}`}
        style={{ backgroundColor: overdue ? '#ef4444' : PRIORITY_COLORS[task.priority] }}
      />
      <div className="flex items-start gap-3 pl-1.5">
        <button
          onClick={handleStatusClick}
          aria-label={`切换状态（当前：${STATUS_LABELS[task.status]}）`}
          className="mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 transition-colors"
          style={{
            borderColor: isDone ? '#10b981' : PRIORITY_COLORS[task.priority],
            backgroundColor: isDone ? '#10b981' : task.status === 'in_progress' ? PRIORITY_COLORS[task.priority] : 'transparent',
          }}
        />
        <div className="min-w-0 flex-1">
          <p className={`flex min-w-0 items-center gap-1.5 text-sm font-medium ${isDone ? 'text-slate-400 line-through dark:text-slate-500' : 'text-slate-900 dark:text-slate-100'}`}>
            {isHigh && <Flame className="h-3.5 w-3.5 shrink-0 text-red-500" />}
            <span className="truncate">{task.title}</span>
          </p>

          {!compact && emailLines.length > 0 && (
            <div className="mt-1 space-y-0.5">
              {emailLines.map((line, i) => (
                <p key={i} className="truncate break-all text-xs text-slate-500 dark:text-slate-400">{line}</p>
              ))}
            </div>
          )}
          {!compact && desc && emailLines.length === 0 && (
            <p className="mt-1 truncate break-all text-xs text-slate-500 dark:text-slate-400">{desc}</p>
          )}

          {!compact && (
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {overdue && (
                <Badge tone="red">逾期</Badge>
              )}
              {task.dueTime && (
                <span className="inline-flex items-center gap-0.5 text-xs text-slate-500 dark:text-slate-400">
                  <Clock className="h-3 w-3" /> {task.dueTime}
                </span>
              )}
              {task.location && (
                <span className="inline-flex items-center gap-0.5 text-xs text-slate-500 dark:text-slate-400">
                  <MapPin className="h-3 w-3" /> {task.location}
                </span>
              )}
              {task.category && CATEGORY_LABELS[task.category] && (
                <Badge tone="gray">{task.category}</Badge>
              )}
              <PriorityBadge priority={task.priority} />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
