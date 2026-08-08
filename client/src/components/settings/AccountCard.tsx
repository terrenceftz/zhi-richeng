import { useState } from 'react';
import Card from './Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { useToastStore } from '../../stores/toastStore';

interface Props {
  email: string;
  name: string;
  onSave: (name: string, password: string, oldPassword: string) => Promise<void>;
}

export default function AccountCard({ email, name: initialName, onSave }: Props) {
  const [name, setName] = useState(initialName);
  const [password, setPassword] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const toast = useToastStore();

  const handleSave = async () => {
    // 改密码必须填写原密码（安全要求）
    if (password && !oldPassword) {
      toast.error('修改密码需填写原密码');
      return;
    }
    setSaving(true);
    try {
      await onSave(name, password, oldPassword);
      toast.success('个人信息已更新');
      setPassword('');
      setOldPassword('');
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || '更新失败';
      toast.error(msg);
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
        <Input
          label="原密码"
          id="accountOldPassword"
          type="password"
          value={oldPassword}
          onChange={(e) => setOldPassword(e.target.value)}
          placeholder="修改密码时必填"
          autoComplete="current-password"
        />
        <Input label="新密码" id="accountPassword" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="留空不修改" />
        <Button onClick={handleSave} disabled={saving}>{saving ? '保存中...' : '更新信息'}</Button>
      </div>
    </Card>
  );
}
