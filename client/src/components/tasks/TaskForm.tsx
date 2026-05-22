import { useState, FormEvent } from 'react';
import type { Task } from '../../types';
import Button from '../ui/Button';
import Input from '../ui/Input';

interface TaskFormProps {
  initial?: Partial<Task>;
  onSubmit: (data: Partial<Task>) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function TaskForm({ initial, onSubmit, onCancel, isLoading }: TaskFormProps) {
  const [title, setTitle] = useState(initial?.title || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [priority, setPriority] = useState(initial?.priority || 'medium');
  const [category, setCategory] = useState(initial?.category || '通用');
  const [dueDate, setDueDate] = useState(initial?.dueDate || '');
  const [dueTime, setDueTime] = useState(initial?.dueTime || '');
  const [status, setStatus] = useState(initial?.status || 'todo');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await onSubmit({ title: title.trim(), description: description.trim() || undefined, priority: priority as Task['priority'], category, dueDate: dueDate || undefined, dueTime: dueTime || undefined, status: status as Task['status'] });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input label="任务标题" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="输入任务标题" required />
      <div>
        <label className="block text-sm text-muted mb-1">备注</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="添加备注..."
          className="w-full bg-surface-light border border-[#353560] rounded-lg px-4 py-2.5 text-white placeholder-muted focus:outline-none focus:border-primary transition-colors resize-none h-20 text-sm" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm text-muted mb-1">优先级</label>
          <select value={priority} onChange={(e) => setPriority(e.target.value)}
            className="w-full bg-surface-light border border-[#353560] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-primary">
            <option value="high">高</option>
            <option value="medium">中</option>
            <option value="low">低</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-muted mb-1">类型</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)}
            className="w-full bg-surface-light border border-[#353560] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-primary">
            <option value="通用">通用</option>
            <option value="资料收集">资料收集</option>
            <option value="审核">审核</option>
            <option value="会议">会议</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-muted mb-1">日期</label>
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
            className="w-full bg-surface-light border border-[#353560] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-primary" />
        </div>
        <div>
          <label className="block text-sm text-muted mb-1">时间</label>
          <input type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)}
            className="w-full bg-surface-light border border-[#353560] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-primary" />
        </div>
      </div>
      <div>
        <label className="block text-sm text-muted mb-1">状态</label>
        <select value={status} onChange={(e) => setStatus(e.target.value)}
          className="w-full bg-surface-light border border-[#353560] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-primary">
          <option value="todo">待办</option>
          <option value="in_progress">进行中</option>
          <option value="done">完成</option>
        </select>
      </div>
      <div className="flex gap-3 pt-2">
        <Button type="submit" className="flex-1" disabled={isLoading}>{isLoading ? '保存中...' : '保存'}</Button>
        <Button type="button" variant="ghost" onClick={onCancel}>取消</Button>
      </div>
    </form>
  );
}
