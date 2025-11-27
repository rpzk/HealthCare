/**
 * Script para importar procedimentos SIGTAP do sistema legado SSF
 * 
 * Importa 4.520 procedimentos do arquivo CSV com informações:
 * - Código SIGTAP (10 dígitos)
 * - Nome do procedimento
 * - Complexidade
 * - Financiamento
 * - Idade mínima/máxima (em meses)
 * - CBO necessário
 * - Data de vigência
 * 
 * Formato CSV:
 * id;codigo;descricao;complexidade;financiamento;idade_min;idade_max;sexo;
 * qtd_max_ambulatorial;cbo_max_ambulatorial;valor_ambulatorial;
 * qtd_max_hospitalar;valor_hospitalar;grupo;subgrupo;cbo;vigencia
 * 
 * Uso: npx ts-node scripts/import-ssf-procedures.ts
 */

import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

interface ProcedureCSVRow {
  id: string
  codigo: string
  descricao: string
  complexidade: string
  financiamento: string
  idade_min: string
  idade_max: string
  sexo: string
  qtd_max_ambulatorial: string
  cbo_max_ambulatorial: string
  valor_ambulatorial: string
  qtd_max_hospitalar: string
  valor_hospitalar: string
  grupo: string
  subgrupo: string
  cbo: string
  vigencia: string
}

// Mapeamento de complexidade
const complexityMap: Record<string, number> = {
  '0': 0,  // Não se aplica
  '1': 1,  // Baixa complexidade (Atenção Básica)
  '2': 2,  // Média complexidade
  '3': 3   // Alta complexidade
}

// Mapeamento de financiamento
const financingMap: Record<string, string> = {
  'N': 'NATIONAL',     // Nacional
  'I': 'MUNICIPAL',    // Municipal (I de IBGE/Municipal?)
  'F': 'FEDERAL',      // Federal
  'E': 'STATE'         // Estadual
}

// Mapeamento de sexo
const sexRestrictionMap: Record<string, string | null> = {
  'M': 'MALE',
  'F': 'FEMALE',
  'I': null,  // Indiferente/Ambos
  '': null
}

function parseCsvLine(line: string): string[] {
  return line.split(';').map(field => field.trim())
}

function parseNumber(value: string): number | null {
  if (!value || value.trim() === '' || value === '9999') return null
  const num = parseInt(value, 10)
  return isNaN(num) ? null : num
}

function parseDate(yyyymm: string): Date | null {
  if (!yyyymm || yyyymm.length !== 6) return null
  const year = parseInt(yyyymm.substring(0, 4), 10)
  const month = parseInt(yyyymm.substring(4, 6), 10)
  if (isNaN(year) || isNaN(month)) return null
  return new Date(year, month - 1, 1)
}

function extractGroup(code: string): string {
  // O grupo é determinado pelos primeiros 2 dígitos do código SIGTAP
  // Ex: 0101010010 -> Grupo 01 = Ações de promoção e prevenção em saúde
  const groupCode = code.substring(0, 2)
  const groups: Record<string, string> = {
    '01': 'Ações de promoção e prevenção em saúde',
    '02': 'Procedimentos com finalidade diagnóstica',
    '03': 'Procedimentos clínicos',
    '04': 'Procedimentos cirúrgicos',
    '05': 'Transplantes de órgãos, tecidos e células',
    '06': 'Medicamentos',
    '07': 'Órteses, próteses e materiais especiais',
    '08': 'Ações complementares da atenção à saúde'
  }
  return groups[groupCode] || `Grupo ${groupCode}`
}

function extractSubgroup(code: string): string {
  // O subgrupo é determinado pelos dígitos 3-4 do código SIGTAP
  const subgroupCode = code.substring(2, 4)
  return `Subgrupo ${subgroupCode}`
}

