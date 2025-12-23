import { ExternalFetchAdapter } from '@/lib/external-updates-service'
import { fetchRawToBuffer } from '@/scripts/fetch-raw'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'

// Datasus CID-10 adapter scaffold
// Datasus provides multiple data formats; many distributions are in DBC/DBF. You may
// need to convert DBC -> DBF -> CSV. This adapter supports CSV/XLSX via env URLs or local path.

const DATASUS_CSV_URL = process.env.DATASUS_CSV_URL || ''
const DATASUS_XLSX_URL = process.env.DATASUS_XLSX_URL || ''

interface DatasusRow {
  Codigo?: string
  COD?: string
  codigo?: string
  Descricao?: string
  DESCRICAO?: string
  title?: string
  OBS?: string
  OBSERVACAO?: string
  Detalhe?: string
  DETALHE?: string
  parent?: string
}

export const datasusCid10Adapter: ExternalFetchAdapter<DatasusRow> = {
  name: 'DATASUS-CID10',
  sourceType: 'ICD10',
  async version() { return new Date().toISOString().slice(0,10) },
  async fetchList() {
    if (DATASUS_CSV_URL) {
      const buf = await fetchRawToBuffer(DATASUS_CSV_URL)
      const parsed = Papa.parse<DatasusRow>(buf.toString('utf8'), { header: true, skipEmptyLines: true })
      if (parsed.errors.length) throw new Error('Datasus CSV parse: ' + parsed.errors[0].message)
      return parsed.data
    }
    if (DATASUS_XLSX_URL) {
      const buf = await fetchRawToBuffer(DATASUS_XLSX_URL)
      const wb = XLSX.read(buf, { type: 'buffer' })
      const sheet = wb.Sheets[wb.SheetNames[0]]
      const json = XLSX.utils.sheet_to_json<DatasusRow>(sheet, { defval: undefined })
      return json
    }
    throw new Error('DATASUS_CSV_URL or DATASUS_XLSX_URL environment variable not configured')
  },
  mapRecord(row) {
    const code = row.Codigo || row.COD || row.codigo
    const title = row.Descricao || row.DESCRICAO || row.title
    if (!code || !title) {
      throw new Error('Registro Datasus sem código ou título válido')
    }
    const description = row.OBS || row.OBSERVACAO || row.Detalhe || row.DETALHE
    return { code, display: title, description, parentCode: row.parent }
  }
}
