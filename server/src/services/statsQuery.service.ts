import prisma from '../db';
import * as statsService from './stats.service';

/**
 * 飞书「人数统计」查询：返回当前账号可见范围内的在读人数统计。
 * 口径与数据看板一致：澳门班不计入总数/境外生（单列），境外生分生源地，休学单列。
 * 返回 null 表示不是统计查询意图。
 */
export async function handleStatsQuery(userId: string, text: string): Promise<string | null> {
  const trimmed = text.trim();
  if (!/^(人数统计|在读人数|统计人数|人数统计表|统计|境外生|生源地|华侨|留学生)/.test(trimmed)) {
    return null;
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, college: true } });
  if (!user) return null;
  const ctx = { userId, role: user.role, college: user.college || '' };

  const [overview, headcount, dist] = await Promise.all([
    statsService.getOverview(ctx),
    statsService.getHeadcountTable(ctx),
    statsService.getStudentDist(ctx),
  ]);
  const last = headcount[headcount.length - 1]; // 学院总计行
  const xueliText = dist.byXueli.map((x) => `${x.label} ${x.count}`).join(' · ');

  const lines = [
    '📊 在读人数统计（不含澳门班）',
    `学生总数 ${overview.studentCount} 人（境内 ${overview.domesticCount} · 境外 ${overview.overseasCount}）`,
    `澳门班 ${overview.aomenClassCount} 人（单列） · 休学 ${overview.suspendedCount} 人`,
    '',
    `境外生来源（合计 ${overview.overseasCount}）：`,
    `中国香港 ${last.hk} ｜ 中国澳门 ${last.macau} ｜ 中国台湾 ${last.taiwan} ｜ 华侨 ${last.huaqiao} ｜ 留学生 ${last.liuxue}`,
    last.countries.length > 0 ? `留学生国家：${last.countries.join('、')}` : '',
    '',
    xueliText ? `学历类别：${xueliText}` : '',
    `台账学生 ${overview.mentalTargetCount} · 谈心记录 ${overview.counselingCount} · 台账跟进记录 ${overview.mentalRecordCount}`,
  ];

  return lines.filter(Boolean).join('\n');
}
