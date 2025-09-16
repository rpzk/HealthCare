'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ConsultationForm } from '@/components/consultations/consultation-form'

export default function NewConsultationContainer() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (data: any) => {
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
