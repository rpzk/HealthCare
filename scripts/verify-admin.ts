#!/usr/bin/env npx tsx
/**
 * Script para verificar status do admin
 * Uso: npx tsx scripts/verify-admin.ts
 */

import { PrismaClient } from '@prisma/client'

async function main() {
  const prisma = new PrismaClient()
  
  try {
    console.log('\n🔍 Verificando status do admin...\n')
    console.log('━'.repeat(70))
    
    // Encontrar admins
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        assignedRoles: {
          select: {
            id: true,
            role: true,
            isPrimary: true,
            assignedAt: true
          }
        }
      }
    })
    
    if (admins.length === 0) {
      console.log('❌ Nenhum admin encontrado no sistema!')
      console.log('   Execute: npx tsx scripts/create-admin.ts')
      return
    }
    
    console.log(`✅ Encontrados ${admins.length} admin(s):\n`)
    
    for (const admin of admins) {
      console.log(`📧 Email: ${admin.email}`)
      console.log(`👤 Nome: ${admin.name}`)
      console.log(`🔑 ID: ${admin.id}`)
      console.log(`✓ Ativo: ${admin.isActive ? '✅ SIM' : '❌ NÃO'}`)
      console.log(`🏷️  Role (User): ${admin.role}`)
      console.log(`📅 Criado em: ${new Date(admin.createdAt).toLocaleString('pt-BR')}`)
      
      if (admin.assignedRoles.length > 0) {
        console.log(`\n   📋 Papéis Atribuídos:`)
        for (const role of admin.assignedRoles) {
          const isPrimaryStr = role.isPrimary ? '⭐ PRIMÁRIO' : 'Secundário'
          console.log(`      • ${role.role} (${isPrimaryStr})`)
        }
      } else {
        console.log(`\n   ⚠️  ❌ SEM PAPÉIS ATRIBUÍDOS! (Este é o problema!)`)
      }
      
      console.log('') // Espaço em branco
    }
    
    console.log('━'.repeat(70))
    console.log('\n🔧 O que fazer:\n')
    console.log('1️⃣  Se o admin está SEM PAPÉIS ATRIBUÍDOS:')
    console.log('   npx tsx scripts/fix-admin-roles.ts\n')
    
    console.log('2️⃣  Depois de corrigir, faça LOGOUT e LOGIN novamente')
    console.log('   (a sessão precisa ser renovada)\n')
    
    console.log('3️⃣  Se ainda não tiver acesso, limpe as cookies:')
    console.log('   F12 → Application → Cookies → Deletar auth.js-session-token\n')
    
  } catch (error: any) {
    console.error('\n❌ Erro:', error.message)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
