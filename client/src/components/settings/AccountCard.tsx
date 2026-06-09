import { useState } from 'react';
import Card from './Card';
import Button from '../ui/Button';
import Input from '../ui/Input';

interface Props {
  email: string;
  name: string;
  onSave: (name: string, password: string) => Promise<void>;
}

export default function AccountCard({ email, name: initialName, onSave }: Props) {
  const [name, setName] = useState(initialName);
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'success' | 'error'>('success');

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(name, password);
      setStatus('success');
      setMessage('个人信息已更新');
      setPassword('');
    } catch {
      setStatus('error');
      setMessage('更新失败');
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  return (
    <Card>
      <h3 className="text-lg font-black mb-4">账号信息</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-bold opacity-50 mb-1">邮箱</label>
          <p className="text-sm font-bold py-1">{email}</p>
        </div>
        <Input label="昵称" value={name} onChange={(e) => setName(e.target.value)} placeholder="你的名字" />
        <Input label="新密码" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="留空不修改" />
        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? '保存中...' : '更新信息'}
          </Button>
          {message && (
            <span className={`text-sm font-bold ${status === 'success' ? 'text-green-600' : 'text-red-500'}`}>{message}</span>
          )}
        </div>
      </div>
    </Card>
  );
}
