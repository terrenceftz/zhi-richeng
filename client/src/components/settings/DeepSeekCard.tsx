import { useState } from 'react';
import type { FormEvent } from 'react';
import Card from './Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { useToastStore } from '../../stores/toastStore';

interface Props {
  hasKey: boolean;
  envConfigured: boolean;
  onSave: (apiKey: string) => Promise<void>;
}

export default function DeepSeekCard({ hasKey, envConfigured, onSave }: Props) {
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useToastStore();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(apiKey.trim());
      toast.success('设置已保存');
      setApiKey('');
    } catch {
      toast.error('保存失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="DeepSeek API" subtitle="配置 API Key 以启用 AI 智能解析任务和文档提取功能">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="API Key"
          id="deepseekKey"
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={hasKey ? '已配置（输入新值覆盖，留空不修改）' : 'sk-...'}
          hint={hasKey ? '当前已配置 API Key' : undefined}
        />
        <Button type="submit" disabled={loading || !apiKey.trim()}>
          {loading ? '保存中...' : '保存'}
        </Button>
      </form>

      <div className="mt-4 space-y-2 border-t border-slate-200 pt-4 dark:border-slate-800">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-500 dark:text-slate-400">状态：</span>
          {hasKey ? (
            <span className="flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> 已配置
            </span>
          ) : (
            <span className="flex items-center gap-1 font-medium text-slate-500 dark:text-slate-400">
              <span className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-600" /> 未配置
            </span>
          )}
        </div>
        {envConfigured && (
          <p className="text-xs text-slate-500 dark:text-slate-400">环境变量中已配置 DEEPSEEK_API_KEY，将优先使用</p>
        )}
      </div>
    </Card>
  );
}
