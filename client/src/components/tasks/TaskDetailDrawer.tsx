import { useState } from 'react';
import { Wrench } from 'lucide-react';
import type { Task } from '../../types';
import { useTaskStore } from '../../stores/taskStore';
import TaskForm from './TaskForm';
import Button from '../ui/Button';
import Drawer from '../ui/Drawer';
import { useToastStore } from '../../stores/toastStore';
import * as tasksApi from '../../api/tasks';

interface TaskDetailDrawerProps {
  task: Task | null;
  open: boolean;
  onClose: () => void;
}

export default function TaskDetailDrawer({ task, open, onClose }: TaskDetailDrawerProps) {
  const { updateTask, deleteTask, fetchTasks } = useTaskStore();
  const toast = useToastStore();
  const [decomposing, setDecomposing] = useState(false);

  const handleUpdate = async (data: Partial<Task>) => {
    if (!task) return;
    await updateTask(task.id, data);
    toast.success('任务已更新');
    onClose();
    await fetchTasks();
  };

  const handleDelete = async () => {
    if (!task) return;
    if (!confirm('确定删除这个任务？')) return;
    await deleteTask(task.id);
    toast.success('任务已删除');
    onClose();
    await fetchTasks();
  };

  const handleDecompose = async () => {
    if (!task) return;
    setDecomposing(true);
    try {
      await tasksApi.decomposeTask(task.id);
      toast.success('已拆解为子任务');
      onClose();
      await fetchTasks();
    } catch {
      toast.error('拆解失败，请重试');
    } finally {
      setDecomposing(false);
    }
  };

  return (
    <Drawer open={open} onClose={onClose} title="任务详情">
      {task && (
        <>
          <TaskForm key={task.id} initial={task} onSubmit={handleUpdate} onCancel={onClose} />
          <div className="mt-6 space-y-3 border-t border-slate-200 pt-6 dark:border-slate-800">
            <Button variant="secondary" onClick={handleDecompose} disabled={decomposing} className="w-full">
              <Wrench className="h-4 w-4" />
              {decomposing ? '拆解中...' : 'AI 拆解为子任务'}
            </Button>
            <Button variant="danger" onClick={handleDelete} className="w-full">
              删除任务
            </Button>
          </div>
        </>
      )}
    </Drawer>
  );
}
