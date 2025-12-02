#!/usr/bin/env npx tsx
/**
 * Script para criar usuário administrador inicial
 * 
 * Uso:
 *   npx tsx scripts/setup-admin.ts                    # Gera senha aleatória
 *   npx tsx scripts/setup-admin.ts "MinhaS3nh@Forte"  # Usa senha específica
 */

import { PrismaClient } from '@prisma/client'
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
  const prisma = new PrismaClient()
  
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
    
    // Email do admin
    const email = process.argv[3] || 'admin@healthcare.local'
    
    const admin = await prisma.user.upsert({
      where: { email },
      update: {
        name: 'Administrador do Sistema',
        role: 'ADMIN',
        password: passwordHash,
        isActive: true,
        updatedAt: new Date()
      },
      create: {
        email,
        name: 'Administrador do Sistema',
        role: 'ADMIN',
        speciality: 'Administração',
        phone: '(00) 00000-0000',
        password: passwordHash,
        isActive: true
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
