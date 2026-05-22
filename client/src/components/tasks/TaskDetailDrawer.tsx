import { motion, AnimatePresence } from 'framer-motion';
import type { Task } from '../../types';
import { useTaskStore } from '../../stores/taskStore';
import TaskForm from './TaskForm';
import Button from '../ui/Button';

interface TaskDetailDrawerProps {
  task: Task | null;
  open: boolean;
  onClose: () => void;
}

export default function TaskDetailDrawer({ task, open, onClose }: TaskDetailDrawerProps) {
  const { updateTask, deleteTask, fetchTasks } = useTaskStore();

  if (!task) return null;

  const handleUpdate = async (data: Partial<Task>) => {
    await updateTask(task.id, data);
    onClose();
    await fetchTasks();
  };

  const handleDelete = async () => {
    if (!confirm('确定删除这个任务？')) return;
    await deleteTask(task.id);
    onClose();
    await fetchTasks();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/40 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed right-0 top-0 h-full w-full max-w-md bg-surface border-l border-[#252547] z-50 overflow-y-auto"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25 }}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold">任务详情</h2>
                <button onClick={onClose} className="text-muted hover:text-white text-xl">&times;</button>
              </div>
              <TaskForm initial={task} onSubmit={handleUpdate} onCancel={onClose} />
              <div className="mt-6 pt-6 border-t border-[#252547]">
                <Button variant="danger" onClick={handleDelete} className="w-full">删除任务</Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
