import { useState } from 'react';
import type { FormEvent } from 'react';
import Card from './Card';
import Button from '../ui/Button';
import Input from '../ui/Input';

interface Props {
  apiKey: string;
  hasKey: boolean;
  envConfigured: boolean;
  onSave: (apiKey: string) => Promise<void>;
}

export default function DeepSeekCard({ apiKey: initialKey, hasKey, envConfigured, onSave }: Props) {
  const [apiKey, setApiKey] = useState(initialKey);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      await onSave(apiKey);
      setStatus('success');
      setMessage('设置已保存成功');
    } catch {
      setStatus('error');
      setMessage('保存失败');
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  return (
    <Card>
      <h3 className="text-lg font-black mb-1">DeepSeek API</h3>
      <p className="font-bold text-sm opacity-50 mb-4">配置 API Key 以启用 AI 智能解析任务和文档提取功能</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="API Key"
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="sk-..."
        />
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={loading}>
            {loading ? '保存中...' : '保存'}
          </Button>
          {message && (
            <span className={`text-sm font-bold ${status === 'success' ? 'text-green-600' : 'text-red-500'}`}>
              {message}
            </span>
          )}
        </div>
      </form>

      <div className="mt-4 pt-4 border-t-2 border-black space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-bold opacity-50">状态：</span>
          {hasKey ? (
            <span className="text-green-600 flex items-center gap-1 font-bold">
              <span className="w-2 h-2 rounded-full bg-green-600 border border-black" />
              已配置
            </span>
          ) : (
            <span className="text-red-500 flex items-center gap-1 font-bold">
              <span className="w-2 h-2 rounded-full bg-red-500 border border-black" />
              未配置
            </span>
          )}
        </div>
        {envConfigured && (
          <p className="text-xs font-bold opacity-50">环境变量中已配置 DEEPSEEK_API_KEY，将优先使用</p>
        )}
      </div>
    </Card>
  );
}
