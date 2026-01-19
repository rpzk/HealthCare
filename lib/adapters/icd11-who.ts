import { ExternalFetchAdapter } from '@/lib/external-updates-service'

interface ICD11Entity { code: string; title: string; longTitle?: string; parent?: string }

export const icd11WhoAdapter: ExternalFetchAdapter<ICD11Entity> = {
  name: 'ICD11-WHO',
  sourceType: 'ICD11',
  async version() {
    // Placeholder: Derive from official release tag once integrated
    return new Date().toISOString().slice(0,10)
  },
  async fetchList() {
    // TODO integrate official ICD-11 API (requires API key / browsing API)
    return [
      { code: '1A00', title: 'Cholera', longTitle: 'Cholera', parent: undefined },
      { code: '1A00.0', title: 'Cholera due to Vibrio cholerae 01', parent: '1A00' }
    ]
  },
  mapRecord(r) { return { code: r.code, display: r.title, description: r.longTitle, parentCode: r.parent } }
}
