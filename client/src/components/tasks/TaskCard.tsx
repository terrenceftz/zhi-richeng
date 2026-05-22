import { motion } from 'framer-motion';
import type { Task } from '../../types';
import { PRIORITY_COLORS, STATUS_LABELS } from '../../types';
import { useTaskStore } from '../../stores/taskStore';

interface TaskCardProps {
  task: Task;
  onClick: () => void;
  compact?: boolean;
}

export default function TaskCard({ task, onClick, compact }: TaskCardProps) {
  const updateStatus = useTaskStore((s) => s.updateStatus);

  const statusCycle: Record<string, string> = {
    todo: 'in_progress',
    in_progress: 'done',
    done: 'todo',
  };

  const handleStatusClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateStatus(task.id, statusCycle[task.status]);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      onClick={onClick}
      className={`bg-surface-light border border-[#252547] rounded-xl p-3 cursor-pointer hover:border-primary/50 transition-colors group ${task.status === 'done' ? 'opacity-60' : ''}`}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={handleStatusClick}
          className="mt-1 w-5 h-5 rounded-full border-2 flex-shrink-0 transition-colors"
          style={{
            borderColor: task.status === 'done' ? '#565f89' : PRIORITY_COLORS[task.priority],
            backgroundColor: task.status === 'done' ? '#565f89' : task.status === 'in_progress' ? PRIORITY_COLORS[task.priority] : 'transparent',
          }}
        />
        <div className="flex-1 min-w-0">
          <p className={`text-sm ${task.status === 'done' ? 'line-through text-muted' : 'text-white'}`}>
            {task.title}
          </p>
          {!compact && (
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {task.dueTime && <span className="text-xs text-muted">{task.dueTime}</span>}
              {task.category && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">{task.category}</span>
              )}
              <span className="text-xs text-muted">{STATUS_LABELS[task.status]}</span>
            </div>
          )}
        </div>
        <div
          className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
          style={{ backgroundColor: PRIORITY_COLORS[task.priority] }}
          title={task.priority}
        />
      </div>
    </motion.div>
  );
}
