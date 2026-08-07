import Card from './Card';
import Button from '../ui/Button';
import { useToastStore } from '../../stores/toastStore';

interface Props {
  webhookUrl: string;
  imToken: string;
}

export default function IMWebhookCard({ webhookUrl, imToken }: Props) {
  const toast = useToastStore();

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} 已复制`);
    } catch {
      toast.error('复制失败');
    }
  };

  return (
    <Card title="IM 互联" subtitle="通过 Webhook 在聊天消息中直接添加待办事项">
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-400">Webhook URL</label>
          <div className="flex items-center gap-2">
            <code className="flex-1 break-all rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">{webhookUrl}</code>
            <Button size="sm" variant="secondary" onClick={() => copy(webhookUrl, 'Webhook URL')}>复制</Button>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-400">Token</label>
          <div className="flex items-center gap-2">
            <code className="flex-1 break-all rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">{imToken}</code>
            <Button size="sm" variant="secondary" onClick={() => copy(imToken, 'Token')}>复制</Button>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-400">请求格式</label>
          <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">{`POST /api/im/task
Content-Type: application/json

{ "text": "明天下午3点开会", "token": "${imToken}" }`}</pre>
        </div>
      </div>
    </Card>
  );
}
