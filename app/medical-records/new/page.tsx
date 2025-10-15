'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { MedicalRecordForm } from '@/components/medical-records/medical-record-form'

export default function NewMedicalRecordPage() {
  const router = useRouter()

  const handleSuccess = () => {
    router.push('/medical-records')
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', padding: '2rem 0' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '2rem' }}>
        <Link href="/medical-records" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 500 }}>
          ← Voltar para Lista
        </Link>
      </div>
      <MedicalRecordForm onSuccess={handleSuccess} initialData={{ patientId: '', title: '', description: '', recordType: 'CONSULTATION', priority: 'NORMAL' }} />
    </div>
  )
}
