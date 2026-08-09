import { useState, useRef } from 'react';
import { PackageOpen, Upload, Download } from 'lucide-react';
import Card from './Card';
import Button from '../ui/Button';
import client from '../../api/client';
import { useToastStore } from '../../stores/toastStore';

/**
 * 一键迁移：导出全部数据（设置/账号/学生/台账/谈心/日程/通知/灵感/周期提醒）为单个 JSON，
 * 部署到新服务器（VPS）后上传导入即可完整恢复。仅管理员。
 */
export default function MigrationCard() {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const toast = useToastStore();

  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await client.get('/migrate/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = url;
      const now = new Date();
      const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
      a.download = `数据迁移备份-${ts}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('迁移备份已下载');
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      toast.error(status === 403 ? '仅管理员可导出' : '导出失败，请重试');
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!/\.json$/i.test(file.name)) {
      toast.error('请选择 .json 迁移文件');
      if (fileRef.current) fileRef.current.value = '';
      return;
    }

    const confirmed = window.confirm(
      '导入迁移备份将覆盖当前全部数据（账号、学生、台账、谈心、日程、通知等），此操作不可撤销！\n\n' +
      '系统会在导入前自动保存一份当前数据快照到服务器，但建议你先手动下载一份备份。\n\n' +
      '注意：迁移文件包含 API 密钥等敏感凭据，请妥善保管。\n\n' +
      '确定要继续吗？'
    );
    if (!confirmed) {
      if (fileRef.current) fileRef.current.value = '';
      return;
    }

    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await client.post('/migrate/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const c = (data?.counts || {}) as Record<string, number>;
      const parts = [
        c.users ? `账号 ${c.users}` : null,
        c.students ? `学生 ${c.students}` : null,
        c.mentalRecords ? `台账记录 ${c.mentalRecords}` : null,
        c.counselings ? `谈心 ${c.counselings}` : null,
        c.tasks ? `日程 ${c.tasks}` : null,
        c.notices ? `通知 ${c.notices}` : null,
      ].filter(Boolean);
      toast.success(`导入成功！${parts.join('，')}${data?.hint ? `；${data.hint}` : ''}`);
      if (fileRef.current) fileRef.current.value = '';
    } catch (err) {
      const e = err as { response?: { status?: number; data?: { message?: string } } };
      toast.error(e?.response?.data?.message || e?.response?.status === 403 ? '仅管理员可导入' : '导入失败，请检查迁移文件格式');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Card title="一键迁移" subtitle="导出全部数据（含设置、账号、学生、台账、谈心、日程等），VPS 部署后可一键导入恢复（仅管理员）" icon={<PackageOpen className="h-5 w-5 text-brand-500" />}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">导出迁移备份</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">单个 JSON 文件，包含全部业务数据与系统设置</p>
          </div>
          <Button onClick={handleExport} disabled={exporting}>
            <Download className="h-4 w-4" />
            {exporting ? '导出中...' : '一键导出'}
          </Button>
        </div>

        <div className="border-t border-slate-200 dark:border-slate-800" />

        <div>
          <p className="mb-1 text-sm font-medium text-slate-800 dark:text-slate-200">导入迁移备份</p>
          <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
            上传之前导出的 .json 迁移文件，整体覆盖当前数据。导入前服务器会自动保存当前数据快照。
          </p>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
            <Upload className="h-4 w-4" />
            {importing ? '导入中...' : '选择迁移文件'}
            <input ref={fileRef} type="file" accept=".json" onChange={handleImport} className="hidden" disabled={importing} />
          </label>
        </div>
      </div>
    </Card>
  );
}
