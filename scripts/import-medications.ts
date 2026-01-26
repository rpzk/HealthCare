/**
 * Importador de medicamentos (dados reais via CSV/XLSX)
 *
 * Uso:
 *  - CSV:  npx tsx scripts/import-medications.ts --file /caminho/medicamentos.csv
 *  - XLSX: npx tsx scripts/import-medications.ts --file /caminho/medicamentos.xlsx --sheet NomeDaAba
 *
 * Observações importantes:
 *  - Não cria dados fictícios. Apenas importa arquivos reais fornecidos por você.
 *  - Faz upsert por nome (case-insensitive).
 *  - Colunas suportadas (variações PT/EN são aceitas):
 *    name, synonym, tradeName, prescriptionType,
 *    basicPharmacy, municipalPharmacy, statePharmacy, homePharmacy,
 *    popularPharmacy, hospitalPharmacy, commercialPharmacy, compoundPharmacy,
 *    route, form, unit, strength, dosePerKg, defaultFrequency,
 *    defaultDuration, maxQuantity, minAge, maxAge, sexRestriction, active
 */

import { PrismaClient, Prisma, PrescriptionType } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import fs from 'fs'
import path from 'path'
import { parse } from 'csv-parse/sync'
import ExcelJS from 'exceljs'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  throw new Error('DATABASE_URL não configurado')
}

const adapter = new PrismaPg({ connectionString: databaseUrl })
const prisma = new PrismaClient({
  adapter,
})

type Row = Record<string, any>

function getArg(flag: string): string | undefined {
  const idx = process.argv.findIndex((a) => a === flag || a.startsWith(`${flag}=`))
  if (idx === -1) return undefined
  const val = process.argv[idx]
  if (val.includes('=')) return val.split('=')[1]
  return process.argv[idx + 1]
}

function normalizeKey(k: string): string {
  return k.toLowerCase().trim()
}

function readCSV(file: string): Row[] {
  const content = fs.readFileSync(file, 'utf-8')
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
    relax_column_count: true,
  }) as Row[]
  return records
}

async function readXLSX(file: string, sheetName?: string): Promise<Row[]> {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(file)
  const ws = sheetName ? wb.getWorksheet(sheetName) : wb.worksheets[0]
  if (!ws) throw new Error('Aba não encontrada no XLSX')

  // Assume primeira linha como cabeçalho
  const headers: string[] = []
  ws.getRow(1).eachCell((cell, colNumber) => {
    headers[colNumber - 1] = String(cell.value || '').trim()
  })

  const rows: Row[] = []
  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return
    const obj: Row = {}
    row.eachCell((cell, colNumber) => {
      obj[headers[colNumber - 1]] = cell.value instanceof Object && 'text' in (cell.value as any)
        ? (cell.value as any).text
        : cell.value
    })
    // Ignorar linhas vazias
    if (Object.values(obj).some((v) => v !== null && v !== undefined && String(v).trim() !== '')) {
      rows.push(obj)
    }
  })
  return rows
}

function toBool(v: any): boolean | undefined {
  if (v === undefined || v === null || String(v).trim() === '') return undefined
  const s = String(v).trim().toLowerCase()
  return ['1', 'true', 't', 'yes', 'y', 'sim', 's'].includes(s)
}

function toNumber(v: any): number | undefined {
  if (v === undefined || v === null || String(v).trim() === '') return undefined
  const n = Number(String(v).replace(',', '.'))
  return isNaN(n) ? undefined : n
}

function mapPrescriptionType(v: any): PrescriptionType | undefined {
  if (!v && v !== 0) return undefined
  const s = String(v).trim().toUpperCase()
  const map: Record<string, PrescriptionType> = {
    SYMPTOMATIC: PrescriptionType.SYMPTOMATIC,
    CONTINUOUS: PrescriptionType.CONTINUOUS,
    CONTROLLED: PrescriptionType.CONTROLLED,
    BLUE_B: PrescriptionType.BLUE_B,
    YELLOW_A: PrescriptionType.YELLOW_A,
    PHYTOTHERAPIC: PrescriptionType.PHYTOTHERAPIC,
    // aliases comuns
    SIMPLES: PrescriptionType.SYMPTOMATIC,
    SIMPLE: PrescriptionType.SYMPTOMATIC,
    CONTINUA: PrescriptionType.CONTINUOUS,
    AMARELA: PrescriptionType.YELLOW_A,
    A: PrescriptionType.YELLOW_A,
    AZUL: PrescriptionType.BLUE_B,
    B: PrescriptionType.BLUE_B,
  }
  return map[s]
}

