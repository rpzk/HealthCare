#!/usr/bin/env tsx
/**
 * Script para reset inteligente do banco de dados
 * - Remove dados transacionais (pacientes, consultas, prescrições, etc)
 * - Preserva/restaura dados mestres (CBO, CID, medicações)
 * 
 * Uso: npx tsx scripts/reset-with-seed.ts [--confirm]
 */

import { execSync } from 'child_process'
import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()
const skipConfirm = process.argv.includes('--confirm')

const RED = '\x1b[31m'
const GREEN = '\x1b[32m'
const YELLOW = '\x1b[33m'
const BLUE = '\x1b[34m'
const RESET = '\x1b[0m'

async function promptConfirm(message: string): Promise<boolean> {
  if (skipConfirm) return true

  return new Promise((resolve) => {
    process.stdout.write(`${YELLOW}${message}${RESET} (s/n): `)
    process.stdin.once('data', (data) => {
      resolve(data.toString().trim().toLowerCase() === 's')
    })
  })
}

async function resetWithSeed() {
  try {
    console.log(`\n${BLUE}${'='.repeat(70)}${RESET}`)
    console.log(`${BLUE}🔄 RESET INTELIGENTE DO BANCO DE DADOS${RESET}`)
    console.log(`${BLUE}${'='.repeat(70)}${RESET}`)

    // Step 1: Exportar dados mestres ANTES do reset
    console.log(`\n${BLUE}[PASSO 1/5] Exportando dados mestres...${RESET}`)
    try {
      execSync('npx tsx scripts/export-master-data.ts', { stdio: 'inherit' })
      console.log(`${GREEN}✅ Dados mestres exportados${RESET}`)
    } catch (error) {
      console.error(`${RED}❌ Erro ao exportar dados mestres${RESET}`)
      throw error
    }

    // Step 2: Confirmar reset
    console.log(`\n${RED}⚠️  AVISO IMPORTANTE:${RESET}`)
    console.log(`${YELLOW}  - Serão deletados: Pacientes, Consultas, Prescrições, Exames, Atestados, etc.${RESET}`)
    console.log(`${GREEN}  - Serão preservados: CBO, CID-10, Medicações, Configurações de Sistema${RESET}`)

    const confirmed = await promptConfirm(
      `\n${RED}Tem certeza que deseja continuar?${RESET}`
    )

    if (!confirmed) {
      console.log(`\n${YELLOW}❌ Operação cancelada pelo usuário${RESET}`)
      process.exit(0)
    }

    // Step 3: Reset do Prisma (migrations + seed admin)
    console.log(`\n${BLUE}[PASSO 2/5] Resetando banco de dados...${RESET}`)
    try {
      execSync('npx prisma migrate reset --force --skip-seed', {
        stdio: 'inherit',
      })
      console.log(`${GREEN}✅ Banco resetado${RESET}`)
    } catch (error) {
      console.error(`${RED}❌ Erro ao resetar banco${RESET}`)
      throw error
    }

    // Step 4: Seed padrão (admin)
    console.log(`\n${BLUE}[PASSO 3/5] Criando usuário administrador...${RESET}`)
    try {
      execSync('npx tsx prisma/seed.ts', { stdio: 'inherit' })
      console.log(`${GREEN}✅ Usuário admin criado${RESET}`)
    } catch (error) {
      console.error(`${RED}❌ Erro ao criar admin${RESET}`)
      throw error
    }

    // Step 5: Restaurar dados mestres
    console.log(`\n${BLUE}[PASSO 4/5] Restaurando dados mestres...${RESET}`)
    try {
      execSync('npx tsx prisma/seed-master-data.ts', { stdio: 'inherit' })
      console.log(`${GREEN}✅ Dados mestres restaurados${RESET}`)
    } catch (error) {
      console.error(`${RED}❌ Erro ao restaurar dados mestres${RESET}`)
      throw error
    }

    // Step 6: Verificação final
    console.log(`\n${BLUE}[PASSO 5/5] Verificando integridade...${RESET}`)
    try {
      const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } })
      const occupationCount = await prisma.occupation.count()
      const medicalCodeCount = await prisma.medicalCode.count()
      const medicationCount = await prisma.medication.count()
      const patientCount = await prisma.patient.count()

      console.log(`\n${GREEN}📊 VERIFICAÇÃO FINAL:${RESET}`)
      console.log(`   Usuários Admin:    ${adminCount}`)
      console.log(`   CBO (Ocupações):   ${occupationCount}`)
      console.log(`   Códigos Médicos:   ${medicalCodeCount}`)
      console.log(`   Medicações:        ${medicationCount}`)
      console.log(`   Pacientes:         ${patientCount} (esperado: 0)`)

      if (patientCount > 0) {
        console.warn(`${YELLOW}⚠️  Atenção: Ainda há ${patientCount} pacientes no banco${RESET}`)
      }

      if (adminCount === 0) {
        throw new Error('Admin user não foi criado!')
      }

      if (occupationCount === 0 || medicalCodeCount === 0 || medicationCount === 0) {
        console.warn(
          `${YELLOW}⚠️  Alguns dados mestres podem não ter sido restaurados${RESET}`
        )
      }
    } catch (error) {
      console.error(`${RED}❌ Erro na verificação: ${error}${RESET}`)
      throw error
    }

    // Sucesso!
    console.log(`\n${GREEN}${'='.repeat(70)}${RESET}`)
    console.log(`${GREEN}✅ RESET CONCLUÍDO COM SUCESSO!${RESET}`)
    console.log(`${GREEN}${'='.repeat(70)}${RESET}`)
    console.log(`\n${BLUE}Próximos passos:${RESET}`)
    console.log(`  1. Faça login com: admin@healthcare.com / admin123`)
    console.log(`  2. Vá para /admin/database-reset para ver o histórico`)
    console.log(`  3. Importe dados de pacientes: npm run import:patients -- --file <arquivo.csv>`)

  } catch (error) {
    console.error(`\n${RED}${'='.repeat(70)}${RESET}`)
    console.error(`${RED}❌ ERRO NO RESET${RESET}`)
    console.error(`${RED}${'='.repeat(70)}${RESET}`)
    console.error(`${error}`)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

resetWithSeed()
