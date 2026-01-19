import { ExternalFetchAdapter } from '@/lib/external-updates-service'
import { fetchRawToBuffer } from '@/scripts/fetch-raw'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'

// Datasus CID-10 adapter scaffold
// Datasus provides multiple data formats; many distributions are in DBC/DBF. You may
// need to convert DBC -> DBF -> CSV. This adapter supports CSV/XLSX via env URLs or local path.

const DATASUS_CSV_URL = process.env.DATASUS_CSV_URL || ''
const DATASUS_XLSX_URL = process.env.DATASUS_XLSX_URL || ''

export const datasusCid10Adapter: ExternalFetchAdapter<any> = {
  name: 'DATASUS-CID10',
  sourceType: 'ICD10',
  async version() { return new Date().toISOString().slice(0,10) },
  async fetchList() {
    if (DATASUS_CSV_URL) {
      const buf = await fetchRawToBuffer(DATASUS_CSV_URL)
      const parsed = Papa.parse(buf.toString('utf8'), { header: true, skipEmptyLines: true })
      if (parsed.errors.length) throw new Error('Datasus CSV parse: ' + parsed.errors[0].message)
      return parsed.data.map((r:any) => ({ code: r.Codigo || r.COD || r.codigo, title: r.Descricao || r.DESCRICAO || r.title, parent: undefined, description: r.OBS || r.OBSERVACAO }))
    }
    if (DATASUS_XLSX_URL) {
      const buf = await fetchRawToBuffer(DATASUS_XLSX_URL)
      const wb = XLSX.read(buf, { type: 'buffer' })
      const sheet = wb.Sheets[wb.SheetNames[0]]
      const json = (XLSX.utils.sheet_to_json(sheet, { defval: undefined }) as any[])
      return json.map(r=> ({ code: r['Codigo']||r['COD']||r['codigo'], title: r['Descricao']||r['DESCRICAO']||r['title'], description: r['Detalhe']||r['DETALHE'] }))
    }
    return [{ code: 'A00', title: 'Cholera (Datasus fallback)' }]
  },
  mapRecord(r:any) { return { code: r.code, display: r.title, description: r.description, parentCode: r.parent } }
}