function mapSex(v: any): 'M' | 'F' | undefined {
  if (!v && v !== 0) return undefined
  const s = String(v).trim().toUpperCase()
  // alguns datasets do SSF usam ids (patterns_sex): 1=Masculino, 2=Feminino
  if (s === '1') return 'M'
  if (s === '2') return 'F'
  if (s === 'M' || s === 'MALE' || s === 'MASCULINO') return 'M'
  if (s === 'F' || s === 'FEMALE' || s === 'FEMININO') return 'F'
  return undefined
}

function normalizeRow(row: Row): Row {
  // normalizar chaves para facilitar mapeamento
  const norm: Row = {}
  for (const [k, v] of Object.entries(row)) {
    norm[normalizeKey(k)] = v
  }
  return norm
}

function buildMedicationData(r: Row): Prisma.MedicationCreateInput {
  // aceitar variações de nomes de coluna em PT/EN
  const get = (...keys: string[]) => keys.map(normalizeKey).map((k) => r[k]).find((x) => x !== undefined)

  const name = get('name', 'nome')
  if (!name || String(name).trim() === '') {
    throw new Error('Linha sem coluna "name/nome" preenchida')
  }

  const data: Prisma.MedicationCreateInput = {
    name: String(name).trim(),
    synonym: (get('synonym', 'sinonimo') as string) || null,
    tradeName: (get('tradename', 'fantasia', 'nome fantasia', 'marca', 'brand') as string) || null,
    prescriptionType: mapPrescriptionType(get('prescriptiontype', 'tipo', 'tipo de receita', 'prescription_type')) || PrescriptionType.SYMPTOMATIC,

    basicPharmacy: toBool(get('basicpharmacy', 'basica', 'farmacia basica', 'basic_unit')) ?? false,
    municipalPharmacy: toBool(get('municipalpharmacy', 'municipal')) ?? false,
    statePharmacy: toBool(get('statepharmacy', 'estadual', 'state')) ?? false,
    homePharmacy: toBool(get('homepharmacy', 'domiciliar', 'home_hospitalization')) ?? false,
    popularPharmacy: toBool(get('popularpharmacy', 'popular', 'farmacia popular')) ?? false,
    hospitalPharmacy: toBool(get('hospitalpharmacy', 'hospitalar', 'hospital')) ?? false,
    commercialPharmacy: toBool(get('commercialpharmacy', 'comercial', 'comercial')) ?? false,
    compoundPharmacy: toBool(get('compoundpharmacy', 'manipulado', 'manipulated')) ?? false,

    susCode: (get('suscode', 'sus_code', 'codigo sus', 'código sus') as string) || null,

    instructions: (get('instructions', 'orientacao', 'orientação', 'guidance') as string) || null,
    notes: (get('notes', 'notas') as string) || null,
    description: (get('description', 'descricao', 'descrição') as string) || null,
    warnings: (get('warnings', 'warning', 'advertencias', 'advertências') as string) || null,
    interactions: (get('interactions', 'interacoes', 'interações') as string) || null,
    observations: (get('observations', 'observacoes', 'observações') as string) || null,

    // Restrições
    // OBS: em alguns fixtures SSF, sex vem como id de tabela patterns_sex; quando não for 1/2, ignoramos.
    // OBS: min/max podem vir preenchidos com 0; tratamos 0 como "sem restrição".
    minAge: (() => {
      const v = toNumber(get('minage', 'idade_min', 'idade minima', 'min'))
      return v && v > 0 ? v : undefined
    })(),
    maxAge: (() => {
      const v = toNumber(get('maxage', 'idade_max', 'idade maxima', 'max'))
      return v && v > 0 ? v : undefined
    })(),
    sexRestriction: mapSex(get('sexrestriction', 'sexo', 'sex')) || null,
    validityDays: (() => {
      const v = toNumber(get('validitydays', 'validity_days', 'validade', 'validity'))
      return v && v > 0 ? v : undefined
    })(),

    // Apresentação
    route: (get('route', 'via', 'uso', 'use') as string) || null,
    unit: (get('unit', 'unidade') as string) || null,
    form: (get('form', 'formato', 'forma') as string) || null,
    packaging: (get('packaging', 'recipiente', 'container') as string) || null,
    packageSize: (() => {
      const v = toNumber(get('packagesize', 'capacidade', 'capacity'))
      return v && v > 0 ? v : undefined
    })(),
    strength: (() => {
      const direct = get('strength', 'concentracao', 'concentração', 'dose')
      if (direct !== undefined && direct !== null && String(direct).trim() !== '') return String(direct).trim()
      const weight = get('weight')
      const unit = get('unit', 'unidade')
      if (weight !== undefined && weight !== null && String(weight).trim() !== '') {
        const w = String(weight).trim()
        const u = unit !== undefined && unit !== null && String(unit).trim() !== '' ? String(unit).trim() : ''
        return `${w}${u ? ' ' + u : ''}`
      }
      return null
    })(),

    // Dosagem
    dosePerKg: toNumber(get('doseperkg', 'dose_kilo', 'dose/kg', 'dose_weight')),
    maxDailyDosePerKg: toNumber(get('maxdailydoseperkg', 'dose_max', 'dosemax')),
    defaultFrequency: toNumber(get('defaultfrequency', 'frequencia', 'frequência', 'dose_freq')),
    defaultDuration: (() => {
      const v = toNumber(get('defaultduration', 'duracao', 'duração', 'length'))
      return v && v > 0 ? v : undefined
    })(),
    maxQuantity: toNumber(get('maxquantity', 'quantidade', 'amount')),
    active: toBool(get('active', 'ativo')) ?? true,
  }
  return data
}

