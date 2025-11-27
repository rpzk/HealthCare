/**
 * Script para importar medicamentos do sistema legado SSF
 * 
 * Importa 359 medicamentos do arquivo CSV com informações ricas:
 * - Nome, sinônimo, nome fantasia
 * - Tipo de receita (simples, controlada, etc)
 * - Disponibilidade (básica, municipal, estadual, hospitalar, etc)
 * - Via de administração (oral, EV, IM, etc)
 * - Dosagem padrão, frequência, duração
 * - Restrições de idade e sexo
 * 
 * Usa o modelo Medication existente no schema.prisma
 * 
 * Uso: npx ts-node scripts/import-ssf-medications.ts
 */

import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

interface MedicationCSVRow {
  id: string
  nome: string
  sinonimo: string
  fantasia: string
  receita_tipo: string
  basica: string
  municipal: string
  estadual: string
  domiciliar: string
  popular: string
  hospitalar: string
  comercial: string
  manipulado: string
  uso: string
  peso: string
  unidade: string
  formato: string
  recipiente: string
  dose_kilo: string
  frequencia: string
  duracao: string
  quantidade: string
  idade_min: string
  idade_max: string
  sexo: string
}

// Mapeamento de tipos de receita do legado para o enum PrescriptionType
const prescriptionTypeMap: Record<string, 'SYMPTOMATIC' | 'CONTINUOUS' | 'CONTROLLED' | 'BLUE_B' | 'YELLOW_A' | 'PHYTOTHERAPIC'> = {
  'S': 'SYMPTOMATIC',   // Simples -> Sintomático
  'C': 'CONTROLLED',    // Controlada
  'A': 'YELLOW_A',      // Especial A (amarela)
  'B': 'BLUE_B',        // Especial B (azul)
  '': 'SYMPTOMATIC'
}

// Mapeamento de vias de administração
const routeMap: Record<string, string> = {
  'O': 'Oral',
  'EV': 'Endovenosa (EV)',
  'IM': 'Intramuscular (IM)',
  'SC': 'Subcutânea (SC)',
  'T': 'Tópica',
  'IN': 'Inalatória',
  'N': 'Nasal',
  'OF': 'Oftálmica',
  'OT': 'Otológica',
  'R': 'Retal',
  'V': 'Vaginal',
  'SL': 'Sublingual',
  'TD': 'Transdérmica',
  '': 'Oral'
}

// Mapeamento de formas farmacêuticas
const formMap: Record<string, string> = {
  'CP': 'Comprimido',
  'CA': 'Cápsula',
  'XA': 'Xarope',
  'SO': 'Solução',
  'SU': 'Suspensão',
  'PD': 'Pó',
  'CR': 'Creme',
  'PO': 'Pomada',
  'GE': 'Gel',
  'IN': 'Injetável',
  'GO': 'Gotas',
  'AE': 'Aerosol',
  'PA': 'Adesivo',
  'SP': 'Spray',
  '': 'Comprimido'
}

// Mapeamento de sexo
const sexRestrictionMap: Record<string, string | null> = {
  'M': 'M',
  'F': 'F',
  'A': null,  // Ambos
  '': null
}

function parseCsvLine(line: string): string[] {
  // Parser simples para CSV separado por ponto-e-vírgula
  return line.split(';').map(field => field.trim())
}

function parseBoolean(value: string): boolean {
  return value === '1' || value.toLowerCase() === 'true' || value.toLowerCase() === 's'
}

function parseNumber(value: string): number | null {
  if (!value || value.trim() === '') return null
  const num = parseFloat(value.replace(',', '.'))
  return isNaN(num) ? null : num
}

