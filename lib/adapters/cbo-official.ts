import { ExternalFetchAdapter } from '@/lib/external-updates-service'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { fetchRawToBuffer } from '@/scripts/fetch-raw'
import fs from 'fs'
import path from 'path'

// Expect either CSV (env CBO_CSV_URL) or XLSX (env CBO_XLSX_URL). If both provided, CSV takes precedence.
const CBO_CSV_URL = process.env.CBO_CSV_URL || ''
const CBO_XLSX_URL = process.env.CBO_XLSX_URL || ''

type RawRow = Record<string, any>

function normalizeRowKeys(r: RawRow) {
  const out: Record<string, any> = {}
  for (const k of Object.keys(r)) out[k.trim().toLowerCase()] = r[k]
  return out
}

function onlyDigits(s?: string) {
  if (!s) return ''
  return String(s).replace(/[^0-9]/g, '')
}

export const cboOfficialAdapter: ExternalFetchAdapter<any> = {
  name: 'CBO-OFICIAL',
  sourceType: 'CBO',
  async version() { return new Date().toISOString().slice(0,10) },
  async fetchList() {
    let rows: RawRow[] = []
    // Priority: local path (downloaded), CSV URL, XLSX URL
    const localPath = process.env.CBO_LOCAL_PATH || ''
    if (localPath && fs.existsSync(localPath)) {
      const buf = fs.readFileSync(localPath)
      const extLocal = path.extname(localPath).toLowerCase()
      if (extLocal === '.csv' || extLocal === '.txt') {
        const text = buf.toString('utf8')
        const parsed = Papa.parse<RawRow>(text, { header: true, skipEmptyLines: true })
        if (parsed.errors.length) throw new Error('Erro parse CBO CSV: ' + parsed.errors[0].message)
        rows = parsed.data.map(normalizeRowKeys)
      } else {
        const wb = XLSX.read(buf, { type: 'buffer' })
        const occSheet = wb.Sheets[wb.SheetNames[0]]
        rows = (XLSX.utils.sheet_to_json(occSheet, { defval: undefined }) as any[]).map(normalizeRowKeys)
      }
    } else if (CBO_CSV_URL) {
      const buf = await fetchRawToBuffer(CBO_CSV_URL)
      const text = buf.toString('utf8')
      const parsed = Papa.parse<RawRow>(text, { header: true, skipEmptyLines: true })
      if (parsed.errors.length) throw new Error('Erro parse CBO CSV: ' + parsed.errors[0].message)
      rows = parsed.data.map(normalizeRowKeys)
    } else if (CBO_XLSX_URL) {
      const buf = await fetchRawToBuffer(CBO_XLSX_URL)
      const wb = XLSX.read(buf, { type: 'buffer' })
      // try to find dedicated sheets
      const sheetNames = wb.SheetNames.map(s => s.toLowerCase())
      let groupsSheetIndex = sheetNames.findIndex(s => s.includes('estrut') || s.includes('structure'))
      let occSheetIndex = sheetNames.findIndex(s => s.includes('ocup') || s.includes('ocupacoes') || s.includes('occup'))
      if (occSheetIndex === -1) occSheetIndex = 0
      const occSheet = wb.Sheets[wb.SheetNames[occSheetIndex]]
  rows = (XLSX.utils.sheet_to_json(occSheet, { defval: undefined }) as any[]).map(normalizeRowKeys)
      // if there's a separate groups sheet, merge its rows at beginning
      if (groupsSheetIndex !== -1 && groupsSheetIndex !== occSheetIndex) {
        const grpSheet = wb.Sheets[wb.SheetNames[groupsSheetIndex]]
  const grpRows = (XLSX.utils.sheet_to_json(grpSheet, { defval: undefined }) as any[]).map(normalizeRowKeys)
  rows = [...grpRows, ...rows]
      }
    } else {
      // fallback sample
      rows = [
        { codigo: '2231-10', titulo: 'Médico clínico', descricao: 'Atende pacientes em nível ambulatorial.' },
        { codigo: '2231-15', titulo: 'Médico de família e comunidade', descricao: 'Atuação em atenção primária.' }
      ]
    }

    // classify rows into groups and occupations
    const out: any[] = []
    for (const r of rows) {
      const code = (r['codigo'] || r['code'] || r['cod'] || r['código'] || r['cbo']) && String(r['codigo'] || r['code'] || r['cod'] || r['código'] || r['cbo']).trim()
      const title = (r['titulo'] || r['title'] || r['nome'] || r['titulo_ocupacao'] || r['titulo_ocup']) && String(r['titulo'] || r['title'] || r['nome'] || r['titulo_ocupacao'] || r['titulo_ocup']).trim()
      const description = (r['descricao'] || r['description'] || r['detalhes'] || r['descrição']) && String(r['descricao'] || r['description'] || r['detalhes'] || r['descrição']).trim()
      if (!code || !title) continue
      const digits = onlyDigits(code)
      if (digits.length <= 4) {
        // group record
        const parent = digits.length > 1 ? digits.substring(0, digits.length - 1) : undefined
        out.push({ type: 'group', code: digits, title, description, parentCode: parent })
      } else {
        // occupation
        const family = digits.substring(0,4)
        out.push({ type: 'occupation', code: code, title, description, parentCode: family })
      }
    }

    // ensure groups first
    out.sort((a,b) => (a.type === 'group' ? -1 : 1))
    return out
  },
  mapRecord(r) { 
    // external-updates-service expects { code, display, description, parentCode }
    return { code: r.code, display: r.title || r.display, description: r.description, parentCode: r.parentCode }
  }
}
