// Ajuste: usar caminho relativo para executar fora do ambiente Next.js (evita depender de path aliases)
// Import com extensão explícita para compatibilidade ESM quando executado via ts-node/register
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'


async function createAdmin() {
  try {
    console.log('🔧 Criando usuário administrador...')
    
  const hashedPassword = await bcrypt.hash('admin123', 12)
    
    const admin = await prisma.user.upsert({
      where: { email: 'admin@healthcare.com' },
      update: {
        name: 'Dr. Admin Sistema',
        role: 'ADMIN',
        password: hashedPassword
      },
      create: {
        email: 'admin@healthcare.com',
        name: 'Dr. Admin Sistema', 
        role: 'ADMIN',
        speciality: 'Administração',
        crmNumber: 'CRM-ADM-001',
        phone: '(11) 99999-9999',
        password: hashedPassword
      }
    })

    console.log('✅ Usuário admin criado com sucesso!')
    console.log('📧 Email: admin@healthcare.com')
    console.log('🔑 Senha: admin123')
    console.log('👤 Nome:', admin.name)
    console.log('🏥 Papel:', admin.role)

  } catch (error) {
    console.error('❌ Erro ao criar admin:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createAdmin()
