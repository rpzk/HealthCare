// Seed básico para pipeline CI evitando problemas de quoting ($disconnect)
const { PrismaClient } = require('@prisma/client')

async function main() {
  const prisma = new PrismaClient()
  try {
    await prisma.user.upsert({
      where: { email: 'doctor@example.com' },
      update: {},
      create: { email: 'doctor@example.com', name: 'CI Doctor', role: 'DOCTOR' }
    })
    await prisma.user.upsert({
      where: { email: 'admin@example.com' },
      update: {},
      create: { email: 'admin@example.com', name: 'CI Admin', role: 'ADMIN' }
    })
    console.log('[ci-seed] OK')
  } catch (e) {
    console.error('[ci-seed] FAILED', e)
    process.exitCode = 1
  } finally {
    await prisma.$disconnect()
  }
}

main()
