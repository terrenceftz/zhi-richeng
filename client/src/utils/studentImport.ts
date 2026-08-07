import * as XLSX from 'xlsx';

/** Excel 表头 → 后端字段名的映射（支持中英文多种写法） */
const HEADER_MAP: Record<string, string> = {
  姓名: 'name', name: 'name',
  学号: 'studentNo', 'student no': 'studentNo', studentno: 'studentNo',
  性别: 'gender', gender: 'gender',
  出生日期: 'birthDate', 'birth date': 'birthDate', birthday: 'birthDate',
  学生类型: 'studentType', 'student type': 'studentType', studenttype: 'studentType',
  证件号码: 'idNumber', '证件号': 'idNumber', '身份证': 'idNumber', 'id number': 'idNumber', idnumber: 'idNumber',
  年级: 'grade', grade: 'grade',
  班级: 'className', 'class': 'className', classname: 'className',
  籍贯: 'hometown', hometown: 'hometown',
  手机: 'phone', '手机号': 'phone', 'mobile': 'phone', phone: 'phone',
  宿舍: 'dormitory', dormitory: 'dormitory',
  家庭住址: 'address', 住址: 'address', address: 'address',
  备注: 'remark', remark: 'remark',
};

/** 学生类型中文名 → 后端值 */
function normalizeStudentType(raw: string): string | undefined {
  if (!raw) return undefined;
  const s = String(raw).trim();
  if (s === '境内生' || s === '境内' || s === 'domestic') return 'domestic';
  if (s === '境外生' || s === '境外' || s === 'overseas') return 'overseas';
  return undefined;
}

/** 把 Excel 日期序列号或字符串规整为 YYYY-MM-DD */
function normalizeDate(raw: unknown): string | undefined {
  if (raw == null || raw === '') return undefined;
  if (raw instanceof Date) return raw.toISOString().slice(0, 10);
  const s = String(raw).trim();
  if (!s) return undefined;
  // 形如 2024/1/1 或 2024-01-01
  const m = s.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (m) {
    return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  }
  // Excel 数字序列号（自 1899-12-30 起的天数）
  const n = Number(s);
  if (!isNaN(n) && n > 1000 && n < 100000) {
    const d = new Date(Math.round((n - 25569) * 86400 * 1000));
    return d.toISOString().slice(0, 10);
  }
  return s;
}

export interface ParsedStudent {
  name: string;
  studentNo?: string;
  className?: string;
  gender?: string;
  birthDate?: string;
  studentType?: string;
  idNumber?: string;
  grade?: string;
  hometown?: string;
  phone?: string;
  dormitory?: string;
  address?: string;
  remark?: string;
}

/** 把一行原始对象按表头映射成标准学生对象 */
function mapRow(row: Record<string, unknown>): ParsedStudent | null {
  const out: Partial<Record<string, string>> = {};
  for (const [k, v] of Object.entries(row)) {
    const key = HEADER_MAP[String(k).trim().toLowerCase()] || HEADER_MAP[String(k).trim()];
    if (!key) continue;
    if (v == null || v === '') continue;
    out[key] = String(v).trim();
  }
  const name = out.name;
  if (!name) return null;
  const birthDate = out.birthDate ? normalizeDate(out.birthDate) : undefined;
  const studentType = out.studentType ? normalizeStudentType(out.studentType) : undefined;
  let gender = out.gender;
  if (gender && !['男', '女'].includes(gender)) {
    gender = String(gender).startsWith('男') ? '男' : String(gender).startsWith('女') ? '女' : gender;
  }
  return {
    name,
    studentNo: out.studentNo,
    className: out.className,
    gender,
    birthDate,
    studentType,
    idNumber: out.idNumber,
    grade: out.grade,
    hometown: out.hometown,
    phone: out.phone,
    dormitory: out.dormitory,
    address: out.address,
    remark: out.remark,
  };
}

/** 解析 Excel 文件为标准学生对象数组 */
export async function parseExcelFile(file: File): Promise<ParsedStudent[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array', cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return [];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
  return rows.map(mapRow).filter((r): r is ParsedStudent => r !== null);
}

/** 下载学生导入 Excel 模板 */
export function downloadTemplate(): void {
  const headers = [
    '姓名', '学号', '性别', '出生日期', '学生类型', '证件号码', '年级', '班级', '籍贯', '手机', '宿舍', '家庭住址', '备注',
  ];
  const sample = [
    ['张三', '20240001', '男', '2005-03-15', '境内生', '110101200503151234', '2024级', '计科1班', '福建泉州', '13800000001', '梅苑1-101', '福建省泉州市XX路', ''],
    ['李四', '20240002', '女', '2005-07-20', '境外生', 'P12345678', '2024级', '计科1班', '香港', '13800000002', '梅苑1-102', '香港特别行政区', ''],
  ];
  const aoa = [headers, ...sample];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = headers.map((h) => ({ wch: Math.max(10, h.length * 2 + 4) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '学生花名册');
  XLSX.writeFile(wb, '学生花名册导入模板.xlsx');
}
