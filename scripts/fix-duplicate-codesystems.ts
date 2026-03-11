#!/usr/bin/env tsx
/**
 * Corrige duplicatas de CodeSystem (ex: múltiplos CID-10)
 *
 * 1. Identifica sistemas duplicados (mesmo kind)
 * 2. Mantém o sistema com MAIS códigos (canônico)
 * 3. Migra diagnósticos do sistema menor para o canônico
 * 4. Desativa o sistema duplicado
 *
 * Uso: npx tsx scripts/fix-duplicate-codesystems.ts [--dry-run]
 */

import 'dotenv/config'
import { prisma } from '@/lib/prisma'

const DRY_RUN = process.argv.includes('--dry-run')

async function main() {
  console.log('\n=== CORREÇÃO DE DUPLICATAS - CODE SYSTEMS ===\n')
  if (DRY_RUN) console.log('(Modo dry-run - nenhuma alteração será feita)\n')

  const systems = await prisma.codeSystem.findMany({
    where: { active: true },
    include: { _count: { select: { codes: true } } },
    orderBy: { kind: 'asc' }
  })

  const byKind = new Map<string, typeof systems>()
  for (const s of systems) {
    const list = byKind.get(s.kind) || []
    list.push(s)
    byKind.set(s.kind, list)
  }

  for (const [kind, list] of byKind) {
    if (list.length <= 1) continue

    console.log(`\n📋 ${kind}: ${list.length} sistemas ativos`)
    const sorted = [...list].sort((a, b) => b._count.codes - a._count.codes)
    const canonical = sorted[0]
    const duplicates = sorted.slice(1)

    console.log(`   Canonical (manter): ${canonical.name} v${canonical.version ?? 'null'} - ${canonical._count.codes} códigos`)
    for (const dup of duplicates) {
      const diagCount = await prisma.diagnosis.count({
        where: { primaryCode: { systemId: dup.id } }
      })
      console.log(`   Duplicata (desativar): ${dup.name} v${dup.version ?? 'null'} - ${dup._count.codes} códigos, ${diagCount} diagnósticos`)
    }

    for (const dup of duplicates) {
      const diagnoses = await prisma.diagnosis.findMany({
        where: { primaryCode: { systemId: dup.id } },
        include: { primaryCode: true }
      })

      if (diagnoses.length > 0) {
        console.log(`\n   Migrando ${diagnoses.length} diagnóstico(s) para sistema canônico...`)
        let migrated = 0
        let skipped = 0
        for (const d of diagnoses) {
          const codeStr = d.primaryCode.code
          // 1) Busca exata
          let targetCode = await prisma.medicalCode.findFirst({
            where: { systemId: canonical.id, code: codeStr, active: true }
          })
          // 2) Se não achar, busca por prefixo (ex: J18 -> J18.0)
          if (!targetCode) {
            targetCode = await prisma.medicalCode.findFirst({
              where: {
                systemId: canonical.id,
                code: { startsWith: codeStr + '.' },
                active: true
              },
              orderBy: { code: 'asc' }
            })
          }
          if (targetCode) {
            if (!DRY_RUN) {
              await prisma.diagnosis.update({
                where: { id: d.id },
                data: { primaryCodeId: targetCode.id }
              })
            }
            if (targetCode.code !== codeStr) {
              console.log(`   ↳ ${codeStr} → ${targetCode.code}`)
            }
            migrated++
          } else {
            console.log(`   ⚠️  Código ${codeStr} sem equivalente - diagnóstico ${d.id} órfão`)
            skipped++
          }
        }
        console.log(`   ✓ Migrados: ${migrated} | Sem equivalente: ${skipped}`)
      }

      if (!DRY_RUN) {
        await prisma.codeSystem.update({
          where: { id: dup.id },
          data: { active: false }
        })
        console.log(`   ✓ Sistema ${dup.id} desativado`)
      } else {
        console.log(`   [dry-run] Desativaria sistema ${dup.id}`)
      }
    }
  }

  console.log('\n=== CONCLUÍDO ===\n')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
