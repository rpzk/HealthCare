/**
 * Script para importar catálogo de exames do sistema legado SSF
 * 
 * Importa 298 tipos de exames do arquivo CSV com informações:
 * - Nome e abreviação
 * - Categoria (laboratório, radiografia, etc)
 * - Restrições de idade e sexo
 * - Código SUS relacionado
 * 
 * Formato CSV:
 * id;nome;abreviacao;descricao;tipo;idade_min;idade_max;sexo;codigo_sus;...
 * 
 * Tipos mapeados para ExamCategory:
 * 1 = LABORATORY
 * 2 = RADIOLOGY
 * 3 = ECG
 * 4 = PHYSIOTHERAPY
 * 5 = APAC
 * 6 = CYTOPATHOLOGY
 * 7 = MAMMOGRAPHY
 * 8 = ULTRASOUND
 * 9 = LAB_ALTERNATIVE
 * 10 = RAD_ALTERNATIVE
 * 11 = OTHER_1
 * 12 = OTHER_2
 * 
 * Uso: npx ts-node scripts/import-ssf-exams.ts
 */

import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

// Mapeamento de tipos do legado para enum ExamCategory
const examCategoryMap: Record<string, string> = {
  '1': 'LABORATORY',
  '2': 'RADIOLOGY',
  '3': 'ECG',
  '4': 'PHYSIOTHERAPY',
  '5': 'APAC',
  '6': 'CYTOPATHOLOGY',
  '7': 'MAMMOGRAPHY',
  '8': 'ULTRASOUND',
  '9': 'LAB_ALTERNATIVE',
  '10': 'RAD_ALTERNATIVE',
  '11': 'OTHER_1',
  '12': 'OTHER_2',
  '13': 'LABORATORY',     // Fallback
  '14': 'ULTRASOUND'      // Ultrassonografias especiais
}

// Descrição das categorias para exibição
const categoryDescriptions: Record<string, string> = {
  'LABORATORY': 'Laboratório',
  'RADIOLOGY': 'Radiografia',
  'ECG': 'Eletrocardiograma',
  'PHYSIOTHERAPY': 'Fisioterapia',
  'APAC': 'APAC',
  'CYTOPATHOLOGY': 'Citopatológico',
  'MAMMOGRAPHY': 'Mamografia',
  'ULTRASOUND': 'Ultrassonografia/Ecografia',
  'LAB_ALTERNATIVE': 'Laboratório Alternativo',
  'RAD_ALTERNATIVE': 'Radiografia Alternativa',
  'OTHER_1': 'Outros 1',
  'OTHER_2': 'Outros 2'
}

// Mapeamento de sexo
const sexRestrictionMap: Record<string, string | null> = {
  '1': 'MALE',    // Masculino
  '2': 'FEMALE',  // Feminino
  '3': null,      // Ambos
  '5': null,      // Ambos (outro código)
  'NULL': null,
  '': null
}

function parseCsvLine(line: string): string[] {
  return line.split(';').map(field => field.trim())
}

function parseNumber(value: string): number | null {
  if (!value || value === 'NULL' || value.trim() === '') return null
  const num = parseInt(value, 10)
  return isNaN(num) ? null : num
}

function inferSexRestriction(examName: string): string | null {
  const nameLower = examName.toLowerCase()
  
  // Exames exclusivos femininos
  if (
    nameLower.includes('mamografia') ||
    nameLower.includes('mamária') ||
    nameLower.includes('transvaginal') ||
    nameLower.includes('obstétrica') ||
    nameLower.includes('útero') ||
    nameLower.includes('ovário') ||
    nameLower.includes('colo uterino') ||
    nameLower.includes('citopatológico')
  ) {
    return 'FEMALE'
  }
  
  // Exames exclusivos masculinos
  if (
    nameLower.includes('próstata') ||
    nameLower.includes('prostata') ||
    nameLower.includes('psa') ||
    nameLower.includes('espermograma')
  ) {
    return 'MALE'
  }
  
  return null
}

