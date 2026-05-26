import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('123456', 12);

  await prisma.user.upsert({
    where: { email: 'admin@mboker.cn' },
    update: { name: 'Terrende' },
    create: {
      email: 'admin@mboker.cn',
      password: hash,
      name: 'Terrende',
    },
  });

  // Ensure registration is closed
  await prisma.setting.upsert({
    where: { key: 'registration_enabled' },
    update: {},
    create: { key: 'registration_enabled', value: 'false' },
  });

  console.log('Seed: admin@mboker.cn / 123456, registration closed');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
