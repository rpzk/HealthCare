import { ExternalFetchAdapter } from '@/lib/external-updates-service'
import { fetchRawToBuffer } from '@/scripts/fetch-raw'
import Papa from 'papaparse'
import ExcelJS from 'exceljs'

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
      const workbook = new ExcelJS.Workbook()
      // Ensure a concrete Node Buffer type for ExcelJS typings.
      await workbook.xlsx.load(Buffer.from(buf) as any)
      const worksheet = workbook.worksheets[0]
      if (!worksheet) return []

      const headerRow = worksheet.getRow(1)
      const headerValues = (headerRow.values ?? []) as unknown[]
      const headers = headerValues
        .slice(1)
        .map((value) => (value === null || value === undefined ? '' : String(value)))

      const out: DatasusRow[] = []
      worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber === 1) return
        const values = (row.values ?? []) as unknown[]
        const record: Record<string, unknown> = {}
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
          out.push(record as DatasusRow)
        }
      })

      return out
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
