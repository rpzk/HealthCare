'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { ConsultationForm } from '@/components/consultations/consultation-form'

export default function NewConsultationContainer() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [patient, setPatient] = useState<any>(null)

  useEffect(() => {
    const patientId = searchParams?.get('patientId')
    if (patientId) {
      // Usar endpoint específico para preview do paciente
      // Não requer estar na care team
      fetch(`/api/consultations/patient-preview/${patientId}`)
        .then(res => {
          if (res.ok) return res.json()
          // Se falhar, apenas retorna null
          return null
        })
        .then(data => {
          if (data) {
            setPatient(data)
          }
        })
        .catch(err => {
          console.log('Paciente não carregado:', err)
          // Continuar mesmo sem carregar os dados
        })
    }
  }, [searchParams])

  type NewConsultationData = Partial<{
    patientId: string
    doctorId: string
    scheduledDate: string
    type: 'ROUTINE' | 'URGENT' | 'EMERGENCY' | 'FOLLOW_UP' | 'PREVENTIVE'
    description: string
    notes: string
    duration: number
    status: string
  }>

  const handleSubmit = async (data: NewConsultationData) => {
    setLoading(true)
    try {
      const res = await fetch('/api/consultations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Falha ao criar consulta')
      }
      router.push('/consultations')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ConsultationForm
      patient={patient}
      onSubmit={handleSubmit}
      onCancel={() => router.back()}
      loading={loading}
    />
  )
}
