import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Wrench } from 'lucide-react';
import type { Task } from '../../types';
import { useTaskStore } from '../../stores/taskStore';
import TaskForm from './TaskForm';
import Button from '../ui/Button';
import * as tasksApi from '../../api/tasks';

interface TaskDetailDrawerProps {
  task: Task | null;
  open: boolean;
  onClose: () => void;
}

export default function TaskDetailDrawer({
  task,
  open,
  onClose,
}: TaskDetailDrawerProps) {
  const { updateTask, deleteTask, fetchTasks } = useTaskStore();
  const [decomposing, setDecomposing] = useState(false);

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

  const handleDecompose = async () => {
    setDecomposing(true);
    try {
      await tasksApi.decomposeTask(task.id);
      onClose();
      await fetchTasks();
    } catch {
      alert('拆解失败，请重试');
    } finally {
      setDecomposing(false);
    }
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
            className="fixed right-0 top-0 h-full w-full max-w-md bg-white border-l-2 border-black z-50 overflow-y-auto shadow-[-4px_0px_0px_0px_rgba(0,0,0,1)]"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25 }}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-black">
                  {'任务详情'}
                </h2>
                <button
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center rounded-full border-2 border-black hover:bg-black/5 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <TaskForm
                initial={task}
                onSubmit={handleUpdate}
                onCancel={onClose}
              />
              <div className="mt-6 pt-6 border-t-2 border-black space-y-3">
                <Button
                  variant="secondary"
                  onClick={handleDecompose}
                  disabled={decomposing}
                  className="w-full flex items-center justify-center gap-2"
                >
                  <Wrench className="w-4 h-4" />
                  {decomposing
                    ? '拆解中...'
                    : 'AI 拆解为子任务'}
                </Button>
                <Button
                  variant="danger"
                  onClick={handleDelete}
                  className="w-full"
                >
                  {'删除任务'}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
