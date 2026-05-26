import { AnimatePresence } from 'framer-motion';
import { Inbox } from 'lucide-react';
import type { Task } from '../../types';
import TaskCard from './TaskCard';

interface TaskListProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  emptyMessage?: string;
}

export default function TaskList({
  tasks,
  onTaskClick,
  emptyMessage = '暂无任务',
}: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <div className="text-center py-12">
        <Inbox className="w-12 h-12 mx-auto mb-3 text-gray-400" />
        <p className="text-sm font-bold text-gray-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <AnimatePresence>
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onClick={() => onTaskClick(task)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
