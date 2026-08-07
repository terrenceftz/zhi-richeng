import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('123456', 12);

  // admin@zhi.com / demo@zhi.com 都置为 admin 角色
  await prisma.user.upsert({
    where: { email: 'admin@zhi.com' },
    update: { name: '管理员', role: 'admin' },
    create: {
      email: 'admin@zhi.com',
      password: hash,
      name: '管理员',
      role: 'admin',
    },
  });

  await prisma.user.upsert({
    where: { email: 'demo@zhi.com' },
    update: { role: 'admin' },
    create: {
      email: 'demo@zhi.com',
      password: hash,
      name: '辅导员老师',
      role: 'admin',
    },
  });

  // 第一个注册用户自动成为管理员；这里把已存在的第一个用户也补成 admin
  const firstUser = await prisma.user.findFirst({ orderBy: { createdAt: 'asc' } });
  if (firstUser && firstUser.role !== 'admin') {
    await prisma.user.update({ where: { id: firstUser.id }, data: { role: 'admin' } });
  }

  // 默认关闭注册
  await prisma.setting.upsert({
    where: { key: 'registration_enabled' },
    update: {},
    create: { key: 'registration_enabled', value: 'false' },
  });

  console.log('Seed 完成：admin@zhi.com / demo@zhi.com（密码均 123456，角色 admin），注册默认关闭');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
