import { useState } from 'react';
import Card from './Card';

interface Props {
  webhookUrl: string;
  imToken: string;
}

export default function IMWebhookCard({ webhookUrl, imToken }: Props) {
  const [copyLabel, setCopyLabel] = useState('复制');

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopyLabel(label);
    setTimeout(() => setCopyLabel('复制'), 2000);
  };

  return (
    <Card>
      <h3 className="text-lg font-black mb-1">IM 互联</h3>
      <p className="font-bold text-sm opacity-50 mb-4">通过 Webhook 在聊天消息中直接添加待办事项</p>

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-bold opacity-50 mb-1">Webhook URL</label>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-gray-50 border border-black rounded-lg px-3 py-2 text-xs font-bold break-all">{webhookUrl}</code>
            <button
              onClick={() => copy(webhookUrl, '已复制')}
              className="text-xs font-bold bg-white border-2 border-black rounded-lg px-3 py-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all flex-shrink-0"
            >{copyLabel === '已复制' ? '已复制' : '复制'}</button>
          </div>
        </div>
        <div>
          <label className="block text-sm font-bold opacity-50 mb-1">Token</label>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-gray-50 border border-black rounded-lg px-3 py-2 text-xs font-bold break-all">{imToken}</code>
            <button
              onClick={() => copy(imToken, '复制 Token')}
              className="text-xs font-bold bg-white border-2 border-black rounded-lg px-3 py-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all flex-shrink-0"
            >复制 Token</button>
          </div>
        </div>
        <div>
          <label className="block text-sm font-bold opacity-50 mb-1">请求格式</label>
          <code className="block bg-gray-50 border border-black rounded-lg px-3 py-2 text-xs font-bold break-all">
            {`POST /api/im/task\nContent-Type: application/json\n\n{ "text": "明天下午3点开会", "token": "${imToken}" }`}
          </code>
        </div>
      </div>
    </Card>
  );
}
