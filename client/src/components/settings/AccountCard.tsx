import { useState } from 'react';
import Card from './Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { useToastStore } from '../../stores/toastStore';

interface Props {
  email: string;
  name: string;
  onSave: (name: string, password: string) => Promise<void>;
}

export default function AccountCard({ email, name: initialName, onSave }: Props) {
  const [name, setName] = useState(initialName);
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const toast = useToastStore();

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(name, password);
      toast.success('个人信息已更新');
      setPassword('');
    } catch {
      toast.error('更新失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title="账号信息">
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-400">邮箱</label>
          <p className="py-1 text-sm text-slate-700 dark:text-slate-300">{email}</p>
        </div>
        <Input label="昵称" id="accountName" value={name} onChange={(e) => setName(e.target.value)} placeholder="你的名字" />
        <Input label="新密码" id="accountPassword" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="留空不修改" />
        <Button onClick={handleSave} disabled={saving}>{saving ? '保存中...' : '更新信息'}</Button>
      </div>
    </Card>
  );
}
