'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { MedicalRecordForm } from '@/components/medical-records/medical-record-form'

interface InitialData {
  id: string
  title: string
  description: string
  diagnosis?: string
  treatment?: string
  notes?: string
  recordType: 'CONSULTATION' | 'EXAM' | 'PROCEDURE' | 'PRESCRIPTION' | 'OTHER'
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL'
  patientId: string
}

export default function EditMedicalRecordPage() {
  const params = useParams()
  const recordId = (params?.id as string) || ''
  const router = useRouter()
  const [initialData, setInitialData] = useState<InitialData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (recordId) {
      fetchRecord()
    }
  }, [recordId])

  const fetchRecord = async () => {
    try {
      const response = await fetch(`/api/medical-records/${recordId}`)
      if (!response.ok) {
        throw new Error('Prontuário não encontrado')
      }
      const data = await response.json()
      setInitialData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar prontuário')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSuccess = () => {
    router.push(`/medical-records/${recordId}`)
  }

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div>Carregando prontuário...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', padding: '2rem' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ backgroundColor: '#fee2e2', border: '1px solid #fecaca', color: '#991b1b', padding: '1rem', borderRadius: '0.375rem', marginBottom: '1rem' }}>
            {error}
          </div>
          <Link href="/medical-records" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 500 }}>
            ← Voltar para Lista
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', padding: '2rem 0' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '2rem' }}>
        <Link href={`/medical-records/${recordId}`} style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 500 }}>
          ← Voltar para Detalhe
        </Link>
      </div>
      {initialData && (
        <MedicalRecordForm
          recordId={recordId}
          initialData={initialData}
          onSuccess={handleSuccess}
          userRole="DOCTOR"
        />
      )}
    </div>
  )
}
