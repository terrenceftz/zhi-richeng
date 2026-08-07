import { useState, type FormEvent } from 'react';
import type { Task } from '../../types';
import Button from '../ui/Button';
import Input, { Select, Textarea } from '../ui/Input';
import Switch from '../ui/Switch';

interface TaskFormProps {
  initial?: Partial<Task>;
  onSubmit: (data: Partial<Task>) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function TaskForm({ initial, onSubmit, onCancel, isLoading }: TaskFormProps) {
  const [title, setTitle] = useState(initial?.title || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [location, setLocation] = useState(initial?.location || '');
  const [priority, setPriority] = useState<Task['priority']>(initial?.priority || 'medium');
  const [category, setCategory] = useState(initial?.category || '通用');
  const [dueDate, setDueDate] = useState(initial?.dueDate?.slice(0, 10) || '');
  const [dueTime, setDueTime] = useState(initial?.dueTime || '');
  const [status, setStatus] = useState<Task['status']>(initial?.status || 'todo');
  const [remind, setRemind] = useState(initial?.remind !== undefined ? initial.remind : true);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      location: location.trim() || undefined,
      priority,
      category,
      dueDate: dueDate || undefined,
      dueTime: dueTime || undefined,
      remind,
      status,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input label="任务标题" id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="输入任务标题" required />
      <Textarea label="备注" id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="添加备注..." />
      <Input label="地点" id="location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="会议室、线上链接等" />

      <div className="grid grid-cols-2 gap-3">
        <Select label="优先级" id="priority" value={priority} onChange={(e) => setPriority(e.target.value as Task['priority'])}>
          <option value="high">高</option>
          <option value="medium">中</option>
          <option value="low">低</option>
        </Select>
        <Select label="类型" id="category" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="通用">通用</option>
          <option value="资料收集">资料收集</option>
          <option value="审核">审核</option>
          <option value="会议">会议</option>
        </Select>
        <Input label="日期" id="dueDate" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        <Input label="时间" id="dueTime" type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} />
      </div>

      <Select label="状态" id="status" value={status} onChange={(e) => setStatus(e.target.value as Task['status'])}>
        <option value="todo">待办</option>
        <option value="in_progress">进行中</option>
        <option value="done">完成</option>
      </Select>

      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-800/50">
        <div>
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">飞书提醒</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{remind ? '会在截止时间通过飞书通知你' : '不发送提醒通知'}</p>
        </div>
        <Switch checked={remind} onChange={setRemind} label="飞书提醒" />
      </div>

      <div className="flex gap-3 pt-1">
        <Button type="submit" className="flex-1" disabled={isLoading}>
          {isLoading ? '保存中...' : '保存'}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          取消
        </Button>
      </div>
    </form>
  );
}
