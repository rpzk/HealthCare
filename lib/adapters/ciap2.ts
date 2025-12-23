import { ExternalFetchAdapter } from '@/lib/external-updates-service'

interface CIAP2Row { code: string; label: string; group?: string; description?: string }

export const ciap2Adapter: ExternalFetchAdapter<CIAP2Row> = {
  name: 'CIAP2',
  sourceType: 'CIAP2',
  async version() { throw new Error('CIAP2 adapter not configured - set CIAP2_CSV_URL environment variable') },
  async fetchList() {
    throw new Error('CIAP2 data source not configured. Please configure CIAP2_CSV_URL environment variable.')
  },
  mapRecord(r) { return { code: r.code, display: r.label, description: r.description } }
}
