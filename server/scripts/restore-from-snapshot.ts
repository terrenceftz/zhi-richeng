/* eslint-disable */
/**
 * 从 pre-import 快照恢复数据（误导入/导入失败后的兜底工具）。
 *
 * 使用：cd server && npx tsx scripts/restore-from-snapshot.ts [快照文件名]
 * - 不传参数则使用 backups/ 下最近一份 pre-import-*.json
 * - 默认恢复到当前 DATABASE_URL（.env 或环境变量）
 * - 恢复同样在事务内整体替换，先备份当前状态到 backups/pre-import-*.json
 */
process.env.DATABASE_URL = process.env.DATABASE_URL || 'file:./dev.db';
process.env.NODE_ENV = 'test';

import { readFileSync, readdirSync } from 'fs';
import path from 'path';
import prisma from '../src/db';
import { importBundle } from '../src/services/migration.service';

async function main() {
  const backupsDir = path.resolve(process.cwd(), 'backups');
  const files = readdirSync(backupsDir).filter((f) => f.startsWith('pre-import-')).sort();
  if (files.length === 0) {
    console.error('backups/ 下没有 pre-import 快照，无法恢复');
    process.exit(1);
  }
  const name = process.argv[2] || files[files.length - 1];
  if (!files.includes(name)) {
    console.error(`快照不存在：${name}。可用：\n${files.join('\n')}`);
    process.exit(1);
  }
  const bundle = JSON.parse(readFileSync(path.join(backupsDir, name), 'utf-8'));
  console.log('使用快照:', name);
  console.log('导出时间:', bundle.exportedAt);
  const counts = await importBundle(bundle);
  console.log('恢复完成，计数:', JSON.stringify(counts));
  await prisma.$disconnect();
}

main().catch((e) => { console.error('恢复失败:', e); process.exit(1); });
