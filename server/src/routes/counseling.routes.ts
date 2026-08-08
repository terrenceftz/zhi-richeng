import { Router, Request, Response, NextFunction } from 'express';
import * as XLSX from 'xlsx';
import { authMiddleware } from '../middleware/auth.middleware';
import * as counselingService from '../services/counseling.service';
import * as audit from '../services/audit.service';
import * as settingsService from '../services/settings.service';
import * as llm from '../services/llm.service';
import * as aiContext from '../services/aiContext.service';
import prisma from '../db';

const router = Router();
router.use(authMiddleware);

/** 从请求构建 scope 上下文 */
function ctxOf(req: Request) {
  return { userId: req.userId, role: req.userRole, college: req.college };
}

// AI 谈心助手：生成谈话提纲（谈心前）
router.post('/outline', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { studentId } = req.body;
    if (!studentId) return res.status(400).json({ message: '缺少 studentId' });
    const ctx = await aiContext.buildStudentAiContext(ctxOf(req), studentId);
    const outline = await llm.counselingOutline(ctx);
    res.json({ outline });
  } catch (err) {
    next(err);
  }
});

// AI 谈心助手：把一句话描述整理成结构化谈心记录（谈后）
router.post('/summarize', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { text, studentId } = req.body;
    if (!text || typeof text !== 'string') return res.status(400).json({ message: '缺少 text 字段' });
    let ctx: Awaited<ReturnType<typeof aiContext.buildStudentAiContext>> | undefined;
    if (studentId) {
      ctx = await aiContext.buildStudentAiContext(ctxOf(req), studentId).catch(() => undefined);
    }
    const result = await llm.counselingSummarize(text.trim(), ctx);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// 谈心记录 Excel 汇总导出
router.get('/export/excel', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { visibleStudentWhere } = await import('../utils/scope');
    const records = await prisma.counseling.findMany({
      where: { student: visibleStudentWhere(ctxOf(req)) },
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
    const stats = await counselingService.getSemesterStats(ctxOf(req), { start, end });
    res.json({ ...stats, range: { start, end } });
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const records = await counselingService.getCounselings(ctxOf(req), {
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
    const record = await counselingService.createCounseling(ctxOf(req), {
      studentId, date, type, content, followUp,
    });
    res.status(201).json({ record });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const record = await counselingService.updateCounseling(ctxOf(req), req.params.id, req.body);
    res.json({ record });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await counselingService.deleteCounseling(ctxOf(req), req.params.id);
    res.json({ message: '已删除' });
  } catch (err) {
    next(err);
  }
});

export default router;
