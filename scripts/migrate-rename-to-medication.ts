#!/usr/bin/env tsx
/**
 * Migração: RENAMEMedication -> Medication (tabela rename_medications)
 * Execute APÓS a migração que adiciona os novos campos em Medication.
 * Execute ANTES da migração que remove RENAMEMedication.
 *
 * Usa SQL bruto pois o schema pode já não ter o modelo RENAMEMedication.
 *
 * Uso: npx tsx scripts/migrate-rename-to-medication.ts
 */

import 'dotenv/config'
import { PrismaClient, PrescriptionType } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const connectionString = process.env.DATABASE_URL || 'postgresql://healthcare:healthcare123@localhost:5432/healthcare_db'
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter, log: ['error'] })

interface RenameRow {
  id: string
  codigoCATMAT: string
  denominacaoComum: string
  principioAtivo: string
  concentracao: string | null
  formaFarmaceutica: string
  apresentacao: string | null
  componente: string
  via: string | null
  controlado: boolean
  antimicrobiano: boolean
  altoValor: boolean
  usoHospitalar: boolean
  programaEspecifico: string | null
  atenBasica: boolean
  atenEspecializada: boolean
  atenHospitalar: boolean
  farmaciaPopular: boolean
  observacoes: string | null
}

async function main() {
  console.log('🔄 Migrando RENAMEMedication → Medication...\n')

  // Verificar se a tabela existe
  const tableCheck = await pool.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'rename_medications'
    )
  `)
  if (!tableCheck.rows[0]?.exists) {
    console.log('   ⏭️  Tabela rename_medications não existe (já migrado ou instalação nova)')
    return
  }

  const renamesResult = await pool.query<RenameRow>('SELECT * FROM rename_medications')
  const renames = renamesResult.rows
  console.log(`   RENAMEMedication: ${renames.length} registros`)

  const renameIdToMedicationId = new Map<string, string>()
  let created = 0
  let updated = 0

  for (const r of renames) {
    const pt: PrescriptionType = r.controlado
      ? PrescriptionType.CONTROLLED_C1
      : r.antimicrobiano
        ? PrescriptionType.ANTIMICROBIAL
        : PrescriptionType.SIMPLE

    const existing = await prisma.medication.findFirst({
      where: r.codigoCATMAT
        ? { codigoCATMAT: r.codigoCATMAT }
        : { name: { equals: r.denominacaoComum, mode: 'insensitive' } },
    })

    if (existing) {
      await prisma.medication.update({
        where: { id: existing.id },
        data: {
          codigoCATMAT: r.codigoCATMAT,
          synonym: r.principioAtivo,
          strength: r.concentracao,
          form: r.formaFarmaceutica,
          route: r.via,
          prescriptionType: pt,
          basicPharmacy: r.atenBasica,
          popularPharmacy: r.farmaciaPopular,
          hospitalPharmacy: r.atenHospitalar,
          componente: r.componente,
          apresentacao: r.apresentacao,
          controlado: r.controlado,
          antimicrobiano: r.antimicrobiano,
          altoValor: r.altoValor,
          usoHospitalar: r.usoHospitalar,
          programaEspecifico: r.programaEspecifico,
          atenEspecializada: r.atenEspecializada,
          observations: r.observacoes,
        },
      })
      renameIdToMedicationId.set(r.id, existing.id)
      updated++
    } else {
      const med = await prisma.medication.create({
        data: {
          name: r.denominacaoComum,
          synonym: r.principioAtivo,
          strength: r.concentracao,
          form: r.formaFarmaceutica,
          route: r.via,
          prescriptionType: pt,
          basicPharmacy: r.atenBasica,
          popularPharmacy: r.farmaciaPopular,
          hospitalPharmacy: r.atenHospitalar,
          codigoCATMAT: r.codigoCATMAT,
          componente: r.componente,
          apresentacao: r.apresentacao,
          controlado: r.controlado,
          antimicrobiano: r.antimicrobiano,
          altoValor: r.altoValor,
          usoHospitalar: r.usoHospitalar,
          programaEspecifico: r.programaEspecifico,
          atenEspecializada: r.atenEspecializada,
          observations: r.observacoes,
        },
      })
      renameIdToMedicationId.set(r.id, med.id)
      created++
    }
  }

  console.log(`   Medication: ${created} criados, ${updated} atualizados`)

  // Verificar se prescription_items tem renameMedicationId
  const colCheck = await pool.query(`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'prescription_items' AND column_name = 'renameMedicationId'
  `)
  if (colCheck.rows.length === 0) {
    console.log('   PrescriptionItems: coluna renameMedicationId já removida')
  } else {
    const itemsResult = await pool.query<{ id: string; renameMedicationId: string }>(
      'SELECT id, "renameMedicationId" FROM prescription_items WHERE "renameMedicationId" IS NOT NULL'
    )
    for (const item of itemsResult.rows) {
      const medId = renameIdToMedicationId.get(item.renameMedicationId)
      if (medId) {
        await pool.query(
          'UPDATE prescription_items SET "medicationId" = $1, "renameMedicationId" = NULL WHERE id = $2',
          [medId, item.id]
        )
      }
    }
    console.log(`   PrescriptionItems atualizados: ${itemsResult.rows.length}`)
  }

  console.log('\n✅ Migração concluída. Execute a migração que remove RENAMEMedication.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
