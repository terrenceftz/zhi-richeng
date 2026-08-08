/**
 * 学院共享数据范围工具
 *
 * 规则：
 * - admin：全部数据
 * - dept_admin（院系管理员）：本学院全部数据（学生/记录），可增删改
 * - 普通用户（辅导员）：自己创建的学生 + 本学院全部学生；记录本学院可见；
 *   学生/记录的编辑删除仅限自己创建的（dept_admin 可管理本学院）
 * - 无学院（college 为空）：行为与旧版一致，仅见自己创建的数据
 */

export interface UserCtx {
  userId?: string;
  role?: string;
  college?: string;
}

export function isAdmin(role?: string): boolean {
  return role === 'admin';
}

/** 当前用户可见学生的 where 条件（Prisma where） */
export function visibleStudentWhere(ctx: UserCtx): any {
  if (isAdmin(ctx.role)) return {};
  if (!ctx.college) return { userId: ctx.userId };
  return {
    OR: [{ userId: ctx.userId }, { college: ctx.college }],
  };
}

/** 当前用户对某学生的管理权限（编辑/删除学生） */
export function canManageStudent(ctx: UserCtx, student: { userId: string; college?: string | null }): boolean {
  if (isAdmin(ctx.role)) return true;
  if (ctx.role === 'dept_admin') return !!ctx.college && student.college === ctx.college;
  return student.userId === ctx.userId;
}

/** 当前用户对某条记录（跟进/谈心）的管理权限（编辑/删除） */
export function canManageRecord(ctx: UserCtx, record: { userId: string }): boolean {
  if (isAdmin(ctx.role)) return true;
  if (ctx.role === 'dept_admin') return true; // 本学院记录由查询层按学院过滤，dept_admin 可管理本学院
  return record.userId === ctx.userId;
}
