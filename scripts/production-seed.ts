#!/usr/bin/env tsx
/**
 * Seed completo para produção - carrega todos os fixtures na ordem correta.
 * Idempotente: pula etapas já populadas quando aplicável.
 *
 * NÃO cria usuários de teste nem pacientes fictícios.
 * Para criar o usuário admin inicial, use: npm run createsuperuser
 *
 * Uso:
 *   npm run db:seed:production         (fixtures completos)
 *   npm run db:seed:production -- --skip-heavy  (pula CID/CBO/SIGTAP)
 *
 * Ordem:
 *   1. db:seed:fixtures (termos, settings)
 *   2. db:seed:branding (identidade visual padrão — editar depois em Configurações)
 *   3. db:seed:all-fixtures (document-templates, ciap2, exams, fórmulas)
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
  console.log('\n⚠️  Usuários NÃO são criados aqui. Após o seed, execute:')
  console.log('   npm run createsuperuser\n')

  // 1. Fixtures leves
  run('npm run db:seed:fixtures', '1. Termos e configurações')

  // 2. Branding (dados da clínica - imprescindível para documentos)
  run('npm run db:seed:branding', '2. Branding (identidade da clínica — editar em Configurações)')

  // 3. Fixtures adicionais
  run('npm run db:seed:all-fixtures', '3. Documentos, CIAP2, exames, fórmulas')

  // 4. RENAME (sempre executa - importa direto em Medication)
  run('npm run fixtures:import:rename', '4. RENAME medicamentos (Medication)')

  // 5. CID, CBO - apenas se banco vazio
  if (!SKIP_HEAVY) {
    const empty = await isEmptyMasterData()
    if (empty || FORCE_HEAVY) {
      run('npm run fixtures:import:cid-sql', '5a. CID-10')
      run('npm run fixtures:import:all', '5b. CBO')
    } else {
      console.log('\n⏭️  CID/CBO: banco já populado (use --force-heavy para forçar)')
    }
  } else {
    console.log('\n⏭️  CID/CBO: pulado (--skip-heavy)')
  }

  // 6. SIGTAP — baixa do DATASUS e importa (pipeline independente)
  if (!SKIP_HEAVY) {
    const sigtapSetting = await prisma.systemSetting
      .findUnique({ where: { key: 'sigtap_competencia' } })
      .catch(() => null)

    if (!sigtapSetting || FORCE_HEAVY) {
      run('npm run sigtap:update', '6. SIGTAP (download + conversão + importação do DATASUS)')
    } else {
      console.log(`\n⏭️  SIGTAP: competência ${sigtapSetting.value} já carregada (use --force-heavy para atualizar)`)
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('✅ PRODUCTION SEED CONCLUÍDO')
  console.log('='.repeat(60))
  console.log('\nPróximo passo: npm run createsuperuser\n')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
