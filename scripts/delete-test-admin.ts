#!/usr/bin/env npx tsx
/**
 * Script para deletar usuário admin de teste
 * Uso: npx tsx scripts/delete-test-admin.ts <email>
 */

import 'dotenv/config'
import { prisma } from '../lib/prisma'

async function main() {
  const email = process.argv[2]
  
  if (!email) {
    console.error('❌ Uso: npx tsx scripts/delete-test-admin.ts <email>')
    process.exit(1)
  }
  
  console.log('\n🗑️  Deletar Usuário Admin\n')
  
  try {
    // Buscar o usuário
    const user = await prisma.user.findUnique({
      where: { email },
      include: { assignedRoles: true }
    })
    
    if (!user) {
      console.log(`❌ Usuário com email "${email}" não encontrado`)
      process.exit(1)
    }
    
    console.log(`👤 Encontrado: ${user.name} (${user.email})`)
    console.log(`🏷️  Role: ${user.role}`)
    console.log(`📊 Roles atribuídas: ${user.assignedRoles.length}\n`)
    
    // Deletar roles atribuídas primeiro
    if (user.assignedRoles.length > 0) {
      await prisma.userAssignedRole.deleteMany({
        where: { userId: user.id }
      })
      console.log(`✅ Deletadas ${user.assignedRoles.length} role(s)`)
    }
    
    // Deletar o usuário
    await prisma.user.delete({
      where: { id: user.id }
    })
    
    console.log('✅ Usuário deletado com sucesso!\n')
    
  } catch (error: any) {
    console.error('❌ Erro ao deletar usuário:', error.message)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