async function upsertMedication(data: Prisma.MedicationCreateInput): Promise<'created' | 'updated'> {
  const existing = await prisma.medication.findFirst({
    where: { name: { equals: data.name, mode: 'insensitive' } },
    select: { id: true }
  })
  if (existing) {
    await prisma.medication.update({ where: { id: existing.id }, data })
    return 'updated'
  }
  await prisma.medication.create({ data })
  return 'created'
}

async function main() {
  const file = getArg('--file')
  const sheetName = getArg('--sheet')
  if (!file) {
    console.error('Erro: informe --file /caminho/arquivo.(csv|xlsx)')
    process.exit(1)
  }
  const abs = path.resolve(file)
  if (!fs.existsSync(abs)) {
    console.error('Arquivo não encontrado:', abs)
    process.exit(1)
  }

  let rows: Row[] = []
  if (abs.toLowerCase().endsWith('.csv')) rows = readCSV(abs)
  else if (abs.toLowerCase().endsWith('.xlsx')) rows = await readXLSX(abs, sheetName)
  else {
    console.error('Formato não suportado. Use CSV ou XLSX.')
    process.exit(1)
  }

  console.log(`Iniciando importação de medicamentos de ${abs}`)
  console.log(`Total de linhas: ${rows.length}`)

  let created = 0
  let updated = 0
  let failed = 0

  for (const [idx, raw] of rows.entries()) {
    try {
      const norm = normalizeRow(raw)
      const data = buildMedicationData(norm)
      const res = await upsertMedication(data)
      if (res === 'created') created++
      else updated++
      if ((created + updated) % 100 === 0) {
        console.log(`  Processados: ${created + updated} (criadas: ${created}, atualizadas: ${updated})`)
      }
    } catch (err) {
      failed++
      console.warn(`Falha na linha ${idx + 2}: ${(err as Error).message}`)
    }
  }

  console.log('—'.repeat(60))
  console.log('Importação finalizada:')
  console.log(`  Criadas: ${created}`)
  console.log(`  Atualizadas: ${updated}`)
  console.log(`  Falhas: ${failed}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
