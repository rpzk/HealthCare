import { ExternalFetchAdapter } from '@/lib/external-updates-service'
import Papa from 'papaparse'
import { fetchRawToBuffer } from '@/scripts/fetch-raw'

// Expect a CSV with columns: Code, Title, Parent(optional), Description(optional)
// Provide env var ICD10_CSV_URL pointing to official or mirrored dataset.
const ICD10_SOURCE_URL = process.env.ICD10_CSV_URL || ''

interface ICD10Row { Code?: string; Title?: string; Parent?: string; Description?: string }

export const icd10WhoAdapter: ExternalFetchAdapter<ICD10Row> = {
  name: 'ICD10-WHO',
  sourceType: 'ICD10',
  async version() {
    // Simplified versioning: date string. Could be replaced by reading a VERSION file or HTTP Last-Modified header.
    return new Date().toISOString().slice(0,10)
  },
  async fetchList() {
    if (!ICD10_SOURCE_URL) {
      // Fallback minimal dataset (avoid hard failure in dev)
      return [
        { Code: 'A00', Title: 'Cholera', Description: 'Cholera (fallback small set)' },
        { Code: 'A00.0', Title: 'Cholera due to V. cholerae 01', Parent: 'A00' }
      ]
    }
    const buf = await fetchRawToBuffer(ICD10_SOURCE_URL)
    const text = buf.toString('utf8')
    const parsed = Papa.parse<ICD10Row>(text, { header: true, skipEmptyLines: true })
    if (parsed.errors.length) {
      const first = parsed.errors[0]
      throw new Error(`ICD10 CSV parse error: ${first.message} at row ${first.row}`)
    }
  return parsed.data.filter((r: ICD10Row) => r.Code && r.Title)
  },
  mapRecord(r) {
    return { code: r.Code!, display: r.Title!, description: r.Description, parentCode: r.Parent }
  }
}
