import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin12@gmail.com';
  const plainPassword = process.env.ADMIN_PASSWORD;

  if (!plainPassword) {
    console.error('ERROR: ADMIN_PASSWORD environment variable is not set.');
    console.error('Please add ADMIN_PASSWORD=YOUR_ADMIN_PASSWORD_HERE to backend/.env');
    process.exit(1);
  }

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