async function importExams() {
  console.log('🔄 Iniciando importação do catálogo de exames do SSF...\n')

  const csvPath = path.join(__dirname, '../ssf/fixtures/complemento.csv')
  
  if (!fs.existsSync(csvPath)) {
    console.error('❌ Arquivo não encontrado:', csvPath)
    process.exit(1)
  }

  const content = fs.readFileSync(csvPath, 'utf-8')
  const lines = content.split('\n').filter(line => line.trim())
  
  console.log(`📊 Total de registros: ${lines.length}\n`)

  let imported = 0
  let updated = 0
  let errors = 0
  const processedNames = new Set<string>()

  for (let i = 0; i < lines.length; i++) {
    const fields = parseCsvLine(lines[i])
    
    if (fields.length < 8) {
      continue
    }

    const id = fields[0]
    const name = fields[1]
    const abbreviation = fields[2] || null
    const description = fields[3] || null
    const categoryCode = fields[4]
    const minAge = parseNumber(fields[5])
    const maxAge = parseNumber(fields[6])
    const sexCode = fields[7]
    const susCode = fields[8] !== 'NULL' ? fields[8] : null

    // Validação básica
    if (!name || !id) {
      continue
    }

    // Evitar duplicatas
    const normalizedName = name.toLowerCase().trim()
    if (processedNames.has(normalizedName)) {
      continue
    }
    processedNames.add(normalizedName)

    // Mapear categoria
    const examCategory = examCategoryMap[categoryCode] || 'LABORATORY'

    // Determinar restrição de sexo (do CSV ou inferido do nome)
    let sexRestriction = sexRestrictionMap[sexCode] || null
    if (!sexRestriction) {
      sexRestriction = inferSexRestriction(name)
    }

    try {
      // Verificar se já existe pelo nome (case insensitive)
      const existing = await prisma.examCatalog.findFirst({
        where: {
          name: {
            equals: name,
            mode: 'insensitive'
          }
        }
      })

      const data = {
        name,
        abbreviation,
        description,
        examCategory: examCategory as any,
        minAge,
        maxAge,
        sexRestriction,
        susCode,
        active: true
      }

      if (existing) {
        await prisma.examCatalog.update({
          where: { id: existing.id },
          data
        })
        updated++
      } else {
        await prisma.examCatalog.create({ data })
        imported++
      }

      if ((imported + updated) % 50 === 0) {
        console.log(`  Processados: ${imported + updated} exames...`)
      }
    } catch (error: any) {
      console.error(`❌ Erro ao processar "${name}":`, error.message)
      errors++
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('📊 RESUMO DA IMPORTAÇÃO DO CATÁLOGO DE EXAMES')
  console.log('='.repeat(60))
  console.log(`✅ Novos exames importados: ${imported}`)
  console.log(`🔄 Exames atualizados: ${updated}`)
  console.log(`❌ Erros: ${errors}`)
  console.log(`📈 Total processado: ${imported + updated}`)
  console.log('='.repeat(60))
}

async function showStatistics() {
  console.log('\n📊 ESTATÍSTICAS DO CATÁLOGO DE EXAMES\n')

  // Total de exames
  const total = await prisma.examCatalog.count()
  console.log(`Total de exames: ${total}`)

  // Por categoria
  const byCategory = await prisma.examCatalog.groupBy({
    by: ['examCategory'],
    _count: true
  })
  console.log('\nPor categoria:')
  byCategory.forEach(item => {
    const label = categoryDescriptions[item.examCategory] || item.examCategory
    console.log(`  ${label}: ${item._count}`)
  })

  // Com restrição de sexo
  const withSexRestriction = await prisma.examCatalog.count({
    where: { sexRestriction: { not: null } }
  })
  console.log(`\nCom restrição de sexo: ${withSexRestriction}`)

  // Femininos
  const femaleOnly = await prisma.examCatalog.count({
    where: { sexRestriction: 'FEMALE' }
  })
  console.log(`  Apenas feminino: ${femaleOnly}`)

  // Masculinos
  const maleOnly = await prisma.examCatalog.count({
    where: { sexRestriction: 'MALE' }
  })
  console.log(`  Apenas masculino: ${maleOnly}`)

  // Com restrição de idade
  const withAgeRestriction = await prisma.examCatalog.count({
    where: {
      OR: [
        { minAge: { not: null } },
        { maxAge: { not: null } }
      ]
    }
  })
  console.log(`\nCom restrição de idade: ${withAgeRestriction}`)

  // Com código SUS
  const withSusCode = await prisma.examCatalog.count({
    where: { susCode: { not: null } }
  })
  console.log(`Com código SUS: ${withSusCode}`)

  // Exames com abreviação
  const withAbbreviation = await prisma.examCatalog.count({
    where: { abbreviation: { not: null } }
  })
  console.log(`Com abreviação: ${withAbbreviation}`)
}

async function main() {
  try {
    await importExams()
    await showStatistics()
  } catch (error) {
    console.error('❌ Erro fatal:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
