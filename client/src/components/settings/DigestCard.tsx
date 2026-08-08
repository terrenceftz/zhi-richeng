import Card from './Card';
import Button from '../ui/Button';
import Switch from '../ui/Switch';
import { useToastStore } from '../../stores/toastStore';

interface Props {
  enabled: boolean;
  hour: number;
  ai: boolean;
  onToggle: (enabled: boolean) => void;
  onSaveHour: (hour: number) => void;
  onToggleAi: (ai: boolean) => void;
}

export default function DigestCard({ enabled, hour, ai, onToggle, onSaveHour, onToggleAi }: Props) {
  const toast = useToastStore();

  return (
    <Card title="每日简报" subtitle="每天定时通过飞书发送今日任务简报">
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-800/50">
          <div>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">启用简报</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">开启后每天推送一次；到点后当天未推送会自动补发（一天一次）</p>
          </div>
          <Switch checked={enabled} onChange={(v) => { onToggle(v); toast.success(v ? '已开启简报' : '已关闭简报'); }} label="启用简报" />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-400">推送时间（小时）</label>
          <div className="flex items-center gap-2">
            <input
              type="number" min={0} max={23} value={hour}
              onChange={(e) => onSaveHour(Math.max(0, Math.min(23, parseInt(e.target.value) || 8)))}
              className="w-24 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              disabled={!enabled}
            />
            <Button size="sm" variant="secondary" onClick={() => { onSaveHour(hour); toast.success('已保存'); }} disabled={!enabled}>保存</Button>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">0-23 点，默认 8 点</p>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-800/50">
          <div>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">AI 智能简报</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">用大模型生成更自然的简报；未配置 DeepSeek 时自动使用简单版</p>
          </div>
          <Switch checked={ai} onChange={(v) => { onToggleAi(v); toast.success(v ? '已开启 AI 简报' : '已关闭 AI 简报'); }} label="AI 简报" disabled={!enabled} />
        </div>
      </div>
    </Card>
  );
}
