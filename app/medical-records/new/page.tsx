'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { MedicalRecordForm } from '@/components/medical-records/medical-record-form'

export default function NewMedicalRecordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const patientId = searchParams?.get('patientId') ?? ''

  const handleSuccess = () => {
    router.push(patientId ? `/patients/${patientId}` : '/medical-records')
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', padding: '2rem 0' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '2rem' }}>
        <Link
          href={patientId ? `/patients/${patientId}` : '/medical-records'}
          style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 500 }}
        >
          {patientId ? '← Voltar ao paciente' : '← Voltar para lista'}
        </Link>
      </div>
      <MedicalRecordForm
        onSuccess={handleSuccess}
        initialData={{
          patientId,
          title: '',
          description: '',
          recordType: 'CONSULTATION',
          priority: 'NORMAL',
        }}
      />
    </div>
  )
}
