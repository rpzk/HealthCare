import fs from 'fs'
import path from 'path'
import Papa from 'papaparse'
import { ExternalUpdatesService } from '@/lib/external-updates-service'

function normalizeKeys(obj: any) {
  const n: any = {}
  for (const k of Object.keys(obj || {})) {
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

async function main() {
  const file = path.join(process.cwd(), 'scripts', 'fixtures', 'cbo_fixture.csv')
  const text = fs.readFileSync(file, 'utf8')
  const parsed = Papa.parse(text, { header: true, skipEmptyLines: true })
  if (parsed.errors && parsed.errors.length) {
    console.error('CSV parse error', parsed.errors)
    process.exit(1)
  }
  const rows = (parsed.data as any[]).map(normalizeKeys).map((r:any) => ({
    code: findValue(r, ['codigo','code','cod','cbo','codigo_ocupacao','codigo ocupacao']),
    title: findValue(r, ['titulo','title','nome','description','descricao']),
    description: findValue(r, ['descricao','description','detalhes','observacoes','observações'])
  })).filter(x => x.code && x.title)

  const adapter = {
    name: 'fixture-cbo',
    sourceType: 'CBO',
    async version() { return 'fixture-1' },
    async fetchList() { return rows },
    mapRecord(r: any) { return { code: r.code, display: r.title, description: r.description } }
  }

  const service = new ExternalUpdatesService(adapter as any)
  const result = await service.runUpdate({ dryRun: true, retireMissing: true, preview: true })
  console.log('Result:', JSON.stringify(result, null, 2))
}

main().catch(e=>{ console.error(e); process.exit(1) })