async function importMedications() {
  console.log('🔄 Iniciando importação de medicamentos do SSF...\n')

  const csvPath = path.join(__dirname, '../ssf/fixtures/medicacao.csv')
  
  if (!fs.existsSync(csvPath)) {
    console.error('❌ Arquivo não encontrado:', csvPath)
    process.exit(1)
  }

  const content = fs.readFileSync(csvPath, 'utf-8')
  const lines = content.split('\n').filter(line => line.trim())
  
  // Primeira linha é o cabeçalho
  const headers = parseCsvLine(lines[0])
  console.log('📋 Colunas encontradas:', headers.join(', '))
  console.log(`📊 Total de registros: ${lines.length - 1}\n`)

  let imported = 0
  let updated = 0
  let errors = 0

  for (let i = 1; i < lines.length; i++) {
    const fields = parseCsvLine(lines[i])
    
    if (fields.length < 25) {
      console.warn(`⚠️ Linha ${i + 1}: campos insuficientes (${fields.length})`)
      errors++
      continue
    }

    // Mapear campos por índice (baseado no header do CSV)
    const row: MedicationCSVRow = {
      id: fields[0],
      nome: fields[1],
      sinonimo: fields[2],
      fantasia: fields[3],
      receita_tipo: fields[4],
      basica: fields[5],
      municipal: fields[6],
      estadual: fields[7],
      domiciliar: fields[8],
      popular: fields[9],
      hospitalar: fields[10],
      comercial: fields[11],
      manipulado: fields[12],
      uso: fields[13],
      peso: fields[14],
      unidade: fields[15],
      formato: fields[16],
      recipiente: fields[17],
      dose_kilo: fields[18],
      frequencia: fields[19],
      duracao: fields[20],
      quantidade: fields[21],
      idade_min: fields[22],
      idade_max: fields[23],
      sexo: fields[24]
    }

    try {
      // Dados mapeados para o modelo Medication do schema
      const data = {
        name: row.nome,
        synonym: row.sinonimo || null,
        tradeName: row.fantasia || null,
        prescriptionType: prescriptionTypeMap[row.receita_tipo] || 'SYMPTOMATIC',
        
        // Disponibilidade nas farmácias
        basicPharmacy: parseBoolean(row.basica),
        municipalPharmacy: parseBoolean(row.municipal),
        statePharmacy: parseBoolean(row.estadual),
        homePharmacy: parseBoolean(row.domiciliar),
        popularPharmacy: parseBoolean(row.popular),
        hospitalPharmacy: parseBoolean(row.hospitalar),
        commercialPharmacy: parseBoolean(row.comercial),
        compoundPharmacy: parseBoolean(row.manipulado),
        
        // Forma farmacêutica
        route: routeMap[row.uso] || 'Oral',
        form: formMap[row.formato] || null,
        unit: row.unidade || null,
        packaging: row.recipiente || null,
        
        // Dosagem padrão
        strength: row.peso ? `${row.peso} ${row.unidade || ''}`.trim() : null,
        dosePerKg: parseNumber(row.dose_kilo),
        defaultFrequency: parseNumber(row.frequencia),
        defaultDuration: parseNumber(row.duracao) ? parseInt(row.duracao) : null,
        maxQuantity: parseNumber(row.quantidade),
        
        // Restrições
        minAge: parseNumber(row.idade_min) ? parseInt(row.idade_min) : null,
        maxAge: parseNumber(row.idade_max) ? parseInt(row.idade_max) : null,
        sexRestriction: sexRestrictionMap[row.sexo] || null,
        
        // Metadados
        active: true
      }

      // Verificar se já existe pelo nome (busca aproximada)
      const existing = await prisma.medication.findFirst({
        where: {
          name: {
            equals: row.nome,
            mode: 'insensitive'
          }
        }
      })

      if (existing) {
        await prisma.medication.update({
          where: { id: existing.id },
          data
        })
        updated++
      } else {
        await prisma.medication.create({ data })
        imported++
      }

      if ((imported + updated) % 50 === 0) {
        console.log(`  Processados: ${imported + updated} medicamentos...`)
      }
    } catch (error) {
      console.error(`❌ Erro na linha ${i + 1} (${row.nome}):`, error)
      errors++
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('📊 RESUMO DA IMPORTAÇÃO')
  console.log('='.repeat(60))
  console.log(`✅ Novos medicamentos importados: ${imported}`)
  console.log(`🔄 Medicamentos atualizados: ${updated}`)
  console.log(`❌ Erros: ${errors}`)
  console.log(`📈 Total processado: ${imported + updated + errors}`)
  console.log('='.repeat(60))
}

async function showStatistics() {
  console.log('\n📊 ESTATÍSTICAS DO CATÁLOGO DE MEDICAMENTOS\n')

  // Total de medicamentos
  const total = await prisma.medication.count()
  console.log(`Total de medicamentos: ${total}`)

  // Por tipo de receita
  const byPrescriptionType = await prisma.medication.groupBy({
    by: ['prescriptionType'],
    _count: true
  })
  console.log('\nPor tipo de receita:')
  byPrescriptionType.forEach((item: { prescriptionType: string; _count: number }) => {
    console.log(`  ${item.prescriptionType}: ${item._count}`)
  })

  // Por disponibilidade (usando os nomes corretos do schema)
  const basicPharmacy = await prisma.medication.count({ where: { basicPharmacy: true } })
  const municipal = await prisma.medication.count({ where: { municipalPharmacy: true } })
  const state = await prisma.medication.count({ where: { statePharmacy: true } })
  const hospital = await prisma.medication.count({ where: { hospitalPharmacy: true } })
  const popular = await prisma.medication.count({ where: { popularPharmacy: true } })

  console.log('\nPor disponibilidade:')
  console.log(`  Farmácia Básica: ${basicPharmacy}`)
  console.log(`  Municipal: ${municipal}`)
  console.log(`  Estadual: ${state}`)
  console.log(`  Hospitalar: ${hospital}`)
  console.log(`  Farmácia Popular: ${popular}`)

  // Por via de administração
  const byRoute = await prisma.medication.groupBy({
    by: ['route'],
    _count: true
  })
  console.log('\nPor via de administração:')
  byRoute.forEach((item: { route: string | null; _count: number }) => {
    console.log(`  ${item.route || 'Não definida'}: ${item._count}`)
  })

  // Com restrição de sexo
  const withSexRestriction = await prisma.medication.count({
    where: { sexRestriction: { not: null } }
  })
  console.log(`\nCom restrição de sexo: ${withSexRestriction}`)

  // Com restrição de idade
  const withAgeRestriction = await prisma.medication.count({
    where: {
      OR: [
        { minAge: { not: null } },
        { maxAge: { not: null } }
      ]
    }
  })
  console.log(`Com restrição de idade: ${withAgeRestriction}`)
}

async function main() {
  try {
    await importMedications()
    await showStatistics()
  } catch (error) {
    console.error('❌ Erro fatal:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
