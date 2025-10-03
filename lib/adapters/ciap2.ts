import { ExternalFetchAdapter } from '@/lib/external-updates-service'

interface CIAP2Row { code: string; label: string; group?: string; description?: string }

export const ciap2Adapter: ExternalFetchAdapter<CIAP2Row> = {
  name: 'CIAP2',
  sourceType: 'CIAP2',
  async version() { return 'v1-mock' },
  async fetchList() {
    // TODO: Replace with official CIAP-II dataset ingestion
    return [
      { code: 'A01', label: 'Dor generalizada' },
      { code: 'A02', label: 'Escalafrio / febre' }
    ]
  },
  mapRecord(r) { return { code: r.code, display: r.label, description: r.description } }
}
