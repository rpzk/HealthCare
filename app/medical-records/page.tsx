'use client'

import { MedicalRecordsList } from '@/components/medical-records/medical-records-list'

export default function MedicalRecordsPage() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      <MedicalRecordsList userRole="DOCTOR" />
    </div>
  )
}
