import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

async function main() {
  const prisma = new PrismaClient()
  try {
    console.log('🔧 (local) Criando/atualizando admin...')
    const passwordPlain = 'admin123'
    const passwordHash = await bcrypt.hash(passwordPlain, 12)

    const admin = await prisma.user.upsert({
      where: { email: 'admin@healthcare.com' },
      update: {
        name: 'Dr. Admin Sistema',
        role: 'ADMIN',
        password: passwordHash,
        isActive: true
      },
      create: {
        email: 'admin@healthcare.com',
        name: 'Dr. Admin Sistema',
        role: 'ADMIN',
        speciality: 'Administração',
        crmNumber: 'CRM-ADM-001',
        phone: '(11) 99999-9999',
        password: passwordHash
      }
    })

    console.log('✅ Admin pronto:')
    console.log({ email: admin.email, role: admin.role })
  } catch (e:any) {
    console.error('❌ Erro create-admin-local:', e.message)
  } finally {
    await prisma.$disconnect()
  }
}

main()
