import prisma from '../db';

/** 审计动作常量（集中定义便于前端展示） */
export const AUDIT_ACTIONS = {
  login: '登录',
  register: '注册',
  user_create: '后台创建账户',
  student_create: '新增学生',
  student_update: '修改学生',
  student_delete: '删除学生',
  student_import: '导入学生',
  mental_toggle: '台账标记',
  profile_update: '更新台账档案',
  record_create: '新增跟进记录',
  record_update: '修改跟进记录',
  record_delete: '删除跟进记录',
  mental_import: '导入台账',
  counseling_create: '新增谈心',
  counseling_update: '修改谈心',
  counseling_delete: '删除谈心',
  export_roster: '导出花名册',
  export_counseling: '导出谈心汇总',
  export_mental: '导出台账明细',
  export_report: '导出报送表',
  backup_download: '下载备份',
  backup_restore: '恢复备份',
  settings_update: '修改设置',
} as const;

export type AuditAction = keyof typeof AUDIT_ACTIONS;

export interface AuditLogOptions {
  entityType?: string;
  entityId?: string;
  detail?: string;
  ip?: string;
}

/** 记录一条审计日志（失败不阻断主流程） */
export async function log(userId: string, action: AuditAction, opts: AuditLogOptions = {}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entityType: opts.entityType || null,
        entityId: opts.entityId || null,
        detail: opts.detail || null,
        ip: opts.ip || null,
      },
    });
  } catch (err) {
    console.error('[审计] 记录失败:', err);
  }
}

export async function getLogs(
  currentUserId: string,
  opts: { action?: string; userId?: string; page?: number; pageSize?: number } = {}
): Promise<{ logs: any[]; total: number }> {
  // 管理员经 audit.routes 调用：不传 userId 即查看全部（普通用户不会走到此接口）
  const where: any = {};
  if (opts.userId) where.userId = opts.userId;
  if (opts.action) where.action = opts.action;
  const page = opts.page || 1;
  const pageSize = opts.pageSize || 50;
  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);
  return { logs, total };
}

/** 清理 90 天前的审计日志（由 cleanup 服务调用） */
export async function pruneOldLogs(): Promise<void> {
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const result = await prisma.auditLog.deleteMany({ where: { createdAt: { lt: cutoff } } });
  if (result.count > 0) console.log(`[清理] 删除 ${result.count} 条过期审计日志`);
}
