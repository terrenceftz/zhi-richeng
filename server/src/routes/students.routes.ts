import { Router, Request, Response, NextFunction } from 'express';
import * as XLSX from 'xlsx';
import { authMiddleware } from '../middleware/auth.middleware';
import * as studentsService from '../services/students.service';
import * as audit from '../services/audit.service';
import prisma from '../db';
import multer from 'multer';

const router = Router();
router.use(authMiddleware);

// 导入仅接受 JSON 文件（前端用 xlsx 解析 Excel 后提交 JSON 数组）
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

/** 从请求构建 scope 上下文 */
function ctxOf(req: Request) {
  return { userId: req.userId, role: req.userRole, college: req.college };
}

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await studentsService.getStudents(ctxOf(req), {
      q: (req.query.q as string) || undefined,
      className: (req.query.className as string) || undefined,
      grade: (req.query.grade as string) || undefined,
      studentType: (req.query.studentType as string) || undefined,
      mentalTarget: (req.query.mentalTarget as string) || undefined,
      page: parseInt(req.query.page as string) || 1,
      pageSize: parseInt(req.query.pageSize as string) || 30,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/classes', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const classes = await studentsService.getClasses(ctxOf(req));
    res.json({ classes });
  } catch (err) {
    next(err);
  }
});

router.get('/grades', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const grades = await studentsService.getGrades(ctxOf(req));
    res.json({ grades });
  } catch (err) {
    next(err);
  }
});

// 花名册 Excel 导出（全量字段，按可见范围）
router.get('/export/excel', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { visibleStudentWhere } = await import('../utils/scope');
    const students = await prisma.student.findMany({
      where: visibleStudentWhere(ctxOf(req)),
      include: { mentalProfile: true },
      orderBy: [{ grade: 'asc' }, { className: 'asc' }],
    });
    const rows = students.map((s) => {
      const p = s.mentalProfile;
      return {
        姓名: s.name,
        学号: s.studentNo || '',
        性别: s.gender || '',
        出生日期: s.birthDate ? new Date(s.birthDate).toISOString().slice(0, 10) : '',
        学生类型: s.studentType === 'overseas' ? '境外生' : s.studentType === 'domestic' ? '境内生' : '',
        证件号码: s.idNumber || '',
        年级: s.grade || '',
        班级: s.className || '',
        籍贯: s.hometown || '',
        手机: s.phone || '',
        宿舍: s.dormitory || '',
        家庭住址: s.address || '',
        心理台账: s.isMentalTarget ? '是' : '否',
        关注级别: p ? (p.concernLevel || 1) : '',
        备注: s.remark || '',
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
      { wch: 10 }, { wch: 14 }, { wch: 6 }, { wch: 12 }, { wch: 8 },
      { wch: 22 }, { wch: 8 }, { wch: 14 }, { wch: 10 }, { wch: 14 },
      { wch: 12 }, { wch: 24 }, { wch: 8 }, { wch: 8 }, { wch: 20 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '学生花名册');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const ts = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="students-roster-${ts}.xlsx"`);
    await audit.log(req.userId!, 'export_roster', { ip: req.ip });
    res.send(buf);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const student = await studentsService.getStudentById(ctxOf(req), req.params.id);
    res.json({ student });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, studentNo, className, gender, birthDate, studentType, idNumber, grade, hometown, phone, dormitory, address, tags, remark, college } = req.body;
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ message: '缺少学生姓名' });
    }
    const student = await studentsService.createStudent(ctxOf(req), {
      name, studentNo, className, gender, birthDate, studentType, idNumber, grade, hometown, phone, dormitory, address, tags, remark, college,
    });
    res.status(201).json({ student });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const student = await studentsService.updateStudent(ctxOf(req), req.params.id, req.body);
    res.json({ student });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await studentsService.deleteStudent(ctxOf(req), req.params.id);
    res.json({ message: '已删除' });
  } catch (err) {
    next(err);
  }
});

/** 批量导入：接受 JSON 数组（前端把 Excel/CSV 转 JSON 后提交） */
router.post('/import', upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    let list: any[] = [];
    if (req.file) {
      const text = req.file.buffer.toString('utf-8');
      list = JSON.parse(text);
    } else if (Array.isArray(req.body.students)) {
      list = req.body.students;
    } else if (Array.isArray(req.body)) {
      list = req.body;
    }
    if (!Array.isArray(list) || list.length === 0) {
      return res.status(400).json({ message: '请提供学生数组（JSON）' });
    }
    const cleaned = list
      .filter((s) => s && typeof s.name === 'string')
      .slice(0, 2000)
      .map((s) => ({
        name: String(s.name),
        studentNo: s.studentNo ? String(s.studentNo) : undefined,
        className: s.className ? String(s.className) : undefined,
        gender: s.gender ? String(s.gender) : undefined,
        birthDate: s.birthDate ? String(s.birthDate) : undefined,
        studentType: s.studentType ? String(s.studentType) : undefined,
        idNumber: s.idNumber ? String(s.idNumber) : undefined,
        grade: s.grade ? String(s.grade) : undefined,
        hometown: s.hometown ? String(s.hometown) : undefined,
        phone: s.phone ? String(s.phone) : undefined,
        dormitory: s.dormitory ? String(s.dormitory) : undefined,
        address: s.address ? String(s.address) : undefined,
        remark: s.remark ? String(s.remark) : undefined,
        college: s.college ? String(s.college) : undefined, // 可选，缺省用导入者学院
      }));

    // 预防重复：本学院/可见范围内批量查重（一次查询替代 N 次 findFirst）
    const { visibleStudentWhere } = await import('../utils/scope');
    const nosToCheck = cleaned.map((s) => s.studentNo).filter(Boolean) as string[];
    const existing = nosToCheck.length > 0
      ? await prisma.student.findMany({ where: { ...visibleStudentWhere(ctxOf(req)), studentNo: { in: nosToCheck } }, select: { studentNo: true } })
      : [];
    const existingSet = new Set(existing.map((s) => s.studentNo));
    const skipNo: string[] = [];
    const toCreate: typeof cleaned = [];
    for (const s of cleaned) {
      if (s.studentNo && existingSet.has(s.studentNo)) {
        skipNo.push(s.studentNo);
      } else {
        toCreate.push(s);
      }
    }

    const created = await studentsService.createStudentsBatch(ctxOf(req), toCreate);
    const skipMsg = skipNo.length > 0 ? `，跳过 ${skipNo.length} 名已存在（学号重复，未覆盖）` : '';
    res.status(201).json({ count: created.length, skipped: skipNo.length, message: `已导入 ${created.length} 名学生${skipMsg}` });
  } catch (err) {
    next(err);
  }
});

export default router;