async function importProcedures() {
  console.log('🔄 Iniciando importação de procedimentos SIGTAP do SSF...\n')

  const csvPath = path.join(__dirname, '../ssf/fixtures/procedimento.csv')
  
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

  // Processar em lotes para melhor performance
  const batchSize = 100
  const batches = []

  for (let i = 0; i < lines.length; i++) {
    const fields = parseCsvLine(lines[i])
    
    if (fields.length < 17) {
      // Pode ser linha de cabeçalho ou incompleta
      continue
    }

    const row: ProcedureCSVRow = {
      id: fields[0],
      codigo: fields[1],
      descricao: fields[2],
      complexidade: fields[3],
      financiamento: fields[4],
      idade_min: fields[5],
      idade_max: fields[6],
      sexo: fields[7],
      qtd_max_ambulatorial: fields[8],
      cbo_max_ambulatorial: fields[9],
      valor_ambulatorial: fields[10],
      qtd_max_hospitalar: fields[11],
      valor_hospitalar: fields[12],
      grupo: fields[13],
      subgrupo: fields[14],
      cbo: fields[15],
      vigencia: fields[16]
    }

    // Validar código SIGTAP (10 dígitos)
    if (!row.codigo || row.codigo.length !== 10 || !/^\d+$/.test(row.codigo)) {
      continue
    }

    const data = {
      code: row.codigo,
      name: row.descricao,
      complexity: complexityMap[row.complexidade] ?? null,
      financing: financingMap[row.financiamento] || row.financiamento,
      minAge: parseNumber(row.idade_min),
      maxAge: parseNumber(row.idade_max),
      sexRestriction: sexRestrictionMap[row.sexo] || null,
      group: extractGroup(row.codigo),
      subgroup: row.grupo ? `${row.grupo}${row.subgrupo ? '.' + row.subgrupo : ''}` : extractSubgroup(row.codigo),
      cboRequired: row.cbo || null,
      validFrom: parseDate(row.vigencia),
      active: true
    }

    batches.push(data)

    // Processar em lotes
    if (batches.length >= batchSize) {
      const results = await processBatch(batches)
      imported += results.imported
      updated += results.updated
      errors += results.errors
      batches.length = 0
      console.log(`  Processados: ${imported + updated} procedimentos...`)
    }
  }

  // Processar batch final
  if (batches.length > 0) {
    const results = await processBatch(batches)
    imported += results.imported
    updated += results.updated
    errors += results.errors
  }

  console.log('\n' + '='.repeat(60))
  console.log('📊 RESUMO DA IMPORTAÇÃO DE PROCEDIMENTOS SIGTAP')
  console.log('='.repeat(60))
  console.log(`✅ Novos procedimentos importados: ${imported}`)
  console.log(`🔄 Procedimentos atualizados: ${updated}`)
  console.log(`❌ Erros: ${errors}`)
  console.log(`📈 Total processado: ${imported + updated}`)
  console.log('='.repeat(60))
}

async function processBatch(batch: any[]): Promise<{ imported: number; updated: number; errors: number }> {
  let imported = 0
  let updated = 0
  let errors = 0

  for (const data of batch) {
    try {
      const existing = await prisma.procedure.findUnique({
        where: { code: data.code }
      })

      if (existing) {
        await prisma.procedure.update({
          where: { code: data.code },
          data
        })
        updated++
      } else {
        await prisma.procedure.create({ data })
        imported++
      }
    } catch (error: any) {
      // console.error(`Erro ao processar ${data.code}:`, error.message)
      errors++
    }
  }

  return { imported, updated, errors }
}

async function showStatistics() {
  console.log('\n📊 ESTATÍSTICAS DO CATÁLOGO DE PROCEDIMENTOS\n')

  // Total de procedimentos
  const total = await prisma.procedure.count()
  console.log(`Total de procedimentos: ${total}`)

  // Por complexidade
  const byComplexity = await prisma.procedure.groupBy({
    by: ['complexity'],
    _count: true
  })
  console.log('\nPor complexidade:')
  const complexityLabels: Record<number, string> = {
    0: 'Não se aplica',
    1: 'Baixa (Atenção Básica)',
    2: 'Média',
    3: 'Alta'
  }
  byComplexity.forEach(item => {
    const label = item.complexity !== null ? complexityLabels[item.complexity] : 'Não definido'
    console.log(`  ${label}: ${item._count}`)
  })

  // Por financiamento
  const byFinancing = await prisma.procedure.groupBy({
    by: ['financing'],
    _count: true
  })
  console.log('\nPor financiamento:')
  byFinancing.forEach(item => {
    console.log(`  ${item.financing || 'Não definido'}: ${item._count}`)
  })

  // Por grupo
  const byGroup = await prisma.procedure.groupBy({
    by: ['group'],
    _count: true,
    orderBy: { _count: { group: 'desc' } },
    take: 10
  })
  console.log('\nTop 10 grupos:')
  byGroup.forEach(item => {
    console.log(`  ${item.group || 'Não definido'}: ${item._count}`)
  })

  // Com restrição de sexo
  const withSexRestriction = await prisma.procedure.count({
    where: { sexRestriction: { not: null } }
  })
  console.log(`\nCom restrição de sexo: ${withSexRestriction}`)

  // Com restrição de idade
  const withAgeRestriction = await prisma.procedure.count({
    where: {
      OR: [
        { AND: [{ minAge: { not: null } }, { minAge: { not: 9999 } }] },
        { AND: [{ maxAge: { not: null } }, { maxAge: { not: 9999 } }] }
      ]
    }
  })
  console.log(`Com restrição de idade: ${withAgeRestriction}`)
}

async function main() {
  try {
    await importProcedures()
    await showStatistics()
  } catch (error) {
    console.error('❌ Erro fatal:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
