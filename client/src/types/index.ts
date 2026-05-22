export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface Task {
  id: string;
  userId: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'high' | 'medium' | 'low';
  category?: string;
  dueDate?: string;
  dueTime?: string;
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

export const CATEGORY_LABELS: Record<string, string> = {
  '资料收集': '资料收集',
  '审核': '审核',
  '会议': '会议',
  '通用': '通用',
};

export const PRIORITY_COLORS: Record<string, string> = {
  high: '#f7768e',
  medium: '#e2b714',
  low: '#7aa2f7',
};

export const STATUS_LABELS: Record<string, string> = {
  todo: '待办',
  in_progress: '进行中',
  done: '完成',
};
