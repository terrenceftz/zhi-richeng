import { useState } from 'react';
import Card from './Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { useToastStore } from '../../stores/toastStore';

interface Props {
  name: string;
  start: string;
  end: string;
  onSave: (name: string, start: string, end: string) => Promise<void>;
}

export default function SemesterCard({ name: initialName, start: initialStart, end: initialEnd, onSave }: Props) {
  const [name, setName] = useState(initialName);
  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(initialEnd);
  const [saving, setSaving] = useState(false);
  const toast = useToastStore();

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(name, start, end);
      toast.success('学期配置已保存');
    } catch {
      toast.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title="📅 学期配置" subtitle="设置学期起止日期，首页自动显示当前教学周">
      <div className="space-y-3">
        <Input label="学期名称" id="semesterName" value={name} onChange={(e) => setName(e.target.value)} placeholder="如：2025-2026学年第二学期" />
        <Input label="学期起始（第一周周一）" id="semesterStart" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
        <Input label="学期结束（最后一天）" id="semesterEnd" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
        <Button onClick={handleSave} disabled={saving}>{saving ? '保存中...' : '保存学期'}</Button>
        <p className="text-xs text-slate-500 dark:text-slate-400">每学期开始时更新一次即可。起始日设为第一周周一，首页自动计算当前教学周。</p>
      </div>
    </Card>
  );
}
