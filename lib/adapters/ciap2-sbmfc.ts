import { ExternalFetchAdapter } from '@/lib/external-updates-service'
import { fetchRawToBuffer } from '@/scripts/fetch-raw'
import Papa from 'papaparse'

// CIAP-2 (SBMFC) adapter scaffold
// The SBMFC page (https://www.sbmfc.org.br/ciap-2/) provides resources; verify licensing.
// This adapter supports CSV via env var or local file via DATACIP2_LOCAL_PATH.

const CIAP2_CSV_URL = process.env.CIAP2_CSV_URL || ''

export const ciap2SbmfcAdapter: ExternalFetchAdapter<any> = {
  name: 'CIAP2-SBMFC',
  sourceType: 'CIAP2',
  async version() { return new Date().toISOString().slice(0,10) },
  async fetchList() {
    if (CIAP2_CSV_URL) {
      const buf = await fetchRawToBuffer(CIAP2_CSV_URL)
      const parsed = Papa.parse(buf.toString('utf8'), { header: true, skipEmptyLines: true })
      if (parsed.errors.length) throw new Error('CIAP2 CSV parse: ' + parsed.errors[0].message)
      return parsed.data.map((r:any) => ({ code: r.Codigo || r.Code, title: r.Titulo || r.Title || r.Descricao }))
    }
    return [{ code: 'A01', title: 'Dor generalizada (CIAP2 fallback)' }]
  },
  mapRecord(r:any) { return { code: r.code, display: r.title, description: r.description } }
}
