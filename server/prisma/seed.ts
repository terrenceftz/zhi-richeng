import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('123456', 12);

  await prisma.user.upsert({
    where: { email: 'admin@zhi.com' },
    update: { name: '管理员' },
    create: {
      email: 'admin@zhi.com',
      password: hash,
      name: '管理员',
    },
  });

  // Ensure registration is closed
  await prisma.setting.upsert({
    where: { key: 'registration_enabled' },
    update: {},
    create: { key: 'registration_enabled', value: 'false' },
  });

  console.log('Seed: admin@zhi.com / 123456, registration closed');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
