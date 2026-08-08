export type UserRole = 'user' | 'dept_admin' | 'admin';

/** 学生扩展字段配置（后台可增删） */
export interface StudentField {
  key: string;
  label: string;
  type: 'text' | 'select';
  options?: string[];
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  college?: string;
  createdAt: string;
}

/** 角色展示名与徽章配色 */
export const ROLE_LABELS: Record<UserRole, string> = {
  admin: '系统管理员',
  dept_admin: '院系管理员',
  user: '普通用户',
};

export interface Task {
  id: string;
  userId: string;
  title: string;
  description?: string;
  location?: string;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'high' | 'medium' | 'low';
  category?: string;
  dueDate?: string;
  dueTime?: string;
  remind?: boolean;
  tags: string[];
  parentId?: string;
  children?: Task[];
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ParsedTask {
  title: string;
  dueDate: string | null;
  dueTime: string | null;
  priority: 'high' | 'medium' | 'low';
  category?: string;
  location?: string;
  emailTo?: string;
  emailSubject?: string;
  description?: string;
  tags: string[];
}

export interface ExtractResult {
  tasks: ParsedTask[];
  confirmed: false;
}

export interface ApiError {
  status: number;
  message: string;
  code?: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

// ===== 辅导员模块 =====

export interface Student {
  id: string;
  userId: string;
  name: string;
  studentNo?: string;
  className?: string;
  gender?: string;
  birthDate?: string;
  studentType?: 'domestic' | 'overseas' | string;
  idNumber?: string;
  grade?: string;
  hometown?: string;
  phone?: string;
  dormitory?: string;
  address?: string;
  tags: string[];
  remark?: string;
  extras?: Record<string, any>;
  college?: string;
  isMentalTarget?: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { counselings: number; mentalRecords: number };
  counselings?: Counseling[];
  mentalRecords?: MentalRecord[];
  mentalProfile?: MentalProfile;
}

/** 学生类型：境内生 / 境外生 */
export const STUDENT_TYPES = [
  { value: 'domestic', label: '境内生' },
  { value: 'overseas', label: '境外生' },
] as const;

export const STUDENT_TYPE_LABELS: Record<string, string> = {
  domestic: '境内生',
  overseas: '境外生',
};

/** 心理台账记录 */
export interface MentalRecord {
  id: string;
  userId: string;
  studentId: string;
  student?: { id: string; name: string; className?: string; grade?: string };
  date: string;
  level: 'normal' | 'key' | 'crisis' | string;
  status: 'active' | 'closed' | string;
  situation: string;
  action?: string;
  followUp?: string;
  followUpDate?: string;
  createdAt: string;
  updatedAt: string;
}

/** 风险预警项 */
export interface RiskAlert {
  studentId: string;
  name: string;
  studentNo?: string;
  className?: string;
  concernLevel: number;
  daysSince: number;
  threshold: number;
  lastSituation?: string | null;
  isPoverty: boolean;
  categories: string[];
  extraRisk: boolean;
}

/** 心理台账档案（与台账学生一对一） */
export interface MentalProfile {
  id: string;
  studentId: string;
  isPoverty: boolean;
  concernLevel: number; // 1/2/3，3 最高
  categories: string[];
  includedAt?: string;
  includeReason?: string;
  followUpPerson?: string;
  parentInformed: boolean;
  parentPhone?: string;
  remark?: string;
  createdAt: string;
  updatedAt: string;
}

export const MENTAL_CATEGORIES = ['心理健康', '学业预警', '延期毕业', '重大疾病', '政治安全', '其他关注'] as const;

export const MENTAL_LEVELS = [
  { value: 'normal', label: '一般关注', tone: 'amber' as const },
  { value: 'key', label: '重点关注', tone: 'red' as const },
  { value: 'crisis', label: '危机', tone: 'red' as const },
];

export const MENTAL_LEVEL_LABELS: Record<string, string> = {
  normal: '一般关注',
  key: '重点关注',
  crisis: '危机',
};

export const MENTAL_STATUS_LABELS: Record<string, string> = {
  active: '关注中',
  closed: '已结案',
};

export const CONCERN_LEVEL_LABELS: Record<number, string> = {
  1: '一级',
  2: '二级',
  3: '三级',
};

export interface Counseling {
  id: string;
  userId: string;
  studentId: string;
  student?: { id: string; name: string; className?: string | null; isMentalTarget?: boolean };
  date: string;
  type: string; // 日常/学业/心理/违纪/就业
  content: string;
  followUp?: string;
  createdAt: string;
}

export interface MaterialItem {
  name: string;
  required: boolean;
  submitted: boolean;
  note?: string;
}

export interface Notice {
  id: string;
  userId: string;
  title: string;
  source?: string;
  deadline?: string;
  materials: MaterialItem[];
  status: 'pending' | 'in_progress' | 'done';
  taskId?: string;
  createdAt: string;
  updatedAt: string;
}

// ===== 标签 & 配色 =====

export const CATEGORY_LABELS: Record<string, string> = {
  '资料收集': '资料收集',
  '审核': '审核',
  '会议': '会议',
  '通用': '通用',
};

/** 优先级配色（统一为 indigo / amber / sky 体系，深浅模式通用） */
export const PRIORITY_COLORS: Record<string, string> = {
  high: '#ef4444', // red-500
  medium: '#f59e0b', // amber-500
  low: '#0ea5e9', // sky-500
};

export const PRIORITY_LABELS: Record<string, string> = {
  high: '高',
  medium: '中',
  low: '低',
};

export const STATUS_LABELS: Record<string, string> = {
  todo: '待办',
  in_progress: '进行中',
  done: '完成',
};

export const NOTICE_STATUS_LABELS: Record<string, string> = {
  pending: '待处理',
  in_progress: '进行中',
  done: '已完成',
};

export const COUNSELING_TYPES = ['日常', '学业', '心理', '违纪', '就业'] as const;

/** 判断任务是否逾期：截止日期/时间已过且未完成 */
export function isOverdue(task: { dueDate?: string; dueTime?: string; status: string }): boolean {
  if (task.status === 'done' || !task.dueDate) return false;
  const now = new Date();
  const due = new Date(task.dueDate);
  if (task.dueTime) {
    const [h, m] = task.dueTime.split(':').map(Number);
    due.setHours(h, m, 0, 0);
  } else {
    // 无具体时间，按整天判断（次日起算逾期）
    due.setDate(due.getDate() + 1);
  }
  return due.getTime() < now.getTime();
}
