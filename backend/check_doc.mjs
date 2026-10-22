import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkDocument() {
  try {
    const doc = await prisma.document.findUnique({
      where: { id: 'fc34876b-4107-4545-952c-4aa2aa239f63' }
    });
    console.log(JSON.stringify(doc, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkDocument();
