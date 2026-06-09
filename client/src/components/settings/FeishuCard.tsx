import { useState } from 'react';
import Card from './Card';
import Button from '../ui/Button';
import Input from '../ui/Input';

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
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'success' | 'error'>('success');

  const showMsg = (text: string, s: 'success' | 'error') => {
    setMessage(text); setStatus(s); setTimeout(() => setMessage(''), 3000);
  };

  const handleSaveCreds = async () => {
    setSaving(true);
    try {
      await onSave(appId, appSecret);
      showMsg('飞书凭证已保存', 'success');
    } catch {
      showMsg('保存失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleBind = async () => {
    try {
      await onBindOpenId(openId);
      showMsg('飞书账号已绑定', 'success');
    } catch {
      showMsg('绑定失败', 'error');
    }
  };

  return (
    <Card>
      <h3 className="text-lg font-black mb-1">飞书互联</h3>
      <p className="font-bold text-sm opacity-50 mb-4">在飞书中 @机器人 发送消息即可添加待办</p>

      <div className="space-y-4">
        <Input label="App ID" value={appId} onChange={(e) => setAppId(e.target.value)} placeholder="cli_xxxxxxxxxxxx" />
        <Input label="App Secret" type="password" value={appSecret} onChange={(e) => setAppSecret(e.target.value)} placeholder={appSecret ? '已设置（留空不修改）' : 'xxxxxxxx'} />
        <div className="flex items-center gap-3">
          <Button onClick={handleSaveCreds} disabled={saving}>
            {saving ? '保存中...' : '保存凭证'}
          </Button>
          {message && (
            <span className={`text-sm font-bold ${status === 'success' ? 'text-green-600' : 'text-red-500'}`}>{message}</span>
          )}
        </div>
        <p className="text-xs font-bold opacity-50">
          前往 <a href="https://open.feishu.cn" className="text-black underline hover:opacity-70" target="_blank">飞书开放平台</a> 创建企业自建应用，开通「机器人」+「消息事件」权限
        </p>
      </div>

      {feishuConfigured && (
        <div className="mt-4 pt-4 border-t-2 border-black space-y-3">
          <div>
            <label className="block text-sm font-bold opacity-50 mb-1">连接模式</label>
            <p className="text-xs font-bold opacity-50">WebSocket 长连接（无需公网 URL），服务器启动后自动连接飞书</p>
          </div>
          <div>
            <label className="block text-sm font-bold opacity-50 mb-1">绑定你的飞书账号</label>
            <div className="flex items-center gap-2">
              <input value={openId} onChange={(e) => setOpenId(e.target.value)} placeholder="ou_xxxxxxxxxxxxx"
                className="flex-1 bg-white border-2 border-black rounded-xl px-4 py-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:outline-none font-bold placeholder-gray-400 text-sm" />
              <Button size="sm" onClick={handleBind}>绑定</Button>
            </div>
            <p className="text-xs font-bold opacity-50 mt-1">
              给飞书机器人发消息，回调日志中可获取你的 OpenID。{openId && <span className="text-green-600">已绑定</span>}
            </p>
          </div>
        </div>
      )}

      <div className="mt-4 pt-4 border-t-2 border-black space-y-2">
        <StatusRow label="凭证：" ok={feishuConfigured} />
        <StatusRow label="连接：" ok={feishuConnected} pending={feishuConfigured ? '服务器重启后自动连接' : '配置后自动连接'} />
        <p className="text-xs font-bold opacity-50">飞书 @机器人 发送 "明天下午3点开会" 自动解析并添加到日程</p>
      </div>
    </Card>
  );
}

function StatusRow({ label, ok, pending }: { label: string; ok: boolean; pending?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="font-bold opacity-50">{label}</span>
      {ok ? (
        <span className="text-green-600 flex items-center gap-1 font-bold">
          <span className="w-2 h-2 rounded-full bg-green-600 border border-black" />已{label.includes('凭证') ? '配置' : '连接'}
        </span>
      ) : (
        <span className="flex items-center gap-1 font-bold opacity-50">
          <span className="w-2 h-2 rounded-full bg-gray-300 border border-black" />{pending || '未配置'}
        </span>
      )}
    </div>
  );
}
