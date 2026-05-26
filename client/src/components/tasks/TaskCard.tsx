import { motion } from 'framer-motion';
import { Flame } from 'lucide-react';
import type { Task } from '../../types';
import { PRIORITY_COLORS, STATUS_LABELS } from '../../types';
import { useTaskStore } from '../../stores/taskStore';

interface TaskCardProps {
  task: Task;
  onClick: () => void;
  compact?: boolean;
}

const priorityBg: Record<string, string> = {
  high: 'bg-rose',
  medium: 'bg-cream',
  low: 'bg-blue',
};

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

  const isHigh = task.priority === 'high' && task.status !== 'done';
  const desc = task.description || '';

  // Extract email info lines for card display
  const emailLines: string[] = [];
  if (desc) {
    const lines = desc.split('\n');
    for (const line of lines) {
      if (
        line.startsWith('\u{1F4E7}') ||
        line.startsWith('\u{1F4CB}') ||
        line.startsWith('\u{1F4CE}')
      ) {
        emailLines.push(
          line.replace(/^[\u{1F4E7}\u{1F4CB}\u{1F4CE}]\s*/, ''),
        );
      }
    }
  }

  const cardBg =
    task.status === 'done'
      ? 'bg-white opacity-50'
      : priorityBg[task.priority] || 'bg-white';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      onClick={onClick}
      className={`border-2 border-black rounded-2xl p-3 cursor-pointer transition-all group shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${cardBg}`}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={handleStatusClick}
          className="mt-1 w-5 h-5 rounded-full border-2 border-black flex-shrink-0 transition-colors"
          style={{
            backgroundColor:
              task.status === 'done'
                ? '#000'
                : task.status === 'in_progress'
                  ? PRIORITY_COLORS[task.priority]
                  : 'transparent',
          }}
        />
        <div className="flex-1 min-w-0">
          <p
            className={`text-sm flex items-center gap-1.5 font-bold ${
              task.status === 'done'
                ? 'line-through text-gray-500'
                : 'text-black'
            }`}
          >
            {isHigh && (
              <Flame className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
            )}
            {task.title}
          </p>
          {!compact && emailLines.length > 0 && (
            <div className="mt-1.5 space-y-0.5">
              {emailLines.map((line, i) => (
                <p key={i} className="text-xs text-gray-500 truncate">
                  {line}
                </p>
              ))}
            </div>
          )}
          {!compact && (
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {task.dueTime && (
                <span className="text-xs text-gray-500 font-bold">
                  {task.dueTime}
                </span>
              )}
              {task.category && (
                <span className="text-xs px-2 py-0.5 rounded-full border border-black bg-lavender text-black font-bold">
                  {task.category}
                </span>
              )}
              <span className="text-xs text-gray-500 font-bold">
                {STATUS_LABELS[task.status]}
              </span>
            </div>
          )}
        </div>
        <div
          className="w-2 h-2 rounded-full border border-black flex-shrink-0 mt-1.5"
          style={{ backgroundColor: PRIORITY_COLORS[task.priority] }}
          title={task.priority}
        />
      </div>
    </motion.div>
  );
}
