import { useState, useEffect, FormEvent } from 'react';
import { Settings } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import client from '../api/client';
import UsersCard from '../components/settings/UsersCard';

export default function SettingsPage() {
  const { user } = useAuthStore();
  const [apiKey, setApiKey] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const [envConfigured, setEnvConfigured] = useState(false);
  const [imToken, setImToken] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [feishuOpenId, setFeishuOpenId] = useState('');
  const [feishuAppId, setFeishuAppId] = useState('');
  const [feishuAppSecret, setFeishuAppSecret] = useState('');
  const [feishuConfigured, setFeishuConfigured] = useState(false);
  const [feishuConnected, setFeishuConnected] = useState(false);
  const [feishuSaving, setFeishuSaving] = useState(false);
  const [reminderMinutes, setReminderMinutes] = useState(15);
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [profileName, setProfileName] = useState('');
  const [profilePassword, setProfilePassword] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [copyLabel, setCopyLabel] = useState('复制');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data } = await client.get('/settings');
      setApiKey(data.deepseekApiKey || '');
      setHasKey(data.hasDeepSeekKey);
      setEnvConfigured(data.envConfigured);
      setImToken(data.imToken || '');
      setWebhookUrl(data.webhookUrl || '');
      setFeishuOpenId(data.feishuOpenId || '');
      setFeishuAppId(data.feishuAppId || '');
      setFeishuAppSecret(data.feishuAppSecret || '');
      setFeishuConfigured(data.feishuConfigured || false);
      setFeishuConnected(data.feishuConnected || false);
      setReminderMinutes(data.reminderMinutes || 15);
      setReminderEnabled(data.reminderEnabled !== false);
      setProfileName(user?.name || '');
    } catch {}
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');
    try {
      await client.put('/settings', { deepseekApiKey: apiKey });
      setHasKey(true);
      setStatus('success');
      setMessage('设置已保存成功');
    } catch {
      setStatus('error');
      setMessage('保存失败');
    } finally {
      setIsLoading(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-black mb-6 flex items-center gap-2">
        <Settings className="w-6 h-6" />
        设置
      </h2>

      <div className="max-w-lg space-y-6">
        {/* DeepSeek API Key */}
        <div className="bg-white border-2 border-black rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
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
              <Button type="submit" disabled={isLoading}>
                {isLoading ? '保存中...' : '保存'}
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
        </div>

        {/* IM Webhook */}
        <div className="bg-white border-2 border-black rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <h3 className="text-lg font-black mb-1">IM 互联</h3>
          <p className="font-bold text-sm opacity-50 mb-4">通过 Webhook 在聊天消息中直接添加待办事项</p>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-bold opacity-50 mb-1">Webhook URL</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-gray-50 border border-black rounded-lg px-3 py-2 text-xs font-bold break-all">{webhookUrl}</code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(webhookUrl);
                    setCopyLabel('已复制');
                    setTimeout(() => setCopyLabel('复制'), 2000);
                  }}
                  className="text-xs font-bold bg-white border-2 border-black rounded-lg px-3 py-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all flex-shrink-0"
                >{copyLabel === '已复制' ? '已复制' : '复制'}</button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold opacity-50 mb-1">Token</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-gray-50 border border-black rounded-lg px-3 py-2 text-xs font-bold break-all">{imToken}</code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(imToken);
                    setCopyLabel('已复制');
                    setTimeout(() => setCopyLabel('复制'), 2000);
                  }}
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
        </div>

        {/* Feishu Integration */}
        <div className="bg-white border-2 border-black rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <h3 className="text-lg font-black mb-1">飞书互联</h3>
          <p className="font-bold text-sm opacity-50 mb-4">在飞书中 @机器人 发送消息即可添加待办</p>

          <div className="space-y-4">
            <Input
              label="App ID"
              value={feishuAppId}
              onChange={(e) => setFeishuAppId(e.target.value)}
              placeholder="cli_xxxxxxxxxxxx"
            />
            <Input
              label="App Secret"
              type="password"
              value={feishuAppSecret}
              onChange={(e) => setFeishuAppSecret(e.target.value)}
              placeholder={feishuAppSecret ? '已设置（留空不修改）' : 'xxxxxxxx'}
            />
            <div className="flex items-center gap-3">
              <Button
                onClick={async () => {
                  setFeishuSaving(true);
                  try {
                    await client.put('/settings', { feishuAppId, feishuAppSecret });
                    setFeishuConfigured(true);
                    setStatus('success');
                    setMessage('飞书凭证已保存');
                    setTimeout(() => setMessage(''), 3000);
                  } catch {
                    setMessage('保存失败');
                  } finally {
                    setFeishuSaving(false);
                  }
                }}
                disabled={feishuSaving}
              >
                {feishuSaving ? '保存中...' : '保存凭证'}
              </Button>
              {message && (
                <span className={`text-sm font-bold ${status === 'success' ? 'text-green-600' : 'text-red-500'}`}>
                  {message}
                </span>
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
                  <input
                    value={feishuOpenId}
                    onChange={(e) => setFeishuOpenId(e.target.value)}
                    placeholder="ou_xxxxxxxxxxxxx"
                    className="flex-1 bg-white border-2 border-black rounded-xl px-4 py-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:outline-none font-bold placeholder-gray-400 text-sm"
                  />
                  <Button
                    size="sm"
                    onClick={async () => {
                      try {
                        await client.put('/settings', { feishuOpenId });
                        setStatus('success');
                        setMessage('飞书账号已绑定');
                        setTimeout(() => setMessage(''), 3000);
                      } catch {
                        setMessage('绑定失败');
                      }
                    }}
                  >
                    绑定
                  </Button>
                </div>
                <p className="text-xs font-bold opacity-50 mt-1">
                  给飞书机器人发消息，回调日志中可获取你的 OpenID。{feishuOpenId && <span className="text-green-600">已绑定</span>}
                </p>
              </div>
            </div>
          )}

          <div className="mt-4 pt-4 border-t-2 border-black space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-bold opacity-50">凭证：</span>
              {feishuConfigured ? (
                <span className="text-green-600 flex items-center gap-1 font-bold">
                  <span className="w-2 h-2 rounded-full bg-green-600 border border-black" />已配置
                </span>
              ) : (
                <span className="text-red-500 flex items-center gap-1 font-bold">
                  <span className="w-2 h-2 rounded-full bg-red-500 border border-black" />未配置
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="font-bold opacity-50">连接：</span>
              {feishuConnected ? (
                <span className="text-green-600 flex items-center gap-1 font-bold">
                  <span className="w-2 h-2 rounded-full bg-green-600 border border-black" />已连接
                </span>
              ) : (
                <span className="flex items-center gap-1 font-bold opacity-50">
                  <span className="w-2 h-2 rounded-full bg-gray-300 border border-black" />{feishuConfigured ? '服务器重启后自动连接' : '配置后自动连接'}
                </span>
              )}
            </div>
            <p className="text-xs font-bold opacity-50">
              飞书 @机器人 发送 "明天下午3点开会" 自动解析并添加到日程
            </p>
          </div>
        </div>

        {/* Reminder Settings */}
        <div className="bg-white border-2 border-black rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <h3 className="text-lg font-black mb-1">日程提醒</h3>
          <p className="font-bold text-sm opacity-50 mb-4">通过飞书机器人提前发送日程提醒</p>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold">启用提醒</p>
                <p className="text-xs font-bold opacity-50">开启后会在日程开始前发送飞书消息</p>
              </div>
              <button
                onClick={async () => {
                  const next = !reminderEnabled;
                  setReminderEnabled(next);
                  await client.put('/settings', { reminderEnabled: next });
                }}
                className={`w-12 h-6 rounded-full border-2 border-black transition-colors relative ${reminderEnabled ? 'bg-black' : 'bg-gray-200'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full border border-black absolute top-0.5 transition-all ${reminderEnabled ? 'left-6' : 'left-0.5'}`} />
              </button>
            </div>

            <div>
              <label className="block text-sm font-bold opacity-50 mb-1">提前时间（分钟）</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={reminderMinutes}
                  onChange={(e) => {
                    const v = Math.max(1, Math.min(120, parseInt(e.target.value) || 15));
                    setReminderMinutes(v);
                  }}
                  className="w-24 bg-white border-2 border-black rounded-xl px-3 py-2 font-bold text-sm focus:outline-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                  disabled={!reminderEnabled}
                />
                <Button
                  size="sm"
                  onClick={async () => {
                    await client.put('/settings', { reminderMinutes });
                    setStatus('success');
                    setMessage('已保存');
                    setTimeout(() => setMessage(''), 2000);
                  }}
                  disabled={!reminderEnabled}
                >
                  保存
                </Button>
              </div>
              <p className="text-xs font-bold opacity-50 mt-1">1-120 分钟，默认 15 分钟</p>
            </div>
          </div>
        </div>

        {/* Account Info */}
        <div className="bg-white border-2 border-black rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <h3 className="text-lg font-black mb-4">账号信息</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold opacity-50 mb-1">邮箱</label>
              <p className="text-sm font-bold py-1">{user?.email}</p>
            </div>
            <Input
              label="昵称"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              placeholder="你的名字"
            />
            <Input
              label="新密码"
              type="password"
              value={profilePassword}
              onChange={(e) => setProfilePassword(e.target.value)}
              placeholder="留空不修改"
            />
            <div className="flex items-center gap-3">
              <Button
                onClick={async () => {
                  setProfileSaving(true);
                  try {
                    const body: any = {};
                    if (profileName) body.name = profileName;
                    if (profilePassword) body.password = profilePassword;
                    await client.put('/users/me', body);
                    setStatus('success');
                    setMessage('个人信息已更新');
                    setProfilePassword('');
                    setTimeout(() => setMessage(''), 3000);
                  } catch {
                    setMessage('更新失败');
                  } finally {
                    setProfileSaving(false);
                  }
                }}
                disabled={profileSaving}
              >
                {profileSaving ? '保存中...' : '更新信息'}
              </Button>
              {message && (
                <span className={`text-sm font-bold ${status === 'success' ? 'text-green-600' : 'text-red-500'}`}>
                  {message}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* User Management */}
        <UsersCard />

        {/* About */}
        <div className="bg-white border-2 border-black rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <h3 className="text-lg font-black mb-1">关于</h3>
          <p className="font-bold text-sm opacity-50">智日程 Phase 1 -- AI 驱动的智能日程管理</p>
          <div className="mt-3 text-xs font-bold opacity-50 space-y-1">
            <p>React 18 + Vite + TailwindCSS</p>
            <p>Express + Prisma + SQLite</p>
            <p>DeepSeek API 提供 AI 解析能力</p>
          </div>
        </div>
      </div>
    </div>
  );
}
