import { ExternalFetchAdapter } from '@/lib/external-updates-service'
import Papa from 'papaparse'
import ExcelJS from 'exceljs'
import { fetchRawToBuffer } from '@/scripts/fetch-raw'
import fs from 'fs'
import path from 'path'

const CBO_CSV_URL = process.env.CBO_CSV_URL?.trim() ?? ''
const CBO_XLSX_URL = process.env.CBO_XLSX_URL?.trim() ?? ''

type RawRow = Record<string, unknown>

export interface CboNormalizedRow {
  type: 'group' | 'occupation'
  code: string
  title: string
  description?: string
  parentCode?: string
}

const CODE_KEYS = ['codigo', 'code', 'cod', 'cbo', 'codigocbo', 'codigocupacao', 'codigogrupo']
const TITLE_KEYS = ['titulo', 'title', 'nome', 'tituloocupacao', 'tituloocup', 'ocupacao', 'nomegrupo', 'descricaoestrutura']
const DESCRIPTION_KEYS = ['descricao', 'description', 'detalhes', 'descricaodetalhada', 'descricaoresumida', 'observacao']
const TYPE_KEYS = ['tipo', 'type', 'categoria']

const FALLBACK_DATA: CboNormalizedRow[] = [
  { type: 'group', code: '223', title: 'Grupo 223 - Médicos', description: 'Grupo demonstrativo para ambientes de desenvolvimento.', parentCode: '22' },
  { type: 'group', code: '2231', title: 'Família 2231 - Médicos clínicos', description: 'Família demonstrativa.', parentCode: '223' },
  { type: 'occupation', code: '2231-10', title: 'Médico clínico', description: 'Atende pacientes em nível ambulatorial.', parentCode: '2231' },
  { type: 'occupation', code: '2231-15', title: 'Médico de família e comunidade', description: 'Atuação em atenção primária.', parentCode: '2231' }
]

function normalizeKey(key: string): string {
  return key
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '')
}

function normalizeRecord(row: RawRow): RawRow {
  const normalized: RawRow = {}
  for (const originalKey of Object.keys(row)) {
    if (!originalKey) continue
    const key = normalizeKey(originalKey)
    const value = row[originalKey]
    normalized[key] = typeof value === 'string' ? value.trim() : value
  }
  return normalized
}

function onlyDigits(value: unknown): string {
  if (value === undefined || value === null) return ''
  return String(value).replace(/\D+/g, '')
}

function firstValue(row: RawRow, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = row[key]
    if (value === undefined || value === null) continue
    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (trimmed) return trimmed
    } else if (typeof value === 'number') {
      return String(value)
    }
  }
  return undefined
}

function guessType(typeValue?: string): 'group' | 'occupation' | undefined {
  if (!typeValue) return undefined
  const normalized = normalizeKey(typeValue)
  if (normalized.includes('grupo') || normalized.includes('group') || normalized.includes('estrut')) return 'group'
  if (normalized.includes('ocup') || normalized.includes('occup')) return 'occupation'
  return undefined
}

function normalizeOccupationCode(rawCode: string, digits: string): string {
  if (digits.length === 6) {
    return `${digits.slice(0, 4)}-${digits.slice(4)}`
  }
  return rawCode.trim()
}

function parseCsvBuffer(buffer: Buffer): RawRow[] {
  const text = buffer.toString('utf8')
  const parsed = Papa.parse<RawRow>(text, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: normalizeKey,
    delimitersToGuess: [',', ';', '\t']
  })
  const seriousError = parsed.errors.find((err) => err.type !== 'FieldMismatch')
  if (seriousError) {
    throw new Error(`Erro ao processar CSV CBO: ${seriousError.message} (linha ${seriousError.row ?? 'desconhecida'})`)
  }
  return parsed.data.map(normalizeRecord)
}

function worksheetToRows(worksheet: ExcelJS.Worksheet): RawRow[] {
  const headerRow = worksheet.getRow(1)
  const headerValues = (headerRow.values ?? []) as unknown[]
  const headers = headerValues
    .slice(1)
    .map((value) => (value === null || value === undefined ? '' : String(value)))
    .map(normalizeKey)

  const rows: RawRow[] = []
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return
    const values = (row.values ?? []) as unknown[]
    const record: RawRow = {}
    for (let i = 0; i < headers.length; i++) {
      const key = headers[i]
      if (!key) continue
      const cellValue = values[i + 1]
      if (cellValue === undefined || cellValue === null || cellValue === '') continue

      if (typeof cellValue === 'object' && cellValue && 'text' in (cellValue as any)) {
        record[key] = String((cellValue as any).text)
      } else if (typeof cellValue === 'object' && cellValue && 'result' in (cellValue as any)) {
        record[key] = (cellValue as any).result
      } else {
        record[key] = cellValue
      }
    }

    if (Object.keys(record).length) {
      rows.push(normalizeRecord(record))
    }
  })

  return rows
}

