import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('123456', 12);
  const user = await prisma.user.upsert({
    where: { email: 'demo@zhi.com' },
    update: {},
    create: {
      email: 'demo@zhi.com',
      password,
      name: 'Demo用户',
      tasks: {
        create: [
          { title: '产品评审会', priority: 'high', category: '会议', dueDate: new Date('2026-05-22'), dueTime: '15:00', tags: ['工作'], sortOrder: 0 },
          { title: '提交周报', priority: 'medium', category: '资料收集', dueDate: new Date('2026-05-22'), dueTime: '17:00', tags: ['工作'], sortOrder: 1 },
          { title: '整理技术文档', priority: 'low', category: '通用', dueDate: new Date('2026-05-23'), tags: ['学习'], sortOrder: 2 },
          { title: '准备职称申报材料', priority: 'high', category: '资料收集', dueDate: new Date('2026-06-15'), tags: ['重要'], sortOrder: 3 },
          { title: '健身', priority: 'medium', category: '通用', tags: ['生活'], sortOrder: 4 },
        ],
      },
    },
  });
  console.log('Seed complete. Demo user:', user.email);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
