import { useState, useEffect } from 'react';
import { Settings, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useToastStore } from '../stores/toastStore';
import client from '../api/client';
import DeepSeekCard from '../components/settings/DeepSeekCard';
import IMWebhookCard from '../components/settings/IMWebhookCard';
import FeishuCard from '../components/settings/FeishuCard';
import SemesterCard from '../components/settings/SemesterCard';
import ReminderCard from '../components/settings/ReminderCard';
import DigestCard from '../components/settings/DigestCard';
import AccountCard from '../components/settings/AccountCard';
import BackupCard from '../components/settings/BackupCard';
import AboutCard from '../components/settings/AboutCard';
import UsersCard from '../components/settings/UsersCard';
import AuditLogCard from '../components/settings/AuditLogCard';
import ThemeCard from '../components/settings/ThemeCard';

interface SettingsData {
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
  digestEnabled: boolean;
  digestHour: number;
  digestAi: boolean;
  semesterName: string;
  semesterStart: string;
  semesterEnd: string;
  mentalReportCollege: string;
}

export default function SettingsPage() {
  const { user } = useAuthStore();
  const toast = useToastStore();
  const [data, setData] = useState<SettingsData>({
    hasDeepSeekKey: false, envConfigured: false,
    imToken: '', webhookUrl: '',
    feishuOpenId: '', feishuAppId: '', feishuAppSecret: '',
    feishuConfigured: false, feishuConnected: false,
    reminderMinutes: 15, reminderEnabled: true,
    digestEnabled: true, digestHour: 8, digestAi: true,
    semesterName: '', semesterStart: '', semesterEnd: '',
    mentalReportCollege: '',
  });
  const [profileName, setProfileName] = useState('');

  const loadSettings = async () => {
    try {
      const { data: d } = await client.get('/settings');
      setData({
        hasDeepSeekKey: d.hasDeepSeekKey, envConfigured: d.envConfigured,
        imToken: d.imToken || '', webhookUrl: d.webhookUrl || '',
        feishuOpenId: d.feishuOpenId || '', feishuAppId: d.feishuAppId || '',
        feishuAppSecret: d.feishuAppSecret || '',
        feishuConfigured: d.feishuConfigured || false, feishuConnected: d.feishuConnected || false,
        reminderMinutes: d.reminderMinutes || 15, reminderEnabled: d.reminderEnabled !== false,
        digestEnabled: d.digestEnabled !== false, digestHour: d.digestHour || 8, digestAi: d.digestAi !== false,
        semesterName: d.semesterName || '', semesterStart: d.semesterStart || '',
        semesterEnd: d.semesterEnd || '',
        mentalReportCollege: d.mentalReportCollege || '',
      });
      setProfileName(user?.name || '');
    } catch {
      toast.error('加载设置失败');
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSettings();
  }, []);

  const put = async (body: Record<string, unknown>) => {
    await client.put('/settings', body);
    toast.success('已保存');
  };

  const set = (k: keyof SettingsData, v: unknown) => setData((d) => ({ ...d, [k]: v }));

  return (
    <div>
      <h2 className="mb-6 flex items-center gap-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
        <Settings className="h-6 w-6 text-brand-500" />
        设置
      </h2>

      {/* 全部设置卡共用一个 2 列网格：grid 自动按行成对填充，每行严格等高对齐 */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ThemeCard />
        <DeepSeekCard
          hasKey={data.hasDeepSeekKey}
          envConfigured={data.envConfigured}
          onSave={async (key) => { await put({ deepseekApiKey: key }); set('hasDeepSeekKey', !!key); }}
        />
        <SemesterCard
          key={`${data.semesterName}|${data.semesterStart}|${data.semesterEnd}`}
          name={data.semesterName} start={data.semesterStart} end={data.semesterEnd}
          onSave={async (name, start, end) => { await put({ semesterName: name, semesterStart: start, semesterEnd: end }); }}
        />
        <IMWebhookCard webhookUrl={data.webhookUrl} imToken={data.imToken} />
        <FeishuCard
          key={`${data.feishuOpenId}|${data.feishuAppId}`}
          feishuAppId={data.feishuAppId} feishuAppSecret={data.feishuAppSecret}
          feishuConfigured={data.feishuConfigured} feishuConnected={data.feishuConnected}
          feishuOpenId={data.feishuOpenId}
          onSave={async (appId, secret) => {
            await put({ feishuAppId: appId, feishuAppSecret: secret });
            set('feishuConfigured', true);
          }}
          onBindOpenId={async (openId) => { await put({ feishuOpenId: openId }); set('feishuOpenId', openId); }}
        />
        <ReminderCard
          enabled={data.reminderEnabled} minutes={data.reminderMinutes}
          onToggle={async (enabled) => { set('reminderEnabled', enabled); await put({ reminderEnabled: enabled }); }}
          onSaveMinutes={async (m) => { set('reminderMinutes', m); await put({ reminderMinutes: m }); }}
        />
        <DigestCard
          enabled={data.digestEnabled} hour={data.digestHour} ai={data.digestAi}
          onToggle={async (enabled) => { set('digestEnabled', enabled); await put({ digestEnabled: enabled }); }}
          onSaveHour={async (hour) => { set('digestHour', hour); await put({ digestHour: hour }); }}
          onToggleAi={async (ai) => { set('digestAi', ai); await put({ digestAi: ai }); }}
        />
        <AccountCard
          key={profileName || 'me'}
          email={user?.email || ''} name={profileName}
          onSave={async (name, password, oldPassword) => {
            const body: Record<string, string> = {};
            if (name) body.name = name;
            if (password) {
              body.password = password;
              body.oldPassword = oldPassword;
            }
            await client.put('/users/me', body);
            toast.success('个人信息已更新');
          }}
        />

        {/* 系统管理分区标题：横跨整行 */}
        {user?.role === 'admin' && (
          <h3 className="col-span-1 mt-2 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 xl:col-span-2">
            <ShieldCheck className="h-4 w-4 text-brand-500" />
            系统管理
          </h3>
        )}

        {user?.role === 'admin' && <UsersCard />}
        {user?.role === 'admin' && <AuditLogCard />}
        {user?.role === 'admin' && <BackupCard />}

        <AboutCard />
      </div>
    </div>
  );
}
