import { useState } from 'react';
import { FileSpreadsheet, Users, Heart, ClipboardList, HeartHandshake, Database, Download, CheckCircle2 } from 'lucide-react';
import client from '../api/client';
import * as mentalApi from '../api/mental';
import * as statsApi from '../api/stats';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { useToastStore } from '../stores/toastStore';

const today = () => new Date().toISOString().slice(0, 10);

/** 通用：带鉴权头下载二进制文件 */
async function downloadBlob(url: string, filename: string): Promise<void> {
  const { data } = await client.get(url, { responseType: 'blob' });
  const blobUrl = window.URL.createObjectURL(new Blob([data]));
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(blobUrl);
}

interface ExportItem {
  key: string;
  title: string;
  desc: string;
  icon: React.ElementType;
  tag: string;
  tagTone: 'brand' | 'green' | 'red' | 'blue' | 'gray' | 'amber';
  run: () => Promise<void>;
}

export default function ExportsPage() {
  const toast = useToastStore();
  const [busy, setBusy] = useState<string | null>(null);

  const items: ExportItem[] = [
    {
      key: 'roster',
      title: '学生花名册',
      desc: '全部学生完整字段（含台账标记），Excel 格式，适合留档与日常统计',
      icon: Users,
      tag: 'XLSX',
      tagTone: 'brand',
      run: async () => {
        await downloadBlob('/students/export/excel', `学生花名册-${today()}.xlsx`);
        toast.success('花名册已导出');
      },
    },
    {
      key: 'counseling',
      title: '谈心记录汇总',
      desc: '全部谈心谈话记录（含学生班级、台账标记），按日期倒序',
      icon: HeartHandshake,
      tag: 'XLSX',
      tagTone: 'blue',
      run: async () => {
        await downloadBlob('/counseling/export/excel', `谈心记录-${today()}.xlsx`);
        toast.success('谈心记录已导出');
      },
    },
    {
      key: 'mental',
      title: '心理台账明细',
      desc: '台账学生档案明细（关注级别、类别、家长信息等）',
      icon: Heart,
      tag: 'XLSX',
      tagTone: 'red',
      run: async () => {
        await mentalApi.exportMentalExcel();
        toast.success('台账明细已导出');
      },
    },
    {
      key: 'report',
      title: '台账月度报送表',
      desc: '华侨大学法学院学生安全稳定工作排查汇总表格式（每月 15 号报送，寒暑假不计）',
      icon: ClipboardList,
      tag: '报送表',
      tagTone: 'amber',
      run: async () => {
        await mentalApi.exportMentalReport();
        toast.success('报送表已导出');
      },
    },
    {
      key: 'snapshot',
      title: '数据快照（JSON）',
      desc: '当前统计看板原始数据快照，用于存档或二次分析',
      icon: Database,
      tag: 'JSON',
      tagTone: 'gray',
      run: async () => {
        const data = await statsApi.fetchStats();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `数据快照-${today()}.json`;
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success('数据快照已导出');
      },
    },
  ];

  const handleRun = async (item: ExportItem) => {
    if (busy) return;
    setBusy(item.key);
    try {
      await item.run();
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || '导出失败';
      toast.error(msg);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <h2 className="mb-1 flex items-center gap-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
        <FileSpreadsheet className="h-6 w-6 text-brand-500" />
        报表导出中心
      </h2>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
        集中导出系统各类报表，一次点击即得
      </p>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => {
          const Icon = item.icon;
          const isBusy = busy === item.key;
          return (
            <Card key={item.key} hoverable className="flex flex-col">
              <div className="mb-3 flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
                  <Icon className="h-5 w-5" />
                </div>
                <Badge tone={item.tagTone}>{item.tag}</Badge>
              </div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{item.title}</h3>
              <p className="mt-1 flex-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{item.desc}</p>
              <Button
                className="mt-4 w-full"
                size="sm"
                variant={isBusy ? 'secondary' : 'primary'}
                disabled={!!busy}
                onClick={() => handleRun(item)}
              >
                {isBusy ? (
                  <><Download className="mr-1.5 h-4 w-4 animate-bounce" /> 导出中...</>
                ) : (
                  <><Download className="mr-1.5 h-4 w-4" /> 导出</>
                )}
              </Button>
            </Card>
          );
        })}

        {/* 提示卡 */}
        <Card className="border-dashed bg-slate-50/60 dark:border-slate-700 dark:bg-slate-800/40">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            说明
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            台账相关导出同时支持在「心理台账」页面内直接操作。<br />
            备份数据库请前往「设置 → 数据备份」。<br />
            导出内容均为当前账号数据，仅本人可见。
          </p>
        </Card>
      </div>
    </div>
  );
}
