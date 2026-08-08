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
    });
  } catch (err) {
    next(err);
  }
});

router.put('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { deepseekApiKey, feishuOpenId, feishuAppId, feishuAppSecret, reminderMinutes, reminderEnabled, digestEnabled, digestHour, digestAi, regEnabled, semesterName, semesterStart, semesterEnd, mentalReportCollege } = req.body;

    // 系统级字段（影响全局）必须管理员：飞书凭证、注册开关、学期、DeepSeek Key、报送学院
    const systemFields = ['feishuAppId', 'feishuAppSecret', 'regEnabled', 'semesterName', 'semesterStart', 'semesterEnd', 'deepseekApiKey', 'mentalReportCollege'];
    const wantsSystem = systemFields.some((f) => req.body[f] !== undefined);
    if (wantsSystem) {
      const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { role: true } });
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: '修改系统配置（飞书凭证/注册开关/学期/API Key）需要管理员权限' });
      }
    }

    if (deepseekApiKey !== undefined) {
      await settingsService.setSetting('deepseek_api_key', deepseekApiKey);
      clearLLMCache();
    }
    if (feishuOpenId !== undefined) {
      await settingsService.setSetting(`feishu_openid_${req.userId}`, feishuOpenId);
      // 维护 openId -> userId 反向索引（飞书消息路由用）
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
