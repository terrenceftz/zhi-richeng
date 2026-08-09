import fs from 'fs';
import path from 'path';
import prisma from '../db';

/** 迁移文件标识与版本：结构变更时递增 formatVersion，导入端校验 */
export const MIGRATION_APP = 'zhi-richeng';
export const MIGRATION_VERSION = 1;

const BACKUPS_DIR = path.resolve(process.cwd(), 'backups');

function badRequest(msg: string) {
  return Object.assign(new Error(msg), { statusCode: 400 });
}

/** 轻量字段校验：缺失必填字段即拒绝（避免脏数据入库；外键/唯一冲突由事务回滚兜底） */
function req(v: any, name: string): string {
  if (typeof v !== 'string' || !v.trim()) {
    throw badRequest(`迁移文件格式错误：缺少必填字段「${name}」`);
  }
  return v;
}

function assertArray(v: any, name: string): any[] {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v)) throw badRequest(`迁移文件格式错误：「${name}」应为数组`);
  return v;
}

/**
 * 导出全部可迁移数据为版本化 bundle。
 * 包含设置（含飞书/DeepSeek/IM 凭据等敏感项）、账号（bcrypt 密码哈希）、学生、台账、谈心、日程、通知、灵感、周期提醒。
 * 不含：RefreshToken（会话一次性哈希）、AuditLog（运维日志）、ReminderLog（去重标记，可重建）。
 */
export async function exportBundle(): Promise<{ bundle: any; counts: Record<string, number> }> {
  const [
    settings, users, students, mentalProfiles, mentalRecords, counselings,
    tasks, notices, ideas, recurringReminders,
  ] = await Promise.all([
    prisma.setting.findMany({ orderBy: { key: 'asc' } }),
    prisma.user.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.student.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.mentalProfile.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.mentalRecord.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.counseling.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.task.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.notice.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.idea.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.recurringReminder.findMany({ orderBy: { createdAt: 'asc' } }),
  ]);

  const counts: Record<string, number> = {
    settings: settings.length,
    users: users.length,
    students: students.length,
    mentalProfiles: mentalProfiles.length,
    mentalRecords: mentalRecords.length,
    counselings: counselings.length,
    tasks: tasks.length,
    notices: notices.length,
    ideas: ideas.length,
    recurringReminders: recurringReminders.length,
  };

  const bundle = {
    app: MIGRATION_APP,
    formatVersion: MIGRATION_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      settings,
      users,
      students,
      mentalProfiles,
      mentalRecords,
      counselings,
      tasks,
      notices,
      ideas,
      recurringReminders,
    },
  };
  return { bundle, counts };
}

/** 任务含自引用 parentId：按层级排序，保证父任务先于子任务创建 */
function orderTasks(tasks: any[]): any[] {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const depth = new Map<string, number>();
  const calc = (t: any): number => {
    const cached = depth.get(t.id);
    if (cached !== undefined) return cached;
    let d = 0;
    if (t.parentId && byId.has(t.parentId)) {
      d = calc(byId.get(t.parentId)) + 1;
    }
    depth.set(t.id, d);
    return d;
  };
  tasks.forEach(calc);
  return [...tasks].sort((a, b) => (depth.get(a.id) ?? 0) - (depth.get(b.id) ?? 0));
}

/**
 * 导入迁移 bundle：校验通过后在单个事务内整体替换（先清空再按原 ID 重建，外键关系不丢失），失败自动回滚。
 * 导入前 best-effort 在 backups/ 写入当前全量快照作为安全网。
 */
