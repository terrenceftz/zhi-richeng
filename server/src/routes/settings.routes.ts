import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import * as settingsService from '../services/settings.service';
import * as audit from '../services/audit.service';
import { clearLLMCache } from '../services/llm.service';
import { v4 as uuid } from 'uuid';
import prisma from '../db';

const router = Router();
router.use(authMiddleware);

function feishuAppId(): string {
  return process.env.FEISHU_APP_ID || '';
}

function feishuAppSecret(): string {
  return process.env.FEISHU_APP_SECRET || '';
}

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const settings = await settingsService.getAllSettings();

    // Get or create IM token
    const imTokenKey = `im_user_${req.userId}`;
    let imToken = settings[imTokenKey];
    if (!imToken) {
      imToken = uuid().replace(/-/g, '').slice(0, 32);
      await settingsService.setSetting(imTokenKey, imToken);
      await settingsService.setSetting(`im_token_${imToken}`, req.userId!);
    }

    const feishuOpenId = settings[`feishu_openid_${req.userId}`] || '';
    const dbAppId = settings.feishu_app_id || '';
    const dbAppSecret = settings.feishu_app_secret || '';
    const hasFeishuApp = !!(dbAppId || feishuAppId()) && !!(dbAppSecret || feishuAppSecret());
    const { isFeishuConnected } = await import('../services/feishu.service');

    res.json({
      // 不再返回明文密钥，仅返回是否已配置
      hasDeepSeekKey: !!(settings.deepseek_api_key || process.env.DEEPSEEK_API_KEY),
      envConfigured: !!(process.env.DEEPSEEK_API_KEY && process.env.DEEPSEEK_API_KEY !== 'sk-your-deepseek-api-key'),
      imToken,
      webhookUrl: `${req.protocol}://${req.get('host')}/api/im/task`,
      feishuOpenId,
      feishuAppId: dbAppId || feishuAppId(),
      feishuAppSecret: dbAppSecret ? '••••••••' : (feishuAppSecret() ? '••••••••' : ''),
      feishuConfigured: hasFeishuApp,
      feishuConnected: isFeishuConnected(),
      regEnabled: settings.registration_enabled || 'false',
      reminderMinutes: parseInt(settings.reminder_minutes || '15'),
      reminderEnabled: settings.reminder_enabled !== 'false',
      digestEnabled: settings.digest_enabled !== 'false',
      digestHour: parseInt(settings.digest_hour || '8'),
      digestAi: settings.digest_ai !== 'false',
      semesterName: settings.semester_name || '',
      semesterStart: settings.semester_start || '',
      semesterEnd: settings.semester_end || '',
      mentalReportCollege: settings.mental_report_college || '',
      mentalReportDay: parseInt(settings.mental_report_day || '15'),
      mentalReportEnabled: settings.mental_report_enabled !== 'false',
      mentalReportSkipMonths: settings.mental_report_skip_months || '1,2,7,8',
    });
  } catch (err) {
    next(err);
  }
});

