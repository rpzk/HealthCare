#!/usr/bin/env npx tsx
/**
 * Script para investigar por que o admin não está sendo reconhecido
 * Uso: npx tsx scripts/debug-admin-issue.ts
 */

import { PrismaClient } from '@prisma/client'

async function main() {
  const prisma = new PrismaClient()
  
  try {
    console.log('\n🔍 INVESTIGAÇÃO DETALHADA DO ADMIN\n')
    console.log('═'.repeat(80))
    
    // 1. Verificar usuário admin
    const admin = await prisma.user.findFirst({
      where: { email: 'admin@healthcare.com' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
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
    
    console.log('\n1️⃣  DADOS DO USUÁRIO (table: users)')
    console.log('─'.repeat(80))
    if (admin) {
      console.log(`   Email: ${admin.email}`)
      console.log(`   Nome: ${admin.name}`)
      console.log(`   ID: ${admin.id}`)
      console.log(`   Role (campo legado): ${admin.role}`)
      console.log(`   Ativo: ${admin.isActive ? '✅' : '❌'}`)
      console.log(`   Criado em: ${new Date(admin.createdAt).toLocaleString('pt-BR')}`)
      console.log(`   Atualizado em: ${new Date(admin.updatedAt).toLocaleString('pt-BR')}`)
    } else {
      console.log('   ❌ NENHUM ADMIN ENCONTRADO COM EMAIL admin@healthcare.com')
    }
    
    // 2. Verificar papéis atribuídos
    console.log('\n2️⃣  PAPÉIS ATRIBUÍDOS (table: user_assigned_roles)')
    console.log('─'.repeat(80))
    if (admin && admin.assignedRoles.length > 0) {
      for (const role of admin.assignedRoles) {
        const primStr = role.isPrimary ? '⭐ PRIMÁRIO' : '   Secundário'
        console.log(`   ${primStr}: ${role.role}`)
        console.log(`      ID: ${role.id}`)
        console.log(`      Atribuído em: ${new Date(role.assignedAt).toLocaleString('pt-BR')}`)
      }
    } else {
      console.log('   ⚠️  NENHUM PAPEL ATRIBUÍDO!')
    }
    
    // 3. Verificar se há outro usuário com role DOCTOR
    console.log('\n3️⃣  PROCURAR OUTROS USUÁRIOS COM ROLE ADMIN OU DOCTOR')
    console.log('─'.repeat(80))
    const allAdmins = await prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'DOCTOR'] } },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        assignedRoles: {
          select: { role: true, isPrimary: true }
        }
      }
    })
    
    if (allAdmins.length === 0) {
      console.log('   ❌ Nenhum usuário ADMIN ou DOCTOR encontrado!')
    } else {
      for (const user of allAdmins) {
        const rolesStr = user.assignedRoles.length > 0 
          ? user.assignedRoles.map(r => `${r.role}${r.isPrimary ? '*' : ''}`).join(', ')
          : '(nenhum)'
        console.log(`   📧 ${user.email}`)
        console.log(`      Role User: ${user.role}`)
        console.log(`      Papéis Atribuídos: ${rolesStr}`)
        console.log('')
      }
    }
    
    // 4. Checklist de diagnóstico
    console.log('\n4️⃣  CHECKLIST DE DIAGNÓSTICO')
    console.log('─'.repeat(80))
    
    const checks = [
      { name: 'Admin existe', ok: !!admin },
      { name: 'Email correto', ok: admin?.email === 'admin@healthcare.com' },
      { name: 'Role = ADMIN', ok: admin?.role === 'ADMIN' },
      { name: 'Usuário ativo', ok: admin?.isActive },
      { name: 'Tem papéis atribuídos', ok: (admin?.assignedRoles?.length ?? 0) > 0 },
      { name: 'Tem ADMIN na lista de papéis', ok: admin?.assignedRoles?.some(r => r.role === 'ADMIN') },
      { name: 'Tem ADMIN como primário', ok: admin?.assignedRoles?.some(r => r.role === 'ADMIN' && r.isPrimary) }
    ]
    
    for (const check of checks) {
      const symbol = check.ok ? '✅' : '❌'
      console.log(`   ${symbol} ${check.name}`)
    }
    
    // 5. Recomendação
    console.log('\n5️⃣  RECOMENDAÇÃO')
    console.log('─'.repeat(80))
    
    if (!admin) {
      console.log('   ⚠️  Admin não existe! Execute:')
      console.log('      npx tsx scripts/create-admin.ts')
    } else if ((admin.assignedRoles?.length ?? 0) === 0) {
      console.log('   ⚠️  Admin existe mas não tem papéis! Execute:')
      console.log('      npx tsx scripts/fix-admin-roles.ts')
    } else if (admin.role !== 'ADMIN') {
      console.log('   ⚠️  Campo role do User está errado! Atualizando...')
      // Atualizar o campo role
      await prisma.user.update({
        where: { id: admin.id },
        data: { role: 'ADMIN' }
      })
      console.log('   ✅ Campo role atualizado para ADMIN')
    } else {
      console.log('   ✅ Tudo parece estar correto no banco de dados!')
      console.log('   💡 O problema pode ser:')
      console.log('      1. Cache da sessão no navegador/servidor')
      console.log('      2. Aplicação precisa ser reiniciada')
      console.log('      3. Fazer logout + login para renovar a sessão')
    }
    
    console.log('\n' + '═'.repeat(80) + '\n')
    
  } catch (error: any) {
    console.error('\n❌ Erro:', error.message)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