export async function importBundle(raw: any): Promise<Record<string, number>> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw badRequest('迁移文件格式错误：内容不是有效 JSON 对象');
  }
  if (raw.app !== MIGRATION_APP) {
    throw badRequest('不是本系统的迁移文件（app 标识不匹配）');
  }
  if (raw.formatVersion !== MIGRATION_VERSION) {
    throw badRequest(`不支持的迁移版本：${raw.formatVersion}（当前支持 v${MIGRATION_VERSION}）`);
  }
  const data = raw.data || {};
  if (!data || typeof data !== 'object') {
    throw badRequest('迁移文件格式错误：缺少 data 对象');
  }

  const settings = assertArray(data.settings, 'settings');
  const users = assertArray(data.users, 'users');
  const students = assertArray(data.students, 'students');
  const mentalProfiles = assertArray(data.mentalProfiles, 'mentalProfiles');
  const mentalRecords = assertArray(data.mentalRecords, 'mentalRecords');
  const counselings = assertArray(data.counselings, 'counselings');
  const tasks = assertArray(data.tasks, 'tasks');
  const notices = assertArray(data.notices, 'notices');
  const ideas = assertArray(data.ideas, 'ideas');
  const recurringReminders = assertArray(data.recurringReminders, 'recurringReminders');

  // 基础字段校验
  for (const s of settings) req(s.key, 'settings.key');
  for (const u of users) { req(u.id, 'users.id'); req(u.email, 'users.email'); req(u.name, 'users.name'); req(u.password, 'users.password'); }
  for (const s of students) { req(s.id, 'students.id'); req(s.userId, 'students.userId'); req(s.name, 'students.name'); }
  for (const p of mentalProfiles) { req(p.id, 'mentalProfiles.id'); req(p.userId, 'mentalProfiles.userId'); req(p.studentId, 'mentalProfiles.studentId'); }
  for (const r of mentalRecords) { req(r.id, 'mentalRecords.id'); req(r.userId, 'mentalRecords.userId'); req(r.studentId, 'mentalRecords.studentId'); req(r.situation, 'mentalRecords.situation'); }
  for (const c of counselings) { req(c.id, 'counselings.id'); req(c.userId, 'counselings.userId'); req(c.studentId, 'counselings.studentId'); req(c.content, 'counselings.content'); }
  for (const t of tasks) { req(t.id, 'tasks.id'); req(t.userId, 'tasks.userId'); req(t.title, 'tasks.title'); }
  for (const n of notices) { req(n.id, 'notices.id'); req(n.userId, 'notices.userId'); req(n.title, 'notices.title'); }
  for (const i of ideas) { req(i.id, 'ideas.id'); req(i.userId, 'ideas.userId'); req(i.content, 'ideas.content'); }
  for (const r of recurringReminders) { req(r.id, 'recurringReminders.id'); req(r.title, 'recurringReminders.title'); }

  // 导入前快照（安全网：若误导入可基于快照恢复）
  try {
    const snapshot = await exportBundle();
    if (!fs.existsSync(BACKUPS_DIR)) fs.mkdirSync(BACKUPS_DIR, { recursive: true });
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    fs.writeFileSync(path.join(BACKUPS_DIR, `pre-import-${ts}.json`), JSON.stringify(snapshot.bundle));
  } catch (e) {
    console.error('[迁移] 导入前快照失败（不影响导入）:', e);
  }

  const counts: Record<string, number> = {
    settings: settings.length,
    users: users.length,
    students: students.length,
    mentalProfiles: mentalProfiles.length,
    mentalRecords: mentalRecords.length,
    counselings: counselings.length,
    tasks: tasks.length,
    notices: notices.length,
    ideas: ideas.length,
    recurringReminders: recurringReminders.length,
  };

  // 子任务必须先于父任务插入（SQLite 启用外键约束）
  const orderedTasks = orderTasks(tasks);

  try {
    await prisma.$transaction(
      async (tx) => {
        // 清空（先子表后父表；用户删除会级联删除其名下业务数据，此处显式清理保证顺序可控）
        await tx.reminderLog.deleteMany();
        await tx.counseling.deleteMany();
        await tx.mentalRecord.deleteMany();
        await tx.mentalProfile.deleteMany();
        await tx.notice.deleteMany();
        await tx.task.deleteMany();
        await tx.idea.deleteMany();
        await tx.student.deleteMany();
        await tx.refreshToken.deleteMany();
        await tx.user.deleteMany();
        await tx.recurringReminder.deleteMany();
        await tx.setting.deleteMany();

        // 重建（先父表后子表，保留原 ID 维持外键关系）
        for (const s of settings) {
          await tx.setting.create({ data: { id: s.id, key: s.key, value: s.value, updatedAt: s.updatedAt } });
        }
        for (const u of users) {
          await tx.user.create({
            data: {
              id: u.id, email: u.email, password: u.password, name: u.name,
              role: u.role || 'user', college: u.college || '',
              createdAt: u.createdAt, updatedAt: u.updatedAt,
            },
          });
        }
        for (const s of students) {
          await tx.student.create({
            data: {
              id: s.id, userId: s.userId, name: s.name, studentNo: s.studentNo ?? null,
              className: s.className ?? null, gender: s.gender ?? null, birthDate: s.birthDate ?? null,
              studentType: s.studentType ?? null, idNumber: s.idNumber ?? null, grade: s.grade ?? null,
              hometown: s.hometown ?? null, phone: s.phone ?? null, dormitory: s.dormitory ?? null,
              address: s.address ?? null, tags: s.tags ?? '[]', remark: s.remark ?? null,
              extras: s.extras ?? '{}', college: s.college ?? '', studentStatus: s.studentStatus || 'active',
              isMentalTarget: s.isMentalTarget ?? false, createdAt: s.createdAt, updatedAt: s.updatedAt,
            },
          });
        }
        for (const p of mentalProfiles) {
          await tx.mentalProfile.create({
            data: {
              id: p.id, userId: p.userId, studentId: p.studentId,
              isPoverty: p.isPoverty ?? false, concernLevel: p.concernLevel ?? 1,
              categories: p.categories ?? '[]', includedAt: p.includedAt ?? null,
              includeReason: p.includeReason ?? null, followUpPerson: p.followUpPerson ?? null,
              parentInformed: p.parentInformed ?? false, parentPhone: p.parentPhone ?? null,
              remark: p.remark ?? null, createdAt: p.createdAt, updatedAt: p.updatedAt,
            },
          });
        }
        for (const r of mentalRecords) {
          await tx.mentalRecord.create({
            data: {
              id: r.id, userId: r.userId, studentId: r.studentId, date: r.date,
              level: r.level || 'normal', status: r.status || 'active',
              situation: r.situation, action: r.action ?? null, followUp: r.followUp ?? null,
              followUpDate: r.followUpDate ?? null, createdAt: r.createdAt, updatedAt: r.updatedAt,
            },
          });
        }
        for (const c of counselings) {
          await tx.counseling.create({
            data: {
              id: c.id, userId: c.userId, studentId: c.studentId, date: c.date,
              type: c.type || '日常', content: c.content, followUp: c.followUp ?? null,
              createdAt: c.createdAt,
            },
          });
        }
        for (const t of orderedTasks) {
          await tx.task.create({
            data: {
              id: t.id, userId: t.userId, title: t.title, description: t.description ?? null,
              location: t.location ?? null, status: t.status || 'todo', priority: t.priority || 'medium',
              category: t.category ?? null, dueDate: t.dueDate ?? null, dueTime: t.dueTime ?? null,
              remind: t.remind ?? true, tags: t.tags ?? '[]', parentId: t.parentId ?? null,
              sortOrder: t.sortOrder ?? 0, createdAt: t.createdAt, updatedAt: t.updatedAt,
            },
          });
        }
        for (const n of notices) {
          await tx.notice.create({
            data: {
              id: n.id, userId: n.userId, title: n.title, source: n.source ?? null,
              deadline: n.deadline ?? null, materials: n.materials ?? '[]', status: n.status || 'pending',
              taskId: n.taskId ?? null, createdAt: n.createdAt, updatedAt: n.updatedAt,
            },
          });
        }
        for (const i of ideas) {
          await tx.idea.create({
            data: { id: i.id, userId: i.userId, content: i.content, source: i.source || 'web', createdAt: i.createdAt },
          });
        }
        for (const r of recurringReminders) {
          await tx.recurringReminder.create({
            data: {
              id: r.id, title: r.title, cycleType: r.cycleType || 'monthly', time: r.time || '09:00',
              weekdays: r.weekdays ?? null, dayOfMonth: r.dayOfMonth ?? null, content: r.content ?? null,
              contentType: r.contentType || 'text', enabled: r.enabled ?? true, builtin: r.builtin ?? false,
              createdAt: r.createdAt, updatedAt: r.updatedAt,
            },
          });
        }
      },
      // 交互式事务默认 5s 超时，全量迁移可能更大，放宽上限
      { maxWait: 30_000, timeout: 180_000 }
    );
  } catch (e: any) {
    console.error('[迁移] 导入失败，事务已回滚:', e);
    if (e?.code) {
      throw badRequest(`导入失败，已回滚，数据未发生变更。${e?.meta?.target ? `（冲突字段：${e.meta.target}）` : '请检查迁移文件是否被篡改或包含非法数据'}`);
    }
    throw e;
  }

  return counts;
}
