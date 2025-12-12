import { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { ExternalFetchAdapter, ExternalUpdatesService } from '@/lib/external-updates-service'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Session } from 'next-auth'

const SUPPORTED_SOURCES = ['ICD10', 'ICD11', 'CIAP2', 'NURSING', 'CBO'] as const
type SupportedSource = (typeof SUPPORTED_SOURCES)[number]

const MAX_ROWS = 50_000

type RawRow = Record<string, unknown>

interface UploadedRowCandidate {
  code?: string
  title?: string
  parent?: string
  description?: string
}

interface UploadedNormalizedRow {
  code: string
  title: string
  parent?: string
  description?: string
}

interface CustomSession {
  user?: (Session['user'] & { role?: string }) | undefined
}

async function saveBuffer(buffer: Buffer, filename: string) {
  const dir = path.join(process.cwd(), 'uploads', 'external-cache')
  await fs.promises.mkdir(dir, { recursive: true })
  const full = path.join(dir, filename)
  await fs.promises.writeFile(full, buffer)
  return full
}

function normalizeKeys(row: RawRow): RawRow {
  const normalized: RawRow = {}
  for (const key of Object.keys(row)) {
    if (!key) continue
    const normalizedKey = key.trim().toLowerCase()
    normalized[normalizedKey] = row[key]
  }
  return normalized
}

function findValue(row: RawRow, candidates: readonly string[]): string | undefined {
  const rowKeys = Object.keys(row)
  for (const candidate of candidates) {
    const key = rowKeys.find((current) => current.toLowerCase() === candidate.toLowerCase())
    if (!key) continue
    const value = row[key]
    if (value === undefined || value === null) continue
    const text = String(value).trim()
    if (text) return text
  }
  return undefined
}

function isSupportedSource(value: unknown): value is SupportedSource {
  return typeof value === 'string' && SUPPORTED_SOURCES.includes(value as SupportedSource)
}

function isNormalizedRow(row: UploadedRowCandidate): row is UploadedNormalizedRow {
  return Boolean(row.code && row.title)
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // Verificar autenticação e permissão de admin
  const session = await getServerSession(req, res, authOptions) as CustomSession | null
  if (!session?.user || session.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Acesso restrito a administradores' })
  }

if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const { source, filename, contentBase64, dryRun, retireMissing, preview } = req.body || {}
    if (!filename || typeof filename !== 'string') return res.status(400).json({ error: 'missing filename' })
    if (!contentBase64 || typeof contentBase64 !== 'string') return res.status(400).json({ error: 'missing content' })
    if (!isSupportedSource(source)) return res.status(400).json({ error: 'invalid source type' })
    const buffer = Buffer.from(contentBase64, 'base64')
    await saveBuffer(buffer, `${Date.now()}_${filename}`)

    const ext = path.extname(filename).toLowerCase()
    let parsed: RawRow[] = []
    if (ext === '.csv' || ext === '.txt') {
      const text = buffer.toString('utf8')
      const p = Papa.parse<RawRow>(text, { header: true, skipEmptyLines: true })
      if (p.errors && p.errors.length) return res.status(400).json({ error: 'CSV parse error', details: p.errors[0] })
      parsed = p.data.map(normalizeKeys)
    } else if (ext === '.xls' || ext === '.xlsx') {
      const wb = XLSX.read(buffer, { type: 'buffer' })
      const sheet = wb.Sheets[wb.SheetNames[0]]
      const json = XLSX.utils.sheet_to_json<RawRow>(sheet, { defval: undefined })
      parsed = json.map(normalizeKeys)
    } else {
      return res.status(400).json({ error: 'unsupported file extension' })
    }

    // Heuristic mapping to normalized rows with keys: code, title, parent, description
    const candidates: UploadedRowCandidate[] = parsed.map((row) => ({
      code: findValue(row, ['code', 'codigo', 'cod', 'código', 'cbo', 'codigo_ocupacao', 'codigo ocupacao']),
      title: findValue(row, ['title', 'titulo', 'nome', 'descricao', 'descrição']),
      parent: findValue(row, ['parent', 'pai', 'familia', 'family', 'group']),
      description: findValue(row, ['description', 'descricao', 'detalhes', 'observacoes', 'observações'])
    }))

    const rows = candidates.filter(isNormalizedRow)
    const invalidCount = candidates.length - rows.length

    // Create inline adapter for parsed file
    if (!rows.length) {
      return res.status(422).json({ error: 'Nenhum registro válido encontrado no arquivo enviado.' })
    }

    const limitedRows = rows.slice(0, MAX_ROWS)
    const dedupMap = new Map<string, UploadedNormalizedRow>()
    for (const row of limitedRows) {
      const key = `${row.code.trim()}::${row.title.trim()}`
      if (!dedupMap.has(key)) dedupMap.set(key, row)
    }
    const deduped = Array.from(dedupMap.values())
    const duplicatesRemoved = limitedRows.length - deduped.length
    const checksum = crypto.createHash('sha256').update(JSON.stringify(deduped)).digest('hex')

    const adapter: ExternalFetchAdapter<UploadedNormalizedRow> = {
      name: `upload-${filename}`,
      sourceType: source,
      async version() { return checksum },
      async fetchList() { return deduped },
      mapRecord(record) {
        return {
          code: record.code,
          display: record.title,
          description: record.description,
          parentCode: record.parent
        }
      }
    }

  const service = new ExternalUpdatesService<UploadedNormalizedRow>(adapter)
  const result = await service.runUpdate({ dryRun: !!dryRun, retireMissing: !!retireMissing, preview: !!preview })
  return res.json({
    ok: true,
    result,
    meta: {
      processed: deduped.length,
      truncated: rows.length > MAX_ROWS,
      duplicatesRemoved,
      invalid: invalidCount,
      checksum,
      source,
      totalParsed: parsed.length
    }
  })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido ao processar upload externo.'
    return res.status(500).json({ ok: false, error: message })
  }
}
