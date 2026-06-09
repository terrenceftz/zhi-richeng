import { useState, useEffect } from 'react';
import { Settings } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import client from '../api/client';
import DeepSeekCard from '../components/settings/DeepSeekCard';
import IMWebhookCard from '../components/settings/IMWebhookCard';
import FeishuCard from '../components/settings/FeishuCard';
import SemesterCard from '../components/settings/SemesterCard';
import ReminderCard from '../components/settings/ReminderCard';
import AccountCard from '../components/settings/AccountCard';
import BackupCard from '../components/settings/BackupCard';
import AboutCard from '../components/settings/AboutCard';
import UsersCard from '../components/settings/UsersCard';

interface SettingsData {
  deepseekApiKey: string;
  hasDeepSeekKey: boolean;
  envConfigured: boolean;
  imToken: string;
  webhookUrl: string;
  feishuOpenId: string;
  feishuAppId: string;
  feishuAppSecret: string;
  feishuConfigured: boolean;
  feishuConnected: boolean;
  reminderMinutes: number;
  reminderEnabled: boolean;
  semesterName: string;
  semesterStart: string;
  semesterEnd: string;
}

export default function SettingsPage() {
  const { user } = useAuthStore();
  const [data, setData] = useState<SettingsData>({
    deepseekApiKey: '', hasDeepSeekKey: false, envConfigured: false,
    imToken: '', webhookUrl: '',
    feishuOpenId: '', feishuAppId: '', feishuAppSecret: '',
    feishuConfigured: false, feishuConnected: false,
    reminderMinutes: 15, reminderEnabled: true,
    semesterName: '', semesterStart: '', semesterEnd: '',
  });
  const [profileName, setProfileName] = useState('');
  const [message, setMessage] = useState('');
  const [msgStatus, setMsgStatus] = useState<'success' | 'error'>('success');

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    try {
      const { data: d } = await client.get('/settings');
      setData({
        deepseekApiKey: d.deepseekApiKey || '',
        hasDeepSeekKey: d.hasDeepSeekKey, envConfigured: d.envConfigured,
        imToken: d.imToken || '', webhookUrl: d.webhookUrl || '',
        feishuOpenId: d.feishuOpenId || '', feishuAppId: d.feishuAppId || '',
        feishuAppSecret: d.feishuAppSecret || '',
        feishuConfigured: d.feishuConfigured || false, feishuConnected: d.feishuConnected || false,
        reminderMinutes: d.reminderMinutes || 15, reminderEnabled: d.reminderEnabled !== false,
        semesterName: d.semesterName || '', semesterStart: d.semesterStart || '',
        semesterEnd: d.semesterEnd || '',
      });
      setProfileName(user?.name || '');
    } catch {}
  };

  const showMsg = (text: string, s: 'success' | 'error') => {
    setMessage(text); setMsgStatus(s);
    setTimeout(() => setMessage(''), 3000);
  };

  const put = async (body: Record<string, any>) => {
    await client.put('/settings', body);
    showMsg('已保存', 'success');
  };

  const set = (k: keyof SettingsData, v: any) => setData((d) => ({ ...d, [k]: v }));

  return (
    <div>
      <h2 className="text-2xl font-black mb-6 flex items-center gap-2">
        <Settings className="w-6 h-6" />
        设置
      </h2>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 max-w-[1100px]">
        {/* LEFT COLUMN */}
        <div className="space-y-6">
          <DeepSeekCard
            apiKey={data.deepseekApiKey}
            hasKey={data.hasDeepSeekKey}
            envConfigured={data.envConfigured}
            onSave={async (key) => { await put({ deepseekApiKey: key }); set('hasDeepSeekKey', true); }}
          />
          <IMWebhookCard webhookUrl={data.webhookUrl} imToken={data.imToken} />
          <FeishuCard
            feishuAppId={data.feishuAppId} feishuAppSecret={data.feishuAppSecret}
            feishuConfigured={data.feishuConfigured} feishuConnected={data.feishuConnected}
            feishuOpenId={data.feishuOpenId}
            onSave={async (appId, secret) => {
              await put({ feishuAppId: appId, feishuAppSecret: secret });
              set('feishuConfigured', true);
            }}
            onBindOpenId={async (openId) => { await put({ feishuOpenId: openId }); set('feishuOpenId', openId); }}
          />
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-6">
          <SemesterCard
            name={data.semesterName} start={data.semesterStart} end={data.semesterEnd}
            onSave={async (name, start, end) => { await put({ semesterName: name, semesterStart: start, semesterEnd: end }); }}
          />
          <ReminderCard
            enabled={data.reminderEnabled} minutes={data.reminderMinutes}
            onToggle={async (enabled) => { set('reminderEnabled', enabled); await put({ reminderEnabled: enabled }); }}
            onSaveMinutes={async (m) => { set('reminderMinutes', m); await put({ reminderMinutes: m }); }}
          />
          <AccountCard
            email={user?.email || ''} name={profileName}
            onSave={async (name, password) => {
              const body: any = {};
              if (name) body.name = name;
              if (password) body.password = password;
              await client.put('/users/me', body);
              showMsg('个人信息已更新', 'success');
            }}
          />
        </div>
      </div>

      {/* Full-width cards */}
      <div className="max-w-[1100px] mt-6 space-y-6">
        {message && (
          <div className={`p-3 rounded-xl border-2 border-black text-sm font-bold ${
            msgStatus === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
          }`}>
            {msgStatus === 'success' ? '✅ ' : '❌ '}{message}
          </div>
        )}
        <UsersCard />
        <BackupCard />
        <AboutCard />
      </div>
    </div>
  );
}
