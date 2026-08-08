import { useState, useRef } from 'react';
import { Download, Upload } from 'lucide-react';
import Card from './Card';
import Button from '../ui/Button';
import client from '../../api/client';
import { useToastStore } from '../../stores/toastStore';

export default function BackupCard() {
  const [backingUp, setBackingUp] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const toast = useToastStore();

  const handleBackup = async () => {
    setBackingUp(true);
    try {
      const response = await client.get('/backup', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = url;
      const now = new Date();
      const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
      a.download = `zhi-richeng-backup-${ts}.db`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('备份文件已下载');
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      toast.error(status === 403 ? '仅管理员可备份' : '备份失败，请重试');
    } finally {
      setBackingUp(false);
    }
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!/\.db$|\.sqlite$|\.sqlite3$/i.test(file.name)) {
      toast.error('请选择 .db 格式的备份文件');
      if (fileRef.current) fileRef.current.value = '';
      return;
    }

    const confirmed = window.confirm(
      '恢复备份将覆盖当前所有数据，此操作不可撤销！\n\n系统会在恢复前自动备份当前数据，但建议你手动下载一份备份以防万一。\n\n确定要继续吗？'
    );
    if (!confirmed) {
      if (fileRef.current) fileRef.current.value = '';
      return;
    }

    setRestoring(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await client.post('/backup/restore', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('数据恢复成功！刷新页面以加载新数据');
      if (fileRef.current) fileRef.current.value = '';
    } catch (err) {
      const e = err as { response?: { status?: number; data?: { message?: string } } };
      toast.error(e?.response?.data?.message || e?.response?.status === 403 ? '仅管理员可恢复' : '恢复失败，请检查备份文件格式');
    } finally {
      setRestoring(false);
    }
  };

  return (
    <Card title="数据备份" subtitle="导出数据库备份文件，或从备份文件恢复数据（仅管理员）">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">下载备份</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">导出完整的数据库备份文件（.db 二进制）</p>
          </div>
          <Button onClick={handleBackup} disabled={backingUp}>
            <Download className="h-4 w-4" />
            {backingUp ? '导出中...' : '下载备份'}
          </Button>
        </div>

        <div className="border-t border-slate-200 dark:border-slate-800" />

        <div>
          <p className="mb-1 text-sm font-medium text-slate-800 dark:text-slate-200">恢复备份</p>
          <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">上传之前下载的 .db 备份文件恢复数据。恢复前会自动备份当前数据。</p>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
            <Upload className="h-4 w-4" />
            {restoring ? '恢复中...' : '选择备份文件'}
            <input ref={fileRef} type="file" accept=".db,.sqlite,.sqlite3" onChange={handleRestore} className="hidden" disabled={restoring} />
          </label>
        </div>
      </div>
    </Card>
  );
}
