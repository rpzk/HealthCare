#!/usr/bin/env tsx
/**
 * Seed completo para produção - carrega todos os fixtures na ordem correta.
 * Idempotente: pula etapas já populadas quando aplicável.
 *
 * Uso:
 *   PRODUCTION_SEED=1 no deploy, ou
 *   npm run db:seed:production
 *
 * Ordem:
 *   1. db:seed (admin + usuários base)
 *   2. db:seed:fixtures (termos, settings)
 *   3. db:seed:all-fixtures (document-templates, ciap2, exams, formulas)
 *   4. fixtures:import:rename (RENAME medicamentos → Medication unificada)
 *   5. fixtures:import (CID, CBO, SIGTAP) - apenas se banco vazio
 */

import 'dotenv/config'
import { execSync } from 'child_process'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error('DATABASE_URL não configurado')

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
  log: ['error'],
})

const ROOT = process.cwd()
const SKIP_HEAVY = process.argv.includes('--skip-heavy')
const FORCE_HEAVY = process.argv.includes('--force-heavy')

function run(cmd: string, label: string): boolean {
  try {
    console.log(`\n▶ ${label}...`)
    execSync(cmd, {
      cwd: ROOT,
      stdio: 'inherit',
      env: { ...process.env, FORCE_COLOR: '1' },
    })
    console.log(`✅ ${label}`)
    return true
  } catch (e) {
    console.error(`❌ ${label} falhou:`, (e as Error).message)
    return false
  }
}

async function isEmptyMasterData(): Promise<boolean> {
  const [occupationCount, medicalCodeCount, diagnosisCount] = await Promise.all([
    prisma.occupation.count(),
    prisma.medicalCode.count(),
    prisma.diagnosis.count(),
  ])
  const empty = occupationCount === 0 && medicalCodeCount === 0 && diagnosisCount === 0
  if (!empty) {
    console.log(
      `   ℹ️  Banco já possui dados (occupations: ${occupationCount}, medicalCodes: ${medicalCodeCount}, diagnoses: ${diagnosisCount})`
    )
  }
  return empty
}

async function main() {
  console.log('\n' + '='.repeat(60))
  console.log('🌱 PRODUCTION SEED - Fixtures e dados mestres')
  console.log('='.repeat(60))

  // 1. Admin e usuários base
  run('npx tsx prisma/seed.ts', '1. Admin e usuários base')

  // 2. Fixtures leves
  run('npm run db:seed:fixtures', '2. Termos e configurações')

  // 2b. Branding (dados da clínica - imprescindível para documentos)
  run('npm run db:seed:branding', '2b. Branding (identidade da clínica)')

  // 3. Fixtures adicionais
  run('npm run db:seed:all-fixtures', '3. Documentos, CIAP2, exames, fórmulas')

  // 4. RENAME (sempre executa - importa direto em Medication)
  run('npm run fixtures:import:rename', '4. RENAME medicamentos (Medication)')

  // 5. CID, CBO, SIGTAP - apenas se banco vazio (evita FK violations)
  if (!SKIP_HEAVY) {
    const empty = await isEmptyMasterData()
    if (empty || FORCE_HEAVY) {
      run('npm run fixtures:import:cid-sql', '5a. CID-10')
      run('npm run fixtures:import:all', '5b. CBO e SIGTAP')
    } else {
      console.log('\n⏭️  CID/CBO/SIGTAP: banco já populado (use --force-heavy para forçar)')
    }
  } else {
    console.log('\n⏭️  CID/CBO/SIGTAP: pulado (--skip-heavy)')
  }

  console.log('\n' + '='.repeat(60))
  console.log('✅ PRODUCTION SEED CONCLUÍDO')
  console.log('='.repeat(60) + '\n')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
