#!/usr/bin/env npx tsx
/**
 * Script para corrigir admins que não têm entrada em UserAssignedRole
 * 
 * Uso:
 *   npx tsx scripts/fix-admin-roles.ts
 */

import { PrismaClient, Role } from '@prisma/client'

async function main() {
  const prisma = new PrismaClient()
  
  try {
    console.log('\n🔧 Corrigindo papéis de ADMIN...\n')
    console.log('━'.repeat(60))
    
    // Encontrar todos os usuários com role ADMIN
    const adminUsers = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true, email: true, name: true }
    })
    
    if (adminUsers.length === 0) {
      console.log('ℹ️  Nenhum admin encontrado no sistema.')
      return
    }
    
    console.log(`✅ Encontrados ${adminUsers.length} admin(s):\n`)
    adminUsers.forEach(admin => {
      console.log(`   📧 ${admin.email}`)
      console.log(`   👤 ${admin.name}`)
      console.log(`   🔑 ${admin.id}`)
      console.log('')
    })
    
    // Para cada admin, verificar se tem entrada em UserAssignedRole
    let fixed = 0
    for (const admin of adminUsers) {
      const existingRole = await prisma.userAssignedRole.findUnique({
        where: {
          userId_role: {
            userId: admin.id,
            role: 'ADMIN'
          }
        }
      })
      
      if (!existingRole) {
        // Criar a entrada
        await prisma.userAssignedRole.create({
          data: {
            id: `role_${Math.random().toString(36).substr(2, 9)}`,
            userId: admin.id,
            role: Role.ADMIN,
            isPrimary: true,
            assignedAt: new Date()
          }
        })
        fixed++
        console.log(`✅ Corrigido: ${admin.email}`)
      } else {
        console.log(`ℹ️  Já possui: ${admin.email}`)
      }
    }
    
    console.log('\n' + '━'.repeat(60))
    console.log(`\n✅ Processo concluído!`)
    console.log(`   📊 Total de admins: ${adminUsers.length}`)
    console.log(`   🔧 Corrigidos: ${fixed}`)
    console.log(`   ℹ️  Já tinham role: ${adminUsers.length - fixed}\n`)
    
  } catch (error: any) {
    console.error('\n❌ Erro ao corrigir papéis:', error.message)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
