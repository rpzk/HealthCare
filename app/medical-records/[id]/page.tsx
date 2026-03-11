'use client'

import { useParams } from 'next/navigation'
import { MedicalRecordDetail } from '@/components/medical-records/medical-record-detail'

export default function MedicalRecordDetailPage() {
  const params = useParams()
  const recordId = (params?.id as string) || ''

  return (
    <div className="space-y-6">
      <MedicalRecordDetail recordId={recordId} userRole="DOCTOR" />
    </div>
  )
}
