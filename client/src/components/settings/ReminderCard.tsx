import Card from './Card';
import Button from '../ui/Button';

interface Props {
  enabled: boolean;
  minutes: number;
  onToggle: (enabled: boolean) => void;
  onSaveMinutes: (minutes: number) => void;
}

export default function ReminderCard({ enabled, minutes, onToggle, onSaveMinutes }: Props) {
  return (
    <Card>
      <h3 className="text-lg font-black mb-1">日程提醒</h3>
      <p className="font-bold text-sm opacity-50 mb-4">通过飞书机器人提前发送日程提醒</p>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold">启用提醒</p>
            <p className="text-xs font-bold opacity-50">开启后会在日程开始前发送飞书消息</p>
          </div>
          <button
            onClick={() => onToggle(!enabled)}
            className={`w-12 h-6 rounded-full border-2 border-black transition-colors relative ${enabled ? 'bg-black' : 'bg-gray-200'}`}
          >
            <div className={`w-4 h-4 bg-white rounded-full border border-black absolute top-0.5 transition-all ${enabled ? 'left-6' : 'left-0.5'}`} />
          </button>
        </div>

        <div>
          <label className="block text-sm font-bold opacity-50 mb-1">提前时间（分钟）</label>
          <div className="flex items-center gap-2">
            <input
              type="number" min={1} max={120} value={minutes}
              onChange={(e) => onSaveMinutes(Math.max(1, Math.min(120, parseInt(e.target.value) || 15)))}
              className="w-24 bg-white border-2 border-black rounded-xl px-3 py-2 font-bold text-sm focus:outline-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              disabled={!enabled}
            />
            <Button size="sm" onClick={() => onSaveMinutes(minutes)} disabled={!enabled}>保存</Button>
          </div>
          <p className="text-xs font-bold opacity-50 mt-1">1-120 分钟，默认 15 分钟</p>
        </div>
      </div>
    </Card>
  );
}
