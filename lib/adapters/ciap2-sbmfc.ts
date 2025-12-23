import { ExternalFetchAdapter } from '@/lib/external-updates-service'
import { fetchRawToBuffer } from '@/scripts/fetch-raw'
import Papa from 'papaparse'

// CIAP-2 (SBMFC) adapter scaffold
// The SBMFC page (https://www.sbmfc.org.br/ciap-2/) provides resources; verify licensing.
// This adapter supports CSV via env var or local file via DATACIP2_LOCAL_PATH.

const CIAP2_CSV_URL = process.env.CIAP2_CSV_URL || ''

interface Ciap2Row {
  Codigo?: string
  Code?: string
  Titulo?: string
  Title?: string
  Descricao?: string
  Description?: string
}

export const ciap2SbmfcAdapter: ExternalFetchAdapter<Ciap2Row> = {
  name: 'CIAP2-SBMFC',
  sourceType: 'CIAP2',
  async version() { return new Date().toISOString().slice(0,10) },
  async fetchList() {
    if (CIAP2_CSV_URL) {
      const buf = await fetchRawToBuffer(CIAP2_CSV_URL)
      const parsed = Papa.parse<Ciap2Row>(buf.toString('utf8'), { header: true, skipEmptyLines: true })
      if (parsed.errors.length) throw new Error('CIAP2 CSV parse: ' + parsed.errors[0].message)
      return parsed.data
    }
    throw new Error('CIAP2_CSV_URL environment variable not configured')
  },
  mapRecord(row) {
    const code = row.Codigo || row.Code
    const title = row.Titulo || row.Title || row.Descricao || row.Description
    if (!code || !title) {
      throw new Error('Registro CIAP2 sem código ou título válido')
    }
    return { code, display: title, description: row.Descricao || row.Description }
  }
}
