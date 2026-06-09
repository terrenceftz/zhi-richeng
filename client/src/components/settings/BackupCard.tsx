import { useState, useRef } from 'react';
import { Download } from 'lucide-react';
import Card from './Card';
import Button from '../ui/Button';
import client from '../../api/client';

export default function BackupCard() {
  const [backingUp, setBackingUp] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleBackup = async () => {
    setBackingUp(true);
    setMessage('');
    try {
      const response = await client.get('/backup', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = url;
      const now = new Date();
      const ts = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}`;
      a.download = `zhi-richeng-backup-${ts}.sql`;
      a.click();
      window.URL.revokeObjectURL(url);
      setStatus('success');
      setMessage('备份文件已下载');
    } catch {
      setStatus('error');
      setMessage('备份失败，请重试');
    } finally {
      setBackingUp(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.sql') && !file.name.endsWith('.txt') && !file.name.endsWith('.db')) {
      setStatus('error');
      setMessage('请选择 .sql 格式的备份文件');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    const confirmed = window.confirm(
      '⚠️ 恢复备份将覆盖当前所有数据，此操作不可撤销！\n\n' +
      '系统会在恢复前自动备份当前数据，但建议你手动下载一份备份以防万一。\n\n' +
      '确定要继续吗？'
    );
    if (!confirmed) return;

    setRestoring(true);
    setMessage('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      await client.post('/backup/restore', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setStatus('success');
      setMessage('数据恢复成功！刷新页面以加载新数据');
      if (fileRef.current) fileRef.current.value = '';
    } catch (err: any) {
      setStatus('error');
      setMessage(err?.response?.data?.message || '恢复失败，请检查备份文件格式');
    } finally {
      setRestoring(false);
      setTimeout(() => setMessage(''), 5000);
    }
  };

  return (
    <Card>
      <h3 className="text-lg font-black mb-1">数据备份</h3>
      <p className="font-bold text-sm opacity-50 mb-4">导出数据库备份文件，或从备份文件恢复数据</p>

      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-sm font-bold">下载备份</p>
            <p className="text-xs font-bold opacity-50">导出完整的数据库备份文件（SQL 格式）</p>
          </div>
          <Button onClick={handleBackup} disabled={backingUp}>
            <Download className="w-4 h-4 mr-1.5" />
            {backingUp ? '导出中...' : '下载备份'}
          </Button>
        </div>

        <div className="border-t-2 border-black" />

        <div>
          <p className="text-sm font-bold mb-1">恢复备份</p>
          <p className="text-xs font-bold opacity-50 mb-3">
            上传之前下载的 .sql 备份文件，恢复数据。恢复前会自动备份当前数据。
          </p>
          <input ref={fileRef} type="file" accept=".sql,.txt" onChange={handleRestore}
            className="block w-full text-sm font-bold file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-2 file:border-black file:bg-white file:text-sm file:font-bold file:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:file:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:file:-translate-x-0.5 hover:-translate-y-0.5 file:transition-all file:cursor-pointer"
          />
          {restoring && (
            <p className="text-sm font-bold opacity-50 mt-2">正在恢复数据，请稍候...</p>
          )}
        </div>

        {message && (
          <div className={`p-3 rounded-xl border-2 border-black text-sm font-bold ${
            status === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
          }`}>
            {status === 'success' ? '✅ ' : '❌ '}{message}
          </div>
        )}
      </div>
    </Card>
  );
}
