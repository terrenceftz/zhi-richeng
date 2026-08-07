import { Router, Request, Response, NextFunction } from 'express';
import * as XLSX from 'xlsx';
import { authMiddleware } from '../middleware/auth.middleware';
import * as mentalService from '../services/mental.service';
import * as mentalAlert from '../services/mentalAlert.service';
import * as llm from '../services/llm.service';
import prisma from '../db';

const router = Router();
router.use(authMiddleware);

const CATEGORY_KEYS = ['心理健康', '学业预警', '延期毕业', '重大疾病', '政治安全', '其他关注'];

// 台账学生列表（带档案）
router.get('/students', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const students = await mentalService.getMentalStudents(req.userId!);
    res.json({ students });
  } catch (err) {
    next(err);
  }
});

// 风险预警：长期未跟进的重点学生
router.get('/alerts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const alerts = await mentalAlert.getRiskAlerts(req.userId!);
    res.json({ alerts });
  } catch (err) {
    next(err);
  }
});

// 本月尚未跟进的台账学生（月度报送清单）
router.get('/monthly-pending', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pending = await mentalAlert.getNoFollowUpThisMonth(req.userId!);
    const isHoliday = await mentalAlert.isHolidayMonth();
    res.json({ pending, isHoliday, skipMonths: await mentalAlert.getSkipMonths() });
  } catch (err) {
    next(err);
  }
});

// AI 台账智囊：基于档案 + 历史跟进记录生成下一步跟进建议
router.post('/advice', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { studentId } = req.body;
    if (!studentId) return res.status(400).json({ message: '缺少 studentId' });
    const student = await prisma.student.findFirst({ where: { id: studentId, userId: req.userId } });
    if (!student) return res.status(404).json({ message: '学生不存在' });

    const profile = await prisma.mentalProfile.findFirst({ where: { studentId, userId: req.userId } });
    const records = await prisma.mentalRecord.findMany({
      where: { studentId, userId: req.userId },
      orderBy: { date: 'desc' },
      take: 10,
    });

    const levelNames: Record<number, string> = { 1: '一级', 2: '二级', 3: '三级（最高）' };
    const profileText = profile
      ? [
          `姓名：${student.name}（${student.studentNo || '无学号'}）`,
          `班级：${student.className || '-'} / ${student.grade || '-'}`,
          `关注级别：${levelNames[profile.concernLevel] || '一级'}`,
          `类别：${(() => { try { return JSON.parse(profile.categories).join('、'); } catch { return '无'; } })()}`,
          `是否经济困难：${profile.isPoverty ? '是' : '否'}`,
          `纳入时间：${profile.includedAt ? new Date(profile.includedAt).toISOString().slice(0, 10) : '未填写'}，原因：${profile.includeReason || '未填写'}`,
          `跟进人：${profile.followUpPerson || '未指定'}`,
          `家长是否知情：${profile.parentInformed ? '是' : '否'}${profile.parentPhone ? `（${profile.parentPhone}）` : ''}`,
          `备注：${profile.remark || '无'}`,
        ].join('\n')
      : `${student.name}（${student.studentNo || '无学号'}）暂无完整档案`;

    const recordsText = records.length
      ? records.map((r) => `【${new Date(r.date).toISOString().slice(0, 10)}】${r.situation}${r.action ? `；措施：${r.action}` : ''}`).join('\n')
      : '暂无跟进记录';

    const advice = await llm.mentalAdvice(profileText, recordsText);
    res.json({ advice });
  } catch (err) {
    next(err);
  }
});

// 切换学生台账标记
router.patch('/students/:id/toggle', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { value } = req.body;
    // 显式判断布尔值（兼容字符串 "true"/"false" 与布尔）
    const target = value === true || value === 'true';
    const student = await mentalService.toggleMentalTarget(req.userId!, req.params.id, target);
    res.json({ student });
  } catch (err) {
    next(err);
  }
});

// 更新台账档案（upsert）
router.put('/students/:id/profile', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profile = await mentalService.upsertProfile(req.userId!, req.params.id, req.body);
    res.json({ profile });
  } catch (err) {
    next(err);
  }
});

