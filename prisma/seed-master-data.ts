#!/usr/bin/env tsx
/**
 * Script para restaurar dados mestres (CBO, Códigos Médicos, medicações) a partir de export
 * Usado após reset do banco de dados
 * 
 * Uso: npx tsx prisma/seed-master-data.ts [--file ./uploads/fixtures/master-data-latest.json]
 */

import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

interface MasterDataExport {
  exportedAt: string
  statistics: {
    occupations: number
    medicalCodes: number
    medications: number
  }
  data: {
    occupations: any[]
    medicalCodes: any[]
    medications: any[]
  }
}

async function seedMasterData(filepath: string = './uploads/fixtures/master-data-latest.json') {
  try {
    console.log('📊 Iniciando restauração de dados mestres...')

    // Verificar se arquivo existe
    if (!fs.existsSync(filepath)) {
      console.warn(`⚠️  Arquivo não encontrado: ${filepath}`)
      console.log('   Procurando arquivo mais recente...')
      
      const fixturesDir = path.dirname(filepath)
      if (!fs.existsSync(fixturesDir)) {
        console.log('❌ Diretório de fixtures não existe. Abortando.')
        return
      }

      const files = fs.readdirSync(fixturesDir)
        .filter(f => f.startsWith('master-data-') && f.endsWith('.json'))
        .sort()
        .reverse()

      if (!files.length) {
        console.log('❌ Nenhum arquivo de exportação encontrado.')
        console.log('   Execute primeiro: npm run export:master-data')
        return
      }

      const newestFile = files[0]
      filepath = path.join(fixturesDir, newestFile)
      console.log(`✅ Usando arquivo: ${filepath}`)
    }

    // Ler arquivo
    const fileContent = fs.readFileSync(filepath, 'utf-8')
    const exportData: MasterDataExport = JSON.parse(fileContent)

    console.log('\n📋 Dados a restaurar:')
    console.log(`   CBO (Ocupações):      ${exportData.statistics.occupations}`)
    console.log(`   Códigos Médicos:      ${exportData.statistics.medicalCodes}`)
    console.log(`   Medicações:           ${exportData.statistics.medications}`)

    // 1. Restaurar CBO (Ocupações)
    if (exportData.data.occupations?.length > 0) {
      console.log('\n📋 Restaurando CBO...')
      for (const occ of exportData.data.occupations) {
        await prisma.occupation.upsert({
          where: { code: occ.code },
          update: {
            title: occ.title,
            description: occ.description,
            synonyms: occ.synonyms,
            active: occ.active ?? true,
          },
          create: {
            code: occ.code,
            title: occ.title,
            description: occ.description,
            synonyms: occ.synonyms,
            active: occ.active ?? true,
          },
        })
      }
      console.log(`✅ ${exportData.data.occupations.length} ocupações restauradas`)
    }

    // 2. Restaurar Códigos Médicos
    if (exportData.data.medicalCodes?.length > 0) {
      console.log('\n🏥 Restaurando Códigos Médicos...')
      for (const code of exportData.data.medicalCodes) {
        await prisma.medicalCode.upsert({
          where: { id: code.id },
          update: {
            display: code.display,
            description: code.description,
            parentId: code.parentId,
            synonyms: code.synonyms,
            active: code.active ?? true,
          },
          create: {
            id: code.id,
            systemId: code.systemId,
            code: code.code,
            display: code.display,
            description: code.description,
            parentId: code.parentId,
            synonyms: code.synonyms,
            active: code.active ?? true,
          },
        })
      }
      console.log(`✅ ${exportData.data.medicalCodes.length} códigos restaurados`)
    }

    // 3. Restaurar Medicações
    if (exportData.data.medications?.length > 0) {
      console.log('\n💊 Restaurando medicações...')
      for (const med of exportData.data.medications) {
        await prisma.medication.upsert({
          where: { id: med.id },
          update: {
            name: med.name,
            synonym: med.synonym,
            tradeName: med.tradeName,
            prescriptionType: med.prescriptionType,
            basicPharmacy: med.basicPharmacy,
            municipalPharmacy: med.municipalPharmacy,
            statePharmacy: med.statePharmacy,
            homePharmacy: med.homePharmacy,
            popularPharmacy: med.popularPharmacy,
            hospitalPharmacy: med.hospitalPharmacy,
            commercialPharmacy: med.commercialPharmacy,
            compoundPharmacy: med.compoundPharmacy,
            susCode: med.susCode,
            instructions: med.instructions,
            notes: med.notes,
            description: med.description,
          },
          create: {
            name: med.name,
            synonym: med.synonym,
            tradeName: med.tradeName,
            prescriptionType: med.prescriptionType,
            basicPharmacy: med.basicPharmacy,
            municipalPharmacy: med.municipalPharmacy,
            statePharmacy: med.statePharmacy,
            homePharmacy: med.homePharmacy,
            popularPharmacy: med.popularPharmacy,
            hospitalPharmacy: med.hospitalPharmacy,
            commercialPharmacy: med.commercialPharmacy,
            compoundPharmacy: med.compoundPharmacy,
            susCode: med.susCode,
            instructions: med.instructions,
            notes: med.notes,
            description: med.description,
          },
        })
      }
      console.log(`✅ ${exportData.data.medications.length} medicações restauradas`)
    }

    // Resumo
    console.log('\n' + '='.repeat(60))
    console.log('✅ RESTAURAÇÃO CONCLUÍDA COM SUCESSO')
    console.log('='.repeat(60))
    console.log(`Data do arquivo: ${exportData.exportedAt}`)
    console.log(`Total restaurado: ${exportData.statistics.occupations + exportData.statistics.medicalCodes + exportData.statistics.medications} registros`)
    console.log('='.repeat(60))

  } catch (error) {
    console.error('❌ Erro na restauração:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Processar argumentos
const filepath = process.argv.find(arg => arg.startsWith('--file='))?.split('=')[1]
  || './uploads/fixtures/master-data-latest.json'

seedMasterData(filepath)
