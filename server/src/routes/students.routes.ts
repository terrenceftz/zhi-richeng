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
      studentStatus: (req.query.studentStatus as string) || undefined,
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

// 学生字段配置：读取（任何登录用户）
router.get('/fields', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const fields = await studentsService.getStudentFields();
    res.json({ fields, presets: studentsService.PRESET_STUDENT_FIELDS, builtins: studentsService.BUILTIN_STUDENT_FIELDS });
  } catch (err) {
    next(err);
  }
});

// 学生字段配置：保存（系统管理员/院系管理员）
router.put('/fields', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!['admin', 'dept_admin'].includes(req.userRole || '')) {
      return res.status(403).json({ message: '需要系统管理员或院系管理员权限' });
    }
    const fields = await studentsService.saveStudentFields(req.body?.fields);
    await audit.log(req.userId!, 'settings_update', { detail: `更新学生扩展字段（${fields.length} 个）`, ip: req.ip });
    res.json({ fields });
  } catch (err) {
    next(err);
  }
});

// 花名册 Excel 导出（全量字段，按可见范围）
router.get('/export/excel', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { visibleStudentWhere } = await import('../utils/scope');
    const extraFields = await studentsService.getStudentFields();
    const students = await prisma.student.findMany({
      where: visibleStudentWhere(ctxOf(req)),
      include: { mentalProfile: true },
      orderBy: [{ grade: 'asc' }, { className: 'asc' }],
    });
    const rows = students.map((s) => {
      const p = s.mentalProfile;
      let extras: Record<string, any> = {};
      if (typeof s.extras === 'string') {
        try { extras = JSON.parse(s.extras); } catch { extras = {}; }
      }
      const row: Record<string, any> = {
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
      // 扩展字段列（按字段配置）
      extraFields.forEach((f) => {
        row[f.label] = extras[f.key] != null ? String(extras[f.key]) : '';
      });
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const cols = [
      { wch: 10 }, { wch: 14 }, { wch: 6 }, { wch: 12 }, { wch: 8 },
      { wch: 22 }, { wch: 8 }, { wch: 14 }, { wch: 10 }, { wch: 14 },
      { wch: 12 }, { wch: 24 }, { wch: 8 }, { wch: 8 }, { wch: 20 },
      ...extraFields.map(() => ({ wch: 12 })),
    ];
    ws['!cols'] = cols;
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

// 变更学生状态（在学/休学/不在籍）：所有辅导员可操作本学院学生；不在籍改回仅管理员
router.put('/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.body;
    if (!['active', 'suspended', 'inactive'].includes(status)) {
      return res.status(400).json({ message: '无效的学生状态' });
    }
    const student = await studentsService.setStudentStatus(ctxOf(req), req.params.id, status);
    res.json({ student });
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
        extras: s.extras && typeof s.extras === 'object' ? s.extras : undefined, // 自定义扩展字段
      }));

    // 覆盖更新导入：按学号/证件号匹配已存在学生则覆盖，否则新建
    const result = await studentsService.upsertStudents(ctxOf(req), cleaned);
    const msg = `已导入 ${result.created} 名新增学生，更新 ${result.updated} 名已有学生（按学号/证件号匹配覆盖）`;
    res.status(201).json({ created: result.created, updated: result.updated, message: msg });
  } catch (err) {
    next(err);
  }
});

export default router;
