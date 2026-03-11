#!/usr/bin/env tsx
/**
 * Verifica dados cruciais no banco (CID-10, CIAP2, etc.)
 * Uso: npx tsx scripts/check-crucial-data.ts
 */

import 'dotenv/config'
import { prisma } from '@/lib/prisma'

async function main() {
  console.log('\n=== VERIFICAÇÃO DE DADOS CRUCIAIS ===\n')

  // 1. Code Systems
  const systems = await prisma.codeSystem.findMany({
    select: { id: true, kind: true, name: true, version: true, active: true },
    orderBy: { updatedAt: 'desc' }
  })
  const activeSystems = systems.filter((s) => s.active)
  console.log('📋 CODE_SYSTEMS:', systems.length, `(${activeSystems.length} ativos)`)
  if (activeSystems.length === 0) {
    console.log('   ⚠️  NENHUM sistema ativo!')
  } else {
    const activeCid = activeSystems.filter((s) => s.kind === 'CID10')
    if (activeCid.length > 1) {
      console.log('   ⚠️  Múltiplos CID10 ativos! Execute: npm run fix:duplicate-codesystems')
    }
    for (const s of systems) {
      const count = await prisma.medicalCode.count({
        where: { systemId: s.id, active: true }
      })
      const status = s.active ? '' : ' [desativado]'
      console.log(`   - ${s.kind} v${s.version ?? 'null'} (${s.name}): ${count} códigos${status}`)
    }
  }

  // 2. CID-10 específico
  const cidSystem = await prisma.codeSystem.findFirst({
    where: {
      OR: [{ kind: 'CID10' }, { name: { contains: 'CID', mode: 'insensitive' } }]
    }
  })
  if (cidSystem) {
    const cidCount = await prisma.medicalCode.count({
      where: { systemId: cidSystem.id, active: true }
    })
    const z00 = await prisma.medicalCode.findFirst({
      where: { systemId: cidSystem.id, code: { startsWith: 'Z00' } }
    })
    console.log('\n📋 CID-10:', cidCount, 'códigos')
    if (cidCount === 0) {
      console.log('   ⚠️  CATÁLOGO CID-10 VAZIO! Execute import de CID-10.')
    } else if (!z00) {
      console.log('   ⚠️  Código Z00 não encontrado (exemplo comum)')
    } else {
      console.log('   ✓ Z00 encontrado:', z00.display?.slice(0, 50) + '...')
    }
  } else {
    console.log('\n📋 CID-10: ⚠️  SISTEMA NÃO CADASTRADO')
  }

  // 3. CIAP2 (tabela ciap2)
  const ciap2Count = await prisma.cIAP2.count({ where: { active: true } })
  console.log('\n📋 CIAP-2 (tabela ciap2):', ciap2Count, 'códigos')
  if (ciap2Count === 0) {
    console.log('   ⚠️  CATÁLOGO CIAP-2 VAZIO! Execute: npm run db:seed:ciap2')
  } else {
    const sample = await prisma.cIAP2.findFirst({ where: { active: true } })
    console.log('   ✓ Exemplo:', sample?.code, '-', sample?.description?.slice(0, 40) + '...')
  }

  // 4. Catálogo de exames
  const examCatalogCount = await prisma.examCatalog.count({ where: { active: true } })
  console.log('\n📋 Catálogo de exames:', examCatalogCount)
  if (examCatalogCount === 0) {
    console.log('   ⚠️  Catálogo de exames vazio')
  }

  // 5. Usuários e pacientes
  const userCount = await prisma.user.count()
  const patientCount = await prisma.patient.count()
  console.log('\n📋 Usuários:', userCount, '| Pacientes:', patientCount)

  console.log('\n=== FIM ===\n')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