router.put('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { deepseekApiKey, feishuOpenId, feishuAppId, feishuAppSecret, reminderMinutes, reminderEnabled, digestEnabled, digestHour, digestAi, regEnabled, semesterName, semesterStart, semesterEnd, mentalReportCollege, mentalReportDay, mentalReportEnabled, mentalReportSkipMonths } = req.body;

    // 系统级字段（影响全局）必须管理员：飞书凭证、注册开关、学期、DeepSeek Key、报送学院、提醒/简报/报送配置
    const systemFields = [
      'feishuAppId', 'feishuAppSecret', 'regEnabled', 'semesterName', 'semesterStart', 'semesterEnd', 'deepseekApiKey', 'mentalReportCollege',
      'reminderMinutes', 'reminderEnabled', 'digestEnabled', 'digestHour', 'digestAi',
      'mentalReportDay', 'mentalReportEnabled', 'mentalReportSkipMonths',
    ];
    const wantsSystem = systemFields.some((f) => req.body[f] !== undefined);
    if (wantsSystem) {
      const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { role: true } });
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: '修改系统配置（提醒/简报/报送等全局设置）需要管理员权限' });
      }
    }

    if (deepseekApiKey !== undefined) {
      await settingsService.setSetting('deepseek_api_key', deepseekApiKey);
      clearLLMCache();
    }
    if (feishuOpenId !== undefined) {
      // 绑定飞书 OpenID：防止覆盖他人已绑定的 OpenID（反向索引冲突则拒绝，避免消息路由劫持）
      if (feishuOpenId) {
        const owner = await settingsService.getSetting(`feishu_userid_${feishuOpenId}`);
        if (owner && owner !== req.userId) {
          return res.status(400).json({ message: '该飞书 OpenID 已绑定其他账号，请勿重复绑定' });
        }
      }
      const oldOpenId = await settingsService.getSetting(`feishu_openid_${req.userId}`);
      if (oldOpenId && oldOpenId !== feishuOpenId) {
        await settingsService.setSetting(`feishu_userid_${oldOpenId}`, '');
      }
      await settingsService.setSetting(`feishu_openid_${req.userId}`, feishuOpenId);
      if (feishuOpenId) {
        await settingsService.setSetting(`feishu_userid_${feishuOpenId}`, req.userId!);
      }
    }
    if (feishuAppId !== undefined) {
      await settingsService.setSetting('feishu_app_id', feishuAppId);
    }
    if (feishuAppSecret !== undefined && feishuAppSecret !== '••••••••') {
      await settingsService.setSetting('feishu_app_secret', feishuAppSecret);
    }
    if (reminderMinutes !== undefined) {
      await settingsService.setSetting('reminder_minutes', String(reminderMinutes));
    }
    if (reminderEnabled !== undefined) {
      await settingsService.setSetting('reminder_enabled', String(reminderEnabled));
    }
    if (digestEnabled !== undefined) {
      await settingsService.setSetting('digest_enabled', String(digestEnabled));
    }
    if (digestHour !== undefined) {
      await settingsService.setSetting('digest_hour', String(Math.max(0, Math.min(23, parseInt(String(digestHour), 10) || 8))));
    }
    if (digestAi !== undefined) {
      await settingsService.setSetting('digest_ai', String(digestAi));
    }
    if (regEnabled !== undefined) {
      await settingsService.setSetting('registration_enabled', String(regEnabled));
    }
    if (semesterName !== undefined) {
      await settingsService.setSetting('semester_name', semesterName);
    }
    if (semesterStart !== undefined) {
      await settingsService.setSetting('semester_start', semesterStart);
    }
    if (semesterEnd !== undefined) {
      await settingsService.setSetting('semester_end', semesterEnd);
    }
    if (mentalReportCollege !== undefined) {
      await settingsService.setSetting('mental_report_college', String(mentalReportCollege));
    }
    if (mentalReportDay !== undefined) {
      await settingsService.setSetting('mental_report_day', String(Math.max(1, Math.min(28, parseInt(String(mentalReportDay), 10) || 15))));
    }
    if (mentalReportEnabled !== undefined) {
      await settingsService.setSetting('mental_report_enabled', String(mentalReportEnabled));
    }
    if (mentalReportSkipMonths !== undefined) {
      // 校验并规范化：仅保留 1-12 的有效月份
      const nums = String(mentalReportSkipMonths).split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => n >= 1 && n <= 12);
      await settingsService.setSetting('mental_report_skip_months', nums.length > 0 ? [...new Set(nums)].join(',') : '');
    }
    await audit.log(req.userId!, 'settings_update', { ip: req.ip });
    const settings = await settingsService.getAllSettings();
    const imTokenKey = `im_user_${req.userId}`;
    res.json({
      hasDeepSeekKey: !!(settings.deepseek_api_key || process.env.DEEPSEEK_API_KEY),
      imToken: settings[imTokenKey] || '',
      mentalReportCollege: settings.mental_report_college || '',
      message: '设置已保存',
    });
  } catch (err) {
    next(err);
  }
});

router.post('/regenerate-im-token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const imTokenKey = `im_user_${req.userId}`;
    const oldToken = await settingsService.getSetting(imTokenKey);
    if (oldToken) {
      await settingsService.setSetting(`im_token_${oldToken}`, '');
    }

    const newToken = uuid().replace(/-/g, '').slice(0, 32);
    await settingsService.setSetting(imTokenKey, newToken);
    await settingsService.setSetting(`im_token_${newToken}`, req.userId!);

    res.json({ imToken: newToken });
  } catch (err) {
    next(err);
  }
});

export default router;
