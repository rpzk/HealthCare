import { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { ExternalUpdatesService } from '@/lib/external-updates-service'

async function saveBuffer(buffer: Buffer, filename: string) {
  const dir = path.join(process.cwd(), 'uploads', 'external-cache')
  await fs.promises.mkdir(dir, { recursive: true })
  const full = path.join(dir, filename)
  await fs.promises.writeFile(full, buffer)
  return full
}

function normalizeKeys(obj: any) {
  const n: any = {}
  for (const k of Object.keys(obj)) {
    if (!k) continue
    n[k.trim().toLowerCase()] = obj[k]
  }
  return n
}

function findValue(row: any, candidates: string[]) {
  for (const cand of candidates) {
    const key = Object.keys(row).find(k => k.toLowerCase() === cand.toLowerCase())
    if (key && row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') return String(row[key]).trim()
  }
  return undefined
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const { source, filename, contentBase64, dryRun, retireMissing, preview } = req.body || {}
    if (!filename || !contentBase64 || !source) return res.status(400).json({ error: 'missing filename/content/source' })
    const buffer = Buffer.from(contentBase64, 'base64')
    await saveBuffer(buffer, `${Date.now()}_${filename}`)

    const ext = path.extname(filename).toLowerCase()
    let parsed: any[] = []
    if (ext === '.csv' || ext === '.txt') {
      const text = buffer.toString('utf8')
      const p = Papa.parse(text, { header: true, skipEmptyLines: true })
      if (p.errors && p.errors.length) return res.status(400).json({ error: 'CSV parse error', details: p.errors[0] })
      parsed = p.data.map(normalizeKeys)
    } else if (ext === '.xls' || ext === '.xlsx') {
      const wb = XLSX.read(buffer, { type: 'buffer' })
      const sheet = wb.Sheets[wb.SheetNames[0]]
      const json = XLSX.utils.sheet_to_json(sheet, { defval: undefined })
      parsed = json.map(normalizeKeys)
    } else {
      return res.status(400).json({ error: 'unsupported file extension' })
    }

    // Heuristic mapping to normalized rows with keys: code, title, parent, description
    const rows = parsed.map((r:any) => {
      return {
        code: findValue(r, ['code', 'codigo', 'cod', 'código', 'cbo', 'codigo_ocupacao', 'codigo ocupacao']),
        title: findValue(r, ['title', 'titulo', 'nome', 'descricao', 'descrição']),
        parent: findValue(r, ['parent', 'pai', 'familia', 'family', 'group']),
        description: findValue(r, ['description', 'descricao', 'detalhes', 'observacoes', 'observações'])
      }
    }).filter(x => x.code && x.title)

    // Create inline adapter for parsed file
    const adapter = {
      name: `upload-${filename}`,
      sourceType: source,
      async version() { return `upload-${Date.now()}` },
      async fetchList() { return rows },
      mapRecord(r: any) { return { code: r.code, display: r.title, description: r.description, parentCode: r.parent } }
    }

    const service = new ExternalUpdatesService(adapter as any)
    const result = await service.runUpdate({ dryRun: !!dryRun, retireMissing: !!retireMissing, preview: !!preview })
    return res.json({ ok: true, result })
  } catch (e:any) {
    return res.status(500).json({ ok: false, error: e.message })
  }
}