async function parseXlsxBuffer(buffer: Buffer): Promise<RawRow[]> {
  const workbook = new ExcelJS.Workbook()
  // Ensure a concrete Node Buffer type for ExcelJS typings.
  const data = Buffer.from(buffer)
  await workbook.xlsx.load(data as any)
  if (!workbook.worksheets.length) return []

  const normalizedSheetNames = workbook.worksheets.map((ws) => normalizeKey(ws.name || ''))
  const occSheetIndex = normalizedSheetNames.findIndex((name) => name.includes('ocup') || name.includes('occup'))
  const groupSheetIndex = normalizedSheetNames.findIndex((name) => name.includes('estrut') || name.includes('struct'))

  const primaryIndex = occSheetIndex !== -1 ? occSheetIndex : 0
  const rows: RawRow[] = worksheetToRows(workbook.worksheets[primaryIndex])

  if (groupSheetIndex !== -1 && groupSheetIndex !== primaryIndex) {
    rows.push(...worksheetToRows(workbook.worksheets[groupSheetIndex]))
  }

  return rows
}

async function parseBuffer(buffer: Buffer, formatHint: 'csv' | 'xlsx'): Promise<RawRow[]> {
  return formatHint === 'csv' ? parseCsvBuffer(buffer) : parseXlsxBuffer(buffer)
}

function toNormalizedRow(row: RawRow): CboNormalizedRow | undefined {
  const codeRaw = firstValue(row, CODE_KEYS)
  const title = firstValue(row, TITLE_KEYS)
  if (!codeRaw || !title) return undefined

  const digits = onlyDigits(codeRaw)
  if (!digits) return undefined

  const typeHint = firstValue(row, TYPE_KEYS)
  const typeFromRow = typeHint ? guessType(typeHint) : undefined
  const description = firstValue(row, DESCRIPTION_KEYS)

  if (typeFromRow === 'group' || digits.length <= 4) {
    const groupCode = digits
    const parentCode = groupCode.length > 1 ? groupCode.substring(0, groupCode.length - 1) : undefined
    return {
      type: 'group',
      code: groupCode,
      title,
      description,
      parentCode
    }
  }

  const parentDigits = digits.length >= 4 ? digits.substring(0, 4) : undefined
  return {
    type: 'occupation',
    code: normalizeOccupationCode(codeRaw, digits),
    title,
    description,
    parentCode: parentDigits && parentDigits.length ? parentDigits : undefined
  }
}

function normalizeRows(rows: RawRow[]): CboNormalizedRow[] {
  const dedup = new Map<string, CboNormalizedRow>()
  for (const raw of rows) {
    const normalized = toNormalizedRow(raw)
    if (!normalized) continue
    const key = `${normalized.type}:${normalized.code}`
    dedup.set(key, normalized)
  }

  const groups: CboNormalizedRow[] = []
  const occupations: CboNormalizedRow[] = []
  dedup.forEach((record) => {
    if (record.type === 'group') groups.push(record)
    else occupations.push(record)
  })

  const compareCodes = (a: CboNormalizedRow, b: CboNormalizedRow) => {
    const digitsA = onlyDigits(a.code)
    const digitsB = onlyDigits(b.code)
    if (digitsA.length !== digitsB.length) return digitsA.length - digitsB.length
    return digitsA.localeCompare(digitsB)
  }

  groups.sort(compareCodes)
  occupations.sort(compareCodes)

  return [...groups, ...occupations]
}

export const cboOfficialAdapter: ExternalFetchAdapter<CboNormalizedRow> = {
  name: 'CBO-OFICIAL',
  sourceType: 'CBO',
  async version() {
    return new Date().toISOString().slice(0, 10)
  },
  async fetchList() {
    const localPath = process.env.CBO_LOCAL_PATH?.trim() ?? ''
    let rows: RawRow[] | undefined

    if (localPath) {
      if (!fs.existsSync(localPath)) {
        throw new Error(`CBO_LOCAL_PATH configurado, porém arquivo não encontrado: ${localPath}`)
      }
      const extension = path.extname(localPath).toLowerCase()
      const format: 'csv' | 'xlsx' = extension === '.csv' || extension === '.txt' ? 'csv' : 'xlsx'
      const buffer = fs.readFileSync(localPath)
      rows = await parseBuffer(buffer, format)
    } else if (CBO_CSV_URL) {
      const buffer = await fetchRawToBuffer(CBO_CSV_URL)
      rows = await parseBuffer(buffer, 'csv')
    } else if (CBO_XLSX_URL) {
      const buffer = await fetchRawToBuffer(CBO_XLSX_URL)
      rows = await parseBuffer(buffer, 'xlsx')
    }

    if (!rows || !rows.length) {
      return FALLBACK_DATA
    }

    const normalized = normalizeRows(rows)
    if (!normalized.length) {
      throw new Error('Nenhum registro CBO válido foi encontrado na fonte analisada.')
    }

    return normalized
  },
  mapRecord(record) {
    return {
      code: record.code,
      display: record.title ?? record.code,
      description: record.description,
      parentCode: record.parentCode
    }
  }
}
