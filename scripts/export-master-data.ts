#!/usr/bin/env tsx
/**
 * Script para exportar dados mestres (CBO, Codes, medicações)
 * para arquivos JSON que podem ser restaurados após reset
 * 
 * Uso: npx tsx scripts/export-master-data.ts [--output ./uploads/fixtures]
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

async function exportMasterData(outputDir: string = './uploads/fixtures') {
  try {
    console.log('📊 Iniciando exportação de dados mestres...')
    console.log(`📁 Diretório de saída: ${outputDir}`)

    // Garantir que o diretório existe
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
      console.log(`✅ Diretório criado: ${outputDir}`)
    }

    // 1. Exportar CBO (Ocupações)
    console.log('\n📋 Exportando CBO (Ocupações)...')
    const occupations = await prisma.occupation.findMany({
      select: {
        id: true,
        code: true,
        title: true,
        description: true,
        synonyms: true,
        active: true,
        createdAt: true,
      },
    })
    console.log(`✅ ${occupations.length} ocupações encontradas`)

    // 2. Exportar Códigos Médicos (CID, etc)
    console.log('\n🏥 Exportando Códigos Médicos...')
    const medicalCodes = await prisma.medicalCode.findMany({
      select: {
        id: true,
        systemId: true,
        code: true,
        display: true,
        description: true,
        parentId: true,
        synonyms: true,
        active: true,
        createdAt: true,
      },
    })
    console.log(`✅ ${medicalCodes.length} códigos encontrados`)

    // 3. Exportar Medicações
    console.log('\n💊 Exportando medicações...')
    const medications = await prisma.medication.findMany({
      select: {
        id: true,
        name: true,
        synonym: true,
        tradeName: true,
        prescriptionType: true,
        basicPharmacy: true,
        municipalPharmacy: true,
        statePharmacy: true,
        homePharmacy: true,
        popularPharmacy: true,
        hospitalPharmacy: true,
        commercialPharmacy: true,
        compoundPharmacy: true,
        susCode: true,
        instructions: true,
        notes: true,
        description: true,
        createdAt: true,
      },
    })
    console.log(`✅ ${medications.length} medicações encontradas`)

    // Criar arquivo de exportação
    const exportData: MasterDataExport = {
      exportedAt: new Date().toISOString(),
      statistics: {
        occupations: occupations.length,
        medicalCodes: medicalCodes.length,
        medications: medications.length,
      },
      data: {
        occupations,
        medicalCodes,
        medications,
      },
    }

    const filename = `master-data-${new Date().toISOString().split('T')[0]}.json`
    const filepath = path.join(outputDir, filename)

    fs.writeFileSync(filepath, JSON.stringify(exportData, null, 2))
    console.log(`\n✅ Arquivo salvo: ${filepath}`)

    // Criar também um arquivo "latest" para fácil referência
    const latestPath = path.join(outputDir, 'master-data-latest.json')
    fs.writeFileSync(latestPath, JSON.stringify(exportData, null, 2))
    console.log(`✅ Symlink atualizado: ${latestPath}`)

    // Resumo
    console.log('\n' + '='.repeat(60))
    console.log('📊 RESUMO DA EXPORTAÇÃO')
    console.log('='.repeat(60))
    console.log(`CBO (Ocupações):      ${occupations.length.toString().padEnd(6)} registros`)
    console.log(`Códigos Médicos:      ${medicalCodes.length.toString().padEnd(6)} registros`)
    console.log(`Medicações:           ${medications.length.toString().padEnd(6)} registros`)
    console.log(`────────────────────────────────────`)
    console.log(`TOTAL:                ${(occupations.length + medicalCodes.length + medications.length).toString().padEnd(6)} registros`)
    console.log('='.repeat(60))
    console.log(`\n📅 Exportado em: ${new Date().toLocaleString('pt-BR')}`)
    console.log(`📁 Arquivo: ${filename}`)

  } catch (error) {
    console.error('❌ Erro na exportação:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Processar argumentos
const outputDir = process.argv.find(arg => arg.startsWith('--output='))?.split('=')[1] 
  || process.argv[process.argv.length - 1]?.startsWith('./') 
  ? process.argv[process.argv.length - 1]
  : './uploads/fixtures'

exportMasterData(outputDir)
