import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import prisma from '../db';
import * as settingsService from '../services/settings.service';
import * as audit from '../services/audit.service';

const router = Router();
router.use(authMiddleware);

/** 内置心理报送项实际配置从 settings 读取（保持与设置页一致） */
async function hydrateBuiltin(item: any): Promise<any> {
  const settings = await settingsService.getAllSettings();
  if (item.contentType !== 'mental_report') return item;
  return {
    ...item,
    dayOfMonth: parseInt(settings.mental_report_day || '15'),
    enabled: settings.mental_report_enabled !== 'false',
    skipMonths: settings.mental_report_skip_months || '1,2,7,8',
    college: settings.mental_report_college || '',
  };
}

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reminders = await prisma.recurringReminder.findMany({ orderBy: [{ builtin: 'desc' }, { createdAt: 'asc' }] });
    const hydrated = await Promise.all(reminders.map((r) => hydrateBuiltin(r)));
    res.json(hydrated);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, cycleType, time, weekdays, dayOfMonth, content } = req.body;
    if (!title || !cycleType || !time) {
      return res.status(400).json({ message: '名称、周期类型、时间必填' });
    }
    if (!['daily', 'weekly', 'monthly'].includes(cycleType)) {
      return res.status(400).json({ message: '周期类型无效' });
    }
    const item = await prisma.recurringReminder.create({
      data: {
        title: String(title).slice(0, 100),
        cycleType,
        time: String(time),
        weekdays: cycleType === 'weekly' ? String(weekdays || '') : null,
        dayOfMonth: cycleType === 'monthly' ? Math.max(1, Math.min(28, parseInt(String(dayOfMonth), 10) || 1)) : null,
        content: content ? String(content).slice(0, 1000) : null,
        contentType: 'text',
        builtin: false,
        enabled: true,
      },
    });
    await audit.log(req.userId!, 'settings_update', { detail: `创建周期提醒: ${item.title}`, ip: req.ip });
    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const existing = await prisma.recurringReminder.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: '周期提醒不存在' });

    // 内置心理报送项：核心配置写入 settings（与设置页一致），行内仅更新时间/标题
    if (existing.contentType === 'mental_report') {
      const { day, enabled, skipMonths, college, time } = req.body;
      if (day !== undefined) await settingsService.setSetting('mental_report_day', String(Math.max(1, Math.min(28, parseInt(String(day), 10) || 15))));
      if (enabled !== undefined) await settingsService.setSetting('mental_report_enabled', String(enabled));
      if (college !== undefined) await settingsService.setSetting('mental_report_college', String(college).slice(0, 100));
      if (skipMonths !== undefined) {
        const nums = String(skipMonths).split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => n >= 1 && n <= 12);
        await settingsService.setSetting('mental_report_skip_months', nums.length > 0 ? [...new Set(nums)].join(',') : '');
      }
      const updated = await prisma.recurringReminder.update({
        where: { id },
        data: { time: time || existing.time, updatedAt: new Date() },
      });
      await audit.log(req.userId!, 'settings_update', { detail: '更新周期提醒: 心理台账报送', ip: req.ip });
      return res.json(await hydrateBuiltin(updated));
    }

    const { title, cycleType, time, weekdays, dayOfMonth, content, enabled } = req.body;
    const updated = await prisma.recurringReminder.update({
      where: { id },
      data: {
        title: title !== undefined ? String(title).slice(0, 100) : existing.title,
        cycleType: cycleType !== undefined ? cycleType : existing.cycleType,
        time: time !== undefined ? String(time) : existing.time,
        weekdays: cycleType === 'weekly' ? String(weekdays || '') : existing.cycleType === 'weekly' ? existing.weekdays : null,
        dayOfMonth: cycleType === 'monthly'
          ? Math.max(1, Math.min(28, parseInt(String(dayOfMonth), 10) || 1))
          : existing.cycleType === 'monthly' ? existing.dayOfMonth : null,
        content: content !== undefined ? (content ? String(content).slice(0, 1000) : null) : existing.content,
        enabled: enabled !== undefined ? Boolean(enabled) : existing.enabled,
        updatedAt: new Date(),
      },
    });
    await audit.log(req.userId!, 'settings_update', { detail: `更新周期提醒: ${updated.title}`, ip: req.ip });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const existing = await prisma.recurringReminder.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: '周期提醒不存在' });
    if (existing.builtin) return res.status(400).json({ message: '内置项不可删除，可关闭' });
    await prisma.recurringReminder.delete({ where: { id } });
    await audit.log(req.userId!, 'settings_update', { detail: `删除周期提醒: ${existing.title}`, ip: req.ip });
    res.json({ message: '已删除' });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/toggle', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const existing = await prisma.recurringReminder.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: '周期提醒不存在' });

    if (existing.contentType === 'mental_report') {
      const next = req.body.enabled === undefined ? !existing.enabled : Boolean(req.body.enabled);
      await settingsService.setSetting('mental_report_enabled', String(next));
      const updated = await prisma.recurringReminder.update({ where: { id }, data: { updatedAt: new Date() } });
      return res.json(await hydrateBuiltin(updated));
    }

    const updated = await prisma.recurringReminder.update({
      where: { id },
      data: { enabled: req.body.enabled === undefined ? !existing.enabled : Boolean(req.body.enabled), updatedAt: new Date() },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

export default router;
