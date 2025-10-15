'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { MedicalRecordDetail } from '@/components/medical-records/medical-record-detail'

export default function MedicalRecordDetailPage() {
  const params = useParams()
  const recordId = (params?.id as string) || ''

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', padding: '2rem 0' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '2rem' }}>
        <Link href="/medical-records" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 500 }}>
          ← Voltar para Lista
        </Link>
      </div>
      <MedicalRecordDetail recordId={recordId} userRole="DOCTOR" />
    </div>
  )
}