// 台账 Excel 导出
router.get('/export', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const students = await mentalService.getMentalStudents(req.userId!);
    const rows = students.map((s: any) => {
      const p = s.mentalProfile || {};
      return {
        姓名: s.name,
        学号: s.studentNo || '',
        班级: s.className || '',
        年级: s.grade || '',
        是否家庭经济困难生: p.isPoverty ? '是' : '否',
        关注级别: p.concernLevel || 1,
        类别: (p.categories || []).join('、'),
        纳入台账时间: p.includedAt ? new Date(p.includedAt).toISOString().slice(0, 10) : '',
        纳入原因: p.includeReason || '',
        跟进人: p.followUpPerson || '',
        家长是否知情: p.parentInformed ? '是' : '否',
        家长联系电话: p.parentPhone || '',
        跟进记录数: s._count?.mentalRecords || 0,
        备注: p.remark || '',
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 10 }, { wch: 14 }, { wch: 16 }, { wch: 8 }, { wch: 14 }, { wch: 8 }, { wch: 22 }, { wch: 12 }, { wch: 28 }, { wch: 10 }, { wch: 12 }, { wch: 14 }, { wch: 10 }, { wch: 20 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '心理台账');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const ts = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="mental-ledger-${ts}.xlsx"`);
    res.send(buf);
  } catch (err) {
    next(err);
  }
});

/**
 * 月度报送表导出（华侨大学法学院学生安全稳定工作排查汇总表格式）
 * 每月 15 号报送使用；寒暑假不计入。
 */
router.get('/export/report', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const monthStart = new Date(year, now.getMonth(), 1);

    // 学院（可配置，设置项 mental_report_college）
    const college = (await mentalService.getCollegeName()) || '';

    // 台账学生（带档案 + 全部跟进记录）
    const students = await prisma.student.findMany({
      where: { userId, isMentalTarget: true },
      include: {
        mentalProfile: true,
        mentalRecords: { orderBy: [{ date: 'asc' }, { createdAt: 'asc' }] },
      },
      orderBy: [{ mentalProfile: { concernLevel: 'desc' } }, { name: 'asc' }],
    });

    const levelName = (lv: number) => (lv === 3 ? '三级' : lv === 2 ? '二级' : '一级');

    // 表头（与模板一致）
    const headers = [
      '序号', '本月是否跟进', '本月跟进情况（时间、方式、内容）', '学院', '姓名\n（一人一行，涉及多种类别的，合并填写，类别可填写多个）',
      '性别', '学号', '年级', '专业', '住宿情况', '生源地', '是否家庭经济困难', '关注级别',
      '类别\n1.心理健康\n2.学业预警\n3.延期毕业\n4.重大疾病\n5.政治安全\n6.其他关注\n',
      '纳入台账时间、原因', '跟进措施及跟进情况\n（纳入台账以来跟进情况汇总）', '跟进人', '家长是否知情', '家长联系电话',
      '学生联系方式', '备注\n（休学、未返校、近期复学等）',
    ];

    // 第一行：合并标题（与模板一致）
    const title = `华侨大学学生安全稳定工作台帐学院反馈汇总表（${year}年${month}月）`;
    const rows: (string | number)[][] = [[title], headers];
    students.forEach((s: any, i: number) => {
      const p = s.mentalProfile || {};
      // 本月跟进记录
      const monthRecords = s.mentalRecords.filter((r: any) => new Date(r.date) >= monthStart);
      // 全部跟进汇总（纳入台账以来）
      const allSummary = s.mentalRecords.map((r: any) => {
        const d = new Date(r.date).toISOString().slice(0, 10);
        const parts = [d];
        if (r.situation) parts.push(r.situation);
        if (r.action) parts.push(`措施：${r.action}`);
        if (r.followUpDate) parts.push(`下次跟进：${new Date(r.followUpDate).toISOString().slice(0, 10)}`);
        return parts.join('；');
      }).join('\n');
      const monthSummary = monthRecords.map((r: any) => {
        const d = new Date(r.date).toISOString().slice(0, 10);
        return `${d} ${r.situation || ''}`.trim();
      }).join('\n');

      rows.push([
        i + 1,
        monthRecords.length > 0 ? '是' : '否',
        monthSummary,
        college,
        s.name,
        s.gender || '',
        s.studentNo || '',
        s.grade || '',
        s.className || '',
        s.dormitory || '',
        s.hometown || '',
        p.isPoverty ? '是' : '否',
        levelName(p.concernLevel || 1),
        (() => {
          // categories 在 DB 中是 JSON 字符串
          try {
            const arr = JSON.parse(p.categories || '[]');
            return Array.isArray(arr) ? arr.join('、') : '';
          } catch { return ''; }
        })(),
        `${p.includedAt ? new Date(p.includedAt).toISOString().slice(0, 10) : ''}${p.includeReason ? ` ${p.includeReason}` : ''}`.trim(),
        allSummary,
        p.followUpPerson || '',
        p.parentInformed ? '是' : '否',
        p.parentPhone || '',
        s.phone || '',
        p.remark || '',
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    // 标题行：合并第一行所有列 + 加粗居中
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } }];
    // 标题行样式（加粗 + 居中）
    const titleCell = ws['A1'];
    if (titleCell) titleCell.s = { font: { bold: true, sz: 14 }, alignment: { horizontal: 'center', vertical: 'center' } };
    // 表头行样式（加粗 + 居中 + 背景）
    for (let c = 0; c < headers.length; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r: 1, c })];
      if (cell) cell.s = { font: { bold: true }, alignment: { horizontal: 'center', vertical: 'center', wrapText: true }, fill: { fgColor: { rgb: 'EEF2FF' } } };
    }
    // 行高：标题 36、表头 60、数据自动
    ws['!rows'] = [{ hpt: 36 }, { hpt: 60 }, ...students.map(() => ({}))];
    ws['!cols'] = [
      { wch: 5 }, { wch: 10 }, { wch: 28 }, { wch: 16 }, { wch: 12 },
      { wch: 6 }, { wch: 13 }, { wch: 8 }, { wch: 16 }, { wch: 14 },
      { wch: 12 }, { wch: 10 }, { wch: 8 },
      { wch: 14 },
      { wch: 24 }, { wch: 36 }, { wch: 10 }, { wch: 10 }, { wch: 14 },
      { wch: 14 }, { wch: 16 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '安全台账');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const filename = `华侨大学学生安全稳定工作台帐学院反馈汇总表（${year}年${month}月）.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.send(buf);
  } catch (err) {
    next(err);
  }
});
router.post('/import', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const list: any[] = Array.isArray(req.body) ? req.body : req.body.students;
    if (!Array.isArray(list) || list.length === 0) {
      return res.status(400).json({ message: '请提供台账数据数组' });
    }

    // 检查是否包含学号字段（兼容 学号/studentNo 及数字学号）
    const firstRow = list[0] || {};
    const hasStudentNoKey = Object.keys(firstRow).some((k) => k.includes('学号') || /^studentno$/i.test(k));
    if (!hasStudentNoKey) {
      return res.status(400).json({ message: '未找到「学号」列，请确认表头包含学号（姓名、学号、关注级别...）' });
    }

    let updated = 0;
    let notFound: string[] = [];

    for (const row of list.slice(0, 500)) {
      // 兼容数字学号（Excel 单元格可能存成数字 2217111050）
      const studentNoRaw = row.studentNo ?? row.学号 ?? '';
      const studentNo = String(studentNoRaw).trim();
      if (!studentNo || studentNo === 'null' || studentNo === 'undefined') continue;

      const student = await prisma.student.findFirst({
        where: { userId: req.userId, studentNo },
      });
      if (!student) {
        notFound.push(studentNo);
        continue;
      }

      // 类别：逗号/顿号分隔
      const rawCat = String(row.categories ?? row.类别 ?? '');
      const categories = rawCat
        .split(/[,，、]/)
        .map((s: string) => s.trim())
        .filter((s: string) => CATEGORY_KEYS.includes(s));

      const profile = await mentalService.upsertProfile(req.userId!, student.id, {
        isPoverty: /^是|^1|true/i.test(String(row.isPoverty ?? row.是否家庭经济困难生 ?? '否')),
        concernLevel: parseInt(String(row.concernLevel ?? row.关注级别 ?? '1')) || 1,
        categories: categories.length > 0 ? categories : ['心理健康'],
        includedAt: String(row.includedAt ?? row.纳入台账时间 ?? '') || undefined,
        includeReason: String(row.includeReason ?? row.纳入原因 ?? '') || undefined,
        followUpPerson: String(row.followUpPerson ?? row.跟进人 ?? '') || undefined,
        parentInformed: /^是|^1|true/i.test(String(row.parentInformed ?? row.家长是否知情 ?? '否')),
        parentPhone: String(row.parentPhone ?? row.家长联系电话 ?? '') || undefined,
        remark: String(row.remark ?? row.备注 ?? '') || undefined,
      });
      if (profile) updated++;
    }

    if (updated === 0) {
      const reason = notFound.length > 0
        ? `未能匹配任何学生：${notFound.slice(0, 5).join('、')}${notFound.length > 5 ? ' 等' : ''}（学号在学生管理中不存在）`
        : '未匹配到任何学生，请检查学号列是否与学生管理中的学号一致';
      return res.status(400).json({ message: reason });
    }

    res.json({ updated, notFound: notFound.slice(0, 20), message: `已更新 ${updated} 名台账学生${notFound.length > 0 ? `，${notFound.length} 名未匹配（学号不存在）` : ''}` });
  } catch (err) {
    next(err);
  }
});

// 跟进记录列表
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const records = await mentalService.getRecords(req.userId!, {
      studentId: req.query.studentId as string | undefined,
      status: req.query.status as string | undefined,
      level: req.query.level as string | undefined,
    });
    res.json({ records });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { studentId, date, level, status, situation, action, followUp, followUpDate } = req.body;
    if (!studentId || !date || !situation) {
      return res.status(400).json({ message: '缺少 studentId / date / situation' });
    }
    const record = await mentalService.createRecord(req.userId!, {
      studentId, date, level, status, situation, action, followUp, followUpDate,
    });
    res.status(201).json({ record });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const record = await mentalService.updateRecord(req.userId!, req.params.id, req.body);
    res.json({ record });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await mentalService.deleteRecord(req.userId!, req.params.id);
    res.json({ message: '已删除' });
  } catch (err) {
    next(err);
  }
});

export default router;
