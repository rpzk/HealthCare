import { ExternalFetchAdapter } from '@/lib/external-updates-service'

interface NursingItem { code: string; title: string; description?: string; parent?: string }

export const nursingClassificationAdapter: ExternalFetchAdapter<NursingItem> = {
  name: 'NURSING-CLASSIFICATION',
  sourceType: 'NURSING',
  async version() { throw new Error('Nursing classification adapter not configured') },
  async fetchList() {
    throw new Error('Nursing classification data source not configured. Please configure appropriate environment variable.')
  },
  mapRecord(r) { return { code: r.code, display: r.title, description: r.description, parentCode: r.parent } }
}
