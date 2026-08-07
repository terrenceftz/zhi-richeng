import Card from './Card';
import Button from '../ui/Button';
import Switch from '../ui/Switch';
import { useToastStore } from '../../stores/toastStore';

interface Props {
  enabled: boolean;
  minutes: number;
  onToggle: (enabled: boolean) => void;
  onSaveMinutes: (minutes: number) => void;
}

export default function ReminderCard({ enabled, minutes, onToggle, onSaveMinutes }: Props) {
  const toast = useToastStore();

  return (
    <Card title="日程提醒" subtitle="通过飞书机器人提前发送日程提醒">
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-800/50">
          <div>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">启用提醒</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">开启后会在日程开始前发送飞书消息</p>
          </div>
          <Switch checked={enabled} onChange={(v) => { onToggle(v); toast.success(v ? '已开启提醒' : '已关闭提醒'); }} label="启用提醒" />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-400">提前时间（分钟）</label>
          <div className="flex items-center gap-2">
            <input
              type="number" min={1} max={120} value={minutes}
              onChange={(e) => onSaveMinutes(Math.max(1, Math.min(120, parseInt(e.target.value) || 15)))}
              className="w-24 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              disabled={!enabled}
            />
            <Button size="sm" variant="secondary" onClick={() => { onSaveMinutes(minutes); toast.success('已保存'); }} disabled={!enabled}>保存</Button>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">1-120 分钟，默认 15 分钟</p>
        </div>
      </div>
    </Card>
  );
}
