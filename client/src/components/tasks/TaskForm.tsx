import { useState, type FormEvent } from 'react';
import type { Task } from '../../types';
import Button from '../ui/Button';
import Input from '../ui/Input';

interface TaskFormProps {
  initial?: Partial<Task>;
  onSubmit: (data: Partial<Task>) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function TaskForm({
  initial,
  onSubmit,
  onCancel,
  isLoading,
}: TaskFormProps) {
  const [title, setTitle] = useState(initial?.title || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [location, setLocation] = useState(initial?.location || '');
  const [priority, setPriority] = useState(initial?.priority || 'medium');
  const [category, setCategory] = useState(
    initial?.category || '通用',
  );
  const [dueDate, setDueDate] = useState(initial?.dueDate || '');
  const [dueTime, setDueTime] = useState(initial?.dueTime || '');
  const [status, setStatus] = useState(initial?.status || 'todo');
  const [remind, setRemind] = useState(
    initial?.remind !== undefined ? initial.remind : true,
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      location: location.trim() || undefined,
      priority: priority as Task['priority'],
      category,
      dueDate: dueDate || undefined,
      dueTime: dueTime || undefined,
      remind,
      status: status as Task['status'],
    });
  };

  const selectClasses =
    'w-full bg-white border-2 border-black rounded-xl px-4 py-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:outline-none font-bold text-sm transition-all';

  const dateInputClasses =
    'w-full bg-white border-2 border-black rounded-xl px-4 py-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:outline-none font-bold text-sm transition-all';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label={'任务标题'}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={'输入任务标题'}
        required
      />
      <div>
        <label className="block text-sm font-bold mb-1">
          {'备注'}
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={'添加备注...'}
          className="w-full bg-white border-2 border-black rounded-xl px-4 py-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:outline-none font-bold placeholder-gray-400 transition-all resize-none h-20 text-sm"
        />
      </div>
      <Input
        label={'地点'}
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        placeholder={'会议室、线上链接等'}
      />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-bold mb-1">
            {'优先级'}
          </label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as Task['priority'])}
            className={selectClasses}
          >
            <option value="high">{'高'}</option>
            <option value="medium">{'中'}</option>
            <option value="low">{'低'}</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-bold mb-1">
            {'类型'}
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={selectClasses}
          >
            <option value={'通用'}>{'通用'}</option>
            <option value={'资料收集'}>
              {'资料收集'}
            </option>
            <option value={'审核'}>{'审核'}</option>
            <option value={'会议'}>{'会议'}</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-bold mb-1">
            {'日期'}
          </label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className={dateInputClasses}
          />
        </div>
        <div>
          <label className="block text-sm font-bold mb-1">
            {'时间'}
          </label>
          <input
            type="time"
            value={dueTime}
            onChange={(e) => setDueTime(e.target.value)}
            className={dateInputClasses}
          />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-black">
            {'飞书提醒'}
          </p>
          <p className="text-xs text-gray-500">
            {remind
              ? '会在截止时间通过飞书通知你'
              : '不发送提醒通知'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setRemind(!remind)}
          className={`w-12 h-6 rounded-full border-2 border-black transition-colors relative ${
            remind ? 'bg-coral' : 'bg-white'
          }`}
        >
          <div
            className={`w-4 h-4 rounded-full absolute top-0.5 transition-transform border border-black ${
              remind
                ? 'translate-x-6 bg-white'
                : 'translate-x-0.5 bg-black'
            }`}
          />
        </button>
      </div>
      <div>
        <label className="block text-sm font-bold mb-1">
          {'状态'}
        </label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as Task['status'])}
          className={selectClasses}
        >
          <option value="todo">{'待办'}</option>
          <option value="in_progress">{'进行中'}</option>
          <option value="done">{'完成'}</option>
        </select>
      </div>
      <div className="flex gap-3 pt-2">
        <Button type="submit" className="flex-1" disabled={isLoading}>
          {isLoading ? '保存中...' : '保存'}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          {'取消'}
        </Button>
      </div>
    </form>
  );
}
