// Seed com usuários autenticáveis (admin & doctor) com senha bcrypt
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

async function main(){
  const prisma = new PrismaClient()
  try {
    const passwordHash = await bcrypt.hash('admin123', 10)
    await prisma.user.upsert({
      where: { email: 'admin@healthcare.com' },
      update: { password: passwordHash, role: 'ADMIN', name: 'Admin CI' },
      create: { email: 'admin@healthcare.com', name: 'Admin CI', role: 'ADMIN', password: passwordHash }
    })
    await prisma.user.upsert({
      where: { email: 'doctor@example.com' },
      update: { password: passwordHash, role: 'DOCTOR' },
      create: { email: 'doctor@example.com', name: 'CI Doctor', role: 'DOCTOR', password: passwordHash }
    })
    console.log('[ci-seed-auth] OK')
  } catch(e){
    console.error('[ci-seed-auth] FAILED', e)
    process.exitCode = 1
  } finally {
    await prisma.$disconnect()
  }
}

main()
