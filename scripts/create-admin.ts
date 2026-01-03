/**
 * Script para criar usuário ADMIN
 * Uso: npx tsx scripts/create-admin.ts
 */

import { PrismaClient, Role } from '@prisma/client'
import bcrypt from 'bcryptjs'
import * as readline from 'readline'

const prisma = new PrismaClient()

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function question(prompt: string): Promise<string> {
  return new Promise(resolve => {
    rl.question(prompt, resolve)
  })
}

async function main() {
  console.log('\n🔐 Criar Usuário ADMIN\n')
  console.log('Preencha os dados abaixo:\n')

  const email = await question('📧 Email: ')
  const name = await question('👤 Nome Completo: ')
  const password = await question('🔒 Senha (mínimo 8 caracteres): ')
  const speciality = await question('🏥 Especialidade (ex: Clínica Geral): ')
  const crm = await question('📋 CRM (ex: CRM-SP-123456): ')
  const phone = await question('📱 Telefone (ex: (11) 99999-9999): ')

  // Validações
  if (!email || !name || !password) {
    console.error('❌ Email, nome e senha são obrigatórios!')
    process.exit(1)
  }

  if (password.length < 8) {
    console.error('❌ Senha deve ter no mínimo 8 caracteres!')
    process.exit(1)
  }

  try {
    // Verificar se usuário já existe
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      console.error(`❌ Usuário com email ${email} já existe!`)
      process.exit(1)
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 12)

    // Criar usuário
    const adminUser = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role: Role.ADMIN,
        speciality: speciality || undefined,
        crmNumber: crm || undefined,
        phone: phone || undefined
      }
    })

    // IMPORTANTE: Criar a entrada em UserAssignedRole para que o admin tenha acesso às funções administrativas
    await prisma.userAssignedRole.create({
      data: {
        id: `role_${Math.random().toString(36).substr(2, 9)}`,
        userId: adminUser.id,
        role: Role.ADMIN,
        isPrimary: true,
        assignedAt: new Date()
      }
    })

    console.log('\n✅ ADMIN criado com sucesso!\n')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📊 Dados de Acesso:')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`📧 Email:      ${adminUser.email}`)
    console.log(`🔒 Senha:      ${password} (não compartilhe!)`)
    console.log(`👤 Nome:       ${adminUser.name}`)
    console.log(`🔑 ID:         ${adminUser.id}`)
    console.log(`⚙️  Role:       ${adminUser.role}`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  } catch (error) {
    console.error('❌ Erro ao criar ADMIN:', error)
    process.exit(1)
  } finally {
    rl.close()
    await prisma.$disconnect()
  }
}

main()
