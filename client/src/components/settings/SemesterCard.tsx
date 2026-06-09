import { useState } from 'react';
import Card from './Card';
import Button from '../ui/Button';
import Input from '../ui/Input';

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
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'success' | 'error'>('success');

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(name, start, end);
      setStatus('success');
      setMessage('学期配置已保存');
    } catch {
      setStatus('error');
      setMessage('保存失败');
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  return (
    <Card>
      <h3 className="text-lg font-black mb-1">📅 学期配置</h3>
      <p className="font-bold text-sm opacity-50 mb-4">设置学期起止日期，首页自动显示当前教学周</p>

      <div className="space-y-3">
        <Input label="学期名称" value={name} onChange={(e) => setName(e.target.value)} placeholder="如：2025-2026学年第二学期" />
        <Input label="学期起始（第一周周一）" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
        <Input label="学期结束（最后一天）" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? '保存中...' : '保存学期'}
          </Button>
          {message && (
            <span className={`text-sm font-bold ${status === 'success' ? 'text-green-600' : 'text-red-500'}`}>{message}</span>
          )}
        </div>
        <p className="text-xs font-bold opacity-50">
          每学期开始时更新一次即可。起始日设为第一周周一，首页自动计算当前教学周。
        </p>
      </div>
    </Card>
  );
}
