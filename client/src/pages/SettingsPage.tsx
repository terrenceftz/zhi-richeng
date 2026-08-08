import { useState, useEffect } from 'react';
import { Settings } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useToastStore } from '../stores/toastStore';
import client from '../api/client';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import DeepSeekCard from '../components/settings/DeepSeekCard';
import IMWebhookCard from '../components/settings/IMWebhookCard';
import FeishuCard from '../components/settings/FeishuCard';
import SemesterCard from '../components/settings/SemesterCard';
import ReminderCard from '../components/settings/ReminderCard';
import AccountCard from '../components/settings/AccountCard';
import BackupCard from '../components/settings/BackupCard';
import AboutCard from '../components/settings/AboutCard';
import UsersCard from '../components/settings/UsersCard';
import AuditLogCard from '../components/settings/AuditLogCard';

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

      <div className="grid max-w-[1100px] grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="space-y-6">
          <DeepSeekCard
            hasKey={data.hasDeepSeekKey}
            envConfigured={data.envConfigured}
            onSave={async (key) => { await put({ deepseekApiKey: key }); set('hasDeepSeekKey', !!key); }}
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

        <div className="space-y-6">
          <SemesterCard
            name={data.semesterName} start={data.semesterStart} end={data.semesterEnd}
            onSave={async (name, start, end) => { await put({ semesterName: name, semesterStart: start, semesterEnd: end }); }}
          />
          <Card>
            <h3 className="mb-1 text-base font-semibold text-slate-900 dark:text-slate-100">报送学院</h3>
            <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">心理台账月度报送表（每月 15 号）中的「学院」列</p>
            <div className="space-y-3">
              <Input
                label="学院名称"
                value={data.mentalReportCollege}
                onChange={(e) => set('mentalReportCollege', e.target.value)}
                placeholder="如：华侨大学法学院"
                hint="导出报送表时自动填入「学院」列"
              />
              <Button size="sm" onClick={async () => { await put({ mentalReportCollege: data.mentalReportCollege }); }}>
                保存
              </Button>
            </div>
          </Card>
          <ReminderCard
            enabled={data.reminderEnabled} minutes={data.reminderMinutes}
            onToggle={async (enabled) => { set('reminderEnabled', enabled); await put({ reminderEnabled: enabled }); }}
            onSaveMinutes={async (m) => { set('reminderMinutes', m); await put({ reminderMinutes: m }); }}
          />
          <AccountCard
            email={user?.email || ''} name={profileName}
            onSave={async (name, password) => {
              const body: Record<string, string> = {};
              if (name) body.name = name;
              if (password) body.password = password;
              await client.put('/users/me', body);
              toast.success('个人信息已更新');
            }}
          />
        </div>
      </div>

      <div className="mt-6 max-w-[1100px] space-y-6">
        <UsersCard />
        <AuditLogCard />
        <BackupCard />
        <AboutCard />
      </div>
    </div>
  );
}
