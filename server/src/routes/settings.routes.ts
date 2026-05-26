import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import * as settingsService from '../services/settings.service';
import { v4 as uuid } from 'uuid';

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
      deepseekApiKey: settings.deepseek_api_key || '',
      hasDeepSeekKey: !!(settings.deepseek_api_key || process.env.DEEPSEEK_API_KEY),
      envConfigured: !!(process.env.DEEPSEEK_API_KEY && process.env.DEEPSEEK_API_KEY !== 'sk-your-deepseek-api-key'),
      imToken,
      webhookUrl: `${req.protocol}://${req.get('host')}/api/im/task`,
      feishuOpenId,
      feishuAppId: dbAppId || feishuAppId(),
      feishuAppSecret: dbAppSecret ? '••••••••' : (feishuAppSecret() ? '••••••••' : ''),
      feishuConfigured: hasFeishuApp,
      feishuConnected: isFeishuConnected(),
      regEnabled: settings.registration_enabled || 'true',
      reminderMinutes: parseInt(settings.reminder_minutes || '15'),
      reminderEnabled: settings.reminder_enabled !== 'false',
    });
  } catch (err) {
    next(err);
  }
});

router.put('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { deepseekApiKey, feishuOpenId, feishuAppId, feishuAppSecret, reminderMinutes, reminderEnabled, regEnabled } = req.body;
    if (deepseekApiKey !== undefined) {
      await settingsService.setSetting('deepseek_api_key', deepseekApiKey);
    }
    if (feishuOpenId !== undefined) {
      await settingsService.setSetting(`feishu_openid_${req.userId}`, feishuOpenId);
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
    if (regEnabled !== undefined) {
      await settingsService.setSetting('registration_enabled', String(regEnabled));
    }
    const settings = await settingsService.getAllSettings();
    const imTokenKey = `im_user_${req.userId}`;
    res.json({
      deepseekApiKey: settings.deepseek_api_key || '',
      hasDeepSeekKey: !!(settings.deepseek_api_key || process.env.DEEPSEEK_API_KEY),
      imToken: settings[imTokenKey] || '',
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
