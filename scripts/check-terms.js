// @ts-check
const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  const terms = await prisma.term.findMany();
  console.log('TERMS:', terms);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
