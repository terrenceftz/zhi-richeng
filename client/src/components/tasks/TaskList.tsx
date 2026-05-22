import { AnimatePresence } from 'framer-motion';
import type { Task } from '../../types';
import TaskCard from './TaskCard';

interface TaskListProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  emptyMessage?: string;
}

export default function TaskList({ tasks, onTaskClick, emptyMessage = '暂无任务' }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <div className="text-center text-muted py-12">
        <p className="text-4xl mb-3">📭</p>
        <p className="text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <AnimatePresence>
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
        ))}
      </AnimatePresence>
    </div>
  );
}
