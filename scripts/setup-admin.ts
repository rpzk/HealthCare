#!/usr/bin/env npx tsx
/**
 * Script para criar usuário administrador inicial
 * 
 * Uso:
 *   npx tsx scripts/setup-admin.ts
 *   npx tsx scripts/setup-admin.ts "<senha>"
 *   npx tsx scripts/setup-admin.ts "<senha>" "<email>" "<nome>" "<telefone>"
 */

import 'dotenv/config'
import { prisma } from '../lib/prisma'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

function generateSecurePassword(length: number = 16): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%&*'
  let password = ''
  const randomBytes = crypto.randomBytes(length)
  for (let i = 0; i < length; i++) {
    password += chars[randomBytes[i] % chars.length]
  }
  return password
}

async function main() {
  try {
    console.log('\n🏥 HealthCare - Configuração de Administrador\n')
    console.log('━'.repeat(50))
    
    // Verifica se já existe admin
    const existingAdmin = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    })
    
    if (existingAdmin) {
      console.log('⚠️  Já existe um administrador no sistema:')
      console.log(`   Email: ${existingAdmin.email}`)
      console.log(`   Nome:  ${existingAdmin.name}`)
      console.log('')
      
      const readline = await import('readline')
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      })
      
      const answer = await new Promise<string>((resolve) => {
        rl.question('Deseja criar um novo admin? (s/N): ', resolve)
      })
      rl.close()
      
      if (answer.toLowerCase() !== 's') {
        console.log('Operação cancelada.')
        return
      }
    }
    
    // Senha: do argumento ou gerar
    const passwordArg = process.argv[2]
    const password = passwordArg || generateSecurePassword(16)
    const passwordHash = await bcrypt.hash(password, 12)

    const readline = await import('readline')
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })

    const ask = async (question: string) => {
      return await new Promise<string>((resolve) => {
        rl.question(question, resolve)
      })
    }

    // Dados do admin: exigimos dados reais (email/nome) para evitar defaults fictícios
    const emailArg = process.argv[3]
    const nameArg = process.argv[4]
    const phoneArg = process.argv[5]

    const email = (emailArg || (await ask('Email do administrador: '))).trim()
    const name = (nameArg || (await ask('Nome do administrador: '))).trim()
    const phoneInput = (phoneArg || (await ask('Telefone (opcional): '))).trim()
    const phone = phoneInput.length > 0 ? phoneInput : null

    rl.close()

    if (!email) {
      throw new Error('Email do administrador é obrigatório')
    }
    if (!name) {
      throw new Error('Nome do administrador é obrigatório')
    }
    
    const admin = await prisma.user.upsert({
      where: { email },
      update: {
        name,
        role: 'ADMIN',
        password: passwordHash,
        isActive: true,
        phone,
        speciality: null,
        updatedAt: new Date()
      },
      create: {
        email,
        name,
        role: 'ADMIN',
        speciality: null,
        phone,
        password: passwordHash,
        isActive: true
      }
    })

    // IMPORTANTE: Criar ou atualizar a entrada em UserAssignedRole para que o admin tenha acesso às funções administrativas
    await prisma.userAssignedRole.upsert({
      where: {
        userId_role: {
          userId: admin.id,
          role: 'ADMIN'
        }
      },
      update: {
        isPrimary: true,
        assignedAt: new Date()
      },
      create: {
        id: `role_${Math.random().toString(36).substr(2, 9)}`,
        userId: admin.id,
        role: 'ADMIN',
        isPrimary: true,
        assignedAt: new Date()
      }
    })

    console.log('\n✅ Administrador configurado com sucesso!\n')
    console.log('━'.repeat(50))
    console.log('📧 Email:    ' + admin.email)
    console.log('🔑 Senha:    ' + password)
    console.log('👤 Nome:     ' + admin.name)
    console.log('🏷️  Role:     ' + admin.role)
    console.log('━'.repeat(50))
    
    if (!passwordArg) {
      console.log('\n⚠️  IMPORTANTE: Guarde esta senha em local seguro!')
      console.log('   Esta senha foi gerada automaticamente e não será')
      console.log('   exibida novamente.')
    }
    
    console.log('\n🌐 Acesse: ' + (process.env.NEXTAUTH_URL || 'http://localhost:3000'))
    console.log('')
    
  } catch (error: any) {
    console.error('\n❌ Erro ao criar administrador:', error.message)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
