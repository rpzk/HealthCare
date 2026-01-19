import { ExternalFetchAdapter } from '@/lib/external-updates-service'

interface NursingItem { code: string; title: string; description?: string; parent?: string }

export const nursingClassificationAdapter: ExternalFetchAdapter<NursingItem> = {
  name: 'NURSING-CLASSIFICATION',
  sourceType: 'NURSING',
  async version() { return 'mock-nursing-v1' },
  async fetchList() {
    // TODO integrate with e.g. CIPE / NANDA / NIC / NOC depending on licensing
    return [
      { code: 'N001', title: 'Ansiedade' },
      { code: 'N002', title: 'Dor aguda' }
    ]
  },
  mapRecord(r) { return { code: r.code, display: r.title, description: r.description, parentCode: r.parent } }
}
