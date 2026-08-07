import { useState } from 'react';
import Card from './Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { useToastStore } from '../../stores/toastStore';

interface Props {
  feishuAppId: string;
  feishuAppSecret: string;
  feishuConfigured: boolean;
  feishuConnected: boolean;
  feishuOpenId: string;
  onSave: (appId: string, appSecret: string) => Promise<void>;
  onBindOpenId: (openId: string) => Promise<void>;
}

export default function FeishuCard({
  feishuAppId: initialAppId, feishuAppSecret: initialSecret,
  feishuConfigured, feishuConnected, feishuOpenId: initialOpenId,
  onSave, onBindOpenId,
}: Props) {
  const [appId, setAppId] = useState(initialAppId);
  const [appSecret, setAppSecret] = useState(initialSecret);
  const [openId, setOpenId] = useState(initialOpenId);
  const [saving, setSaving] = useState(false);
  const toast = useToastStore();

  const handleSaveCreds = async () => {
    setSaving(true);
    try {
      await onSave(appId, appSecret);
      toast.success('飞书凭证已保存');
    } catch {
      toast.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleBind = async () => {
    try {
      await onBindOpenId(openId);
      toast.success('飞书账号已绑定');
    } catch {
      toast.error('绑定失败');
    }
  };

  return (
    <Card title="飞书互联" subtitle="在飞书中 @机器人 发送消息即可添加待办">
      <div className="space-y-4">
        <Input label="App ID" id="feishuAppId" value={appId} onChange={(e) => setAppId(e.target.value)} placeholder="cli_xxxxxxxxxxxx" />
        <Input
          label="App Secret"
          id="feishuAppSecret"
          type="password"
          value={appSecret}
          onChange={(e) => setAppSecret(e.target.value)}
          placeholder={feishuConfigured ? '已设置（留空不修改）' : 'xxxxxxxx'}
        />
        <Button onClick={handleSaveCreds} disabled={saving}>{saving ? '保存中...' : '保存凭证'}</Button>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          前往{' '}
          <a href="https://open.feishu.cn" target="_blank" rel="noreferrer" className="font-medium text-brand-600 hover:underline dark:text-brand-400">
            飞书开放平台
          </a>{' '}
          创建企业自建应用，开通「机器人」+「消息事件」权限
        </p>
      </div>

      {feishuConfigured && (
        <div className="mt-4 space-y-3 border-t border-slate-200 pt-4 dark:border-slate-800">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-400">连接模式</label>
            <p className="text-xs text-slate-500 dark:text-slate-400">WebSocket 长连接（无需公网 URL），服务器启动后自动连接飞书</p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-400">绑定你的飞书账号</label>
            <div className="flex items-center gap-2">
              <input
                value={openId}
                onChange={(e) => setOpenId(e.target.value)}
                placeholder="ou_xxxxxxxxxxxxx"
                className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
              <Button size="sm" onClick={handleBind}>绑定</Button>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              给飞书机器人发消息，回调日志中可获取你的 OpenID。{openId && <span className="text-emerald-600 dark:text-emerald-400">已绑定</span>}
            </p>
          </div>
        </div>
      )}

      <div className="mt-4 space-y-2 border-t border-slate-200 pt-4 dark:border-slate-800">
        <StatusRow label="凭证" ok={feishuConfigured} />
        <StatusRow label="连接" ok={feishuConnected} pending={feishuConfigured ? '服务器重启后自动连接' : '配置后自动连接'} />
      </div>
    </Card>
  );
}

function StatusRow({ label, ok, pending }: { label: string; ok: boolean; pending?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-slate-500 dark:text-slate-400">{label}：</span>
      {ok ? (
        <span className="flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />已{label === '凭证' ? '配置' : '连接'}
        </span>
      ) : (
        <span className="flex items-center gap-1 font-medium text-slate-500 dark:text-slate-400">
          <span className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-600" />{pending || '未配置'}
        </span>
      )}
    </div>
  );
}
