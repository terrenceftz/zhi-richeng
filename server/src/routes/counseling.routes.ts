import { Router, Request, Response, NextFunction } from 'express';
import * as XLSX from 'xlsx';
import { authMiddleware } from '../middleware/auth.middleware';
import * as counselingService from '../services/counseling.service';
import * as settingsService from '../services/settings.service';
import prisma from '../db';

const router = Router();
router.use(authMiddleware);

// 谈心记录 Excel 汇总导出
router.get('/export/excel', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const records = await prisma.counseling.findMany({
      where: { userId: req.userId },
      include: { student: { select: { name: true, className: true, grade: true, isMentalTarget: true } } },
      orderBy: { date: 'desc' },
    });
    const rows = records.map((r) => ({
      学生姓名: r.student.name,
      班级: r.student.className || '',
      年级: r.student.grade || '',
      台账学生: r.student.isMentalTarget ? '是' : '否',
      谈心日期: new Date(r.date).toISOString().slice(0, 10),
      类型: r.type,
      谈话内容: r.content,
      后续跟进: r.followUp || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 10 }, { wch: 16 }, { wch: 8 }, { wch: 8 }, { wch: 12 }, { wch: 8 }, { wch: 40 }, { wch: 30 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '谈心记录');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const ts = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="counseling-${ts}.xlsx"`);
    res.send(buf);
  } catch (err) {
    next(err);
  }
});

/** 学期谈心统计：未配置学期时回退到本学年（9月1日起） */
router.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    let start = (await settingsService.getSetting('semester_start')) || undefined;
    let end = (await settingsService.getSetting('semester_end')) || undefined;
    if (!start || !end) {
      const now = new Date();
      const year = now.getFullYear();
      const inSecondHalf = now.getMonth() >= 8; // 9月及以后
      start = inSecondHalf ? `${year}-09-01` : `${year - 1}-09-01`;
      end = inSecondHalf ? `${year + 1}-08-31` : `${year}-08-31`;
    }
    const stats = await counselingService.getSemesterStats(req.userId!, { start, end });
    res.json({ ...stats, range: { start, end } });
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const records = await counselingService.getCounselings(req.userId!, {
      studentId: req.query.studentId as string | undefined,
      from: req.query.from as string | undefined,
      to: req.query.to as string | undefined,
    });
    res.json({ records });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { studentId, date, type, content, followUp } = req.body;
    if (!studentId || !date || !content) {
      return res.status(400).json({ message: '缺少 studentId / date / content' });
    }
    const record = await counselingService.createCounseling(req.userId!, {
      studentId, date, type, content, followUp,
    });
    res.status(201).json({ record });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const record = await counselingService.updateCounseling(req.userId!, req.params.id, req.body);
    res.json({ record });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await counselingService.deleteCounseling(req.userId!, req.params.id);
    res.json({ message: '已删除' });
  } catch (err) {
    next(err);
  }
});

export default router;
