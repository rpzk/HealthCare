'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ConsultationForm } from '@/components/consultations/consultation-form'

export default function NewConsultationContainer() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

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
      onSubmit={handleSubmit}
      onCancel={() => router.back()}
      loading={loading}
    />
  )
}
