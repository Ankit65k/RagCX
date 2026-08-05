import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin12@gmail.com';
  const plainPassword = 'Admin@12345678';

  const passwordHash = await bcrypt.hash(plainPassword, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      role: 'ADMIN',
      isActive: true,
    },
    create: {
      email,
      passwordHash,
      role: 'ADMIN',
      isActive: true,
    },
  });

  console.log('ADMIN USER UPSERTED SUCCESSFULLY:', user);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
