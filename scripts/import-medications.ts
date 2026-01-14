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

import { PrismaClient, Prisma } from '@prisma/client'
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

function mapPrescriptionType(v: any): Prisma.PrescriptionType | undefined {
  if (!v && v !== 0) return undefined
  const s = String(v).trim().toUpperCase()
  const map: Record<string, Prisma.PrescriptionType> = {
    SYMPTOMATIC: 'SYMPTOMATIC',
    CONTINUOUS: 'CONTINUOUS',
    CONTROLLED: 'CONTROLLED',
    BLUE_B: 'BLUE_B',
    YELLOW_A: 'YELLOW_A',
    PHYTOTHERAPIC: 'PHYTOTHERAPIC',
    // aliases comuns
    SIMPLES: 'SYMPTOMATIC',
    SIMPLE: 'SYMPTOMATIC',
    CONTINUA: 'CONTINUOUS',
    AMARELA: 'YELLOW_A',
    A: 'YELLOW_A',
    AZUL: 'BLUE_B',
    B: 'BLUE_B',
  }
  return map[s]
}

function mapSex(v: any): 'M' | 'F' | undefined {
  if (!v && v !== 0) return undefined
  const s = String(v).trim().toUpperCase()
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
    tradeName: (get('tradename', 'fantasia', 'nome fantasia', 'marca') as string) || null,
    prescriptionType: mapPrescriptionType(get('prescriptiontype', 'tipo', 'tipo de receita')) || 'SYMPTOMATIC',
    basicPharmacy: toBool(get('basicpharmacy', 'basica', 'farmacia basica')) ?? false,
    municipalPharmacy: toBool(get('municipalpharmacy', 'municipal')) ?? false,
    statePharmacy: toBool(get('statepharmacy', 'estadual')) ?? false,
    homePharmacy: toBool(get('homepharmacy', 'domiciliar')) ?? false,
    popularPharmacy: toBool(get('popularpharmacy', 'popular', 'farmacia popular')) ?? false,
    hospitalPharmacy: toBool(get('hospitalpharmacy', 'hospitalar')) ?? false,
    commercialPharmacy: toBool(get('commercialpharmacy', 'comercial')) ?? false,
    compoundPharmacy: toBool(get('compoundpharmacy', 'manipulado')) ?? false,
    route: (get('route', 'via', 'uso') as string) || null,
    form: (get('form', 'formato', 'forma') as string) || null,
    unit: (get('unit', 'unidade') as string) || null,
    strength: (get('strength', 'concentracao', 'dose') as string) || null,
    dosePerKg: toNumber(get('doseperkg', 'dose_kilo', 'dose/kg')),
    defaultFrequency: toNumber(get('defaultfrequency', 'frequencia')),
    defaultDuration: toNumber(get('defaultduration', 'duracao')),
    maxQuantity: toNumber(get('maxquantity', 'quantidade')),
    minAge: toNumber(get('minage', 'idade_min', 'idade minima')),
    maxAge: toNumber(get('maxage', 'idade_max', 'idade maxima')),
    sexRestriction: mapSex(get('sexrestriction', 'sexo')) || null,
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
