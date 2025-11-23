'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface Medication {
  name: string
  dosage: string
  frequency: string
  duration: string
  instructions?: string
}

interface PrescriptionDetail {
  id: string
  patient: { id: string; name: string }
  doctor: { id: string; name: string; speciality?: string }
  medications: Medication[]
  notes?: string
  status: string
  digitalSignature?: string | null
  createdAt: string | Date
  updatedAt: string | Date
}

export default function PrescriptionDetails({ id }: { id: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [signing, setSigning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<PrescriptionDetail | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/prescriptions/${id}`)
        if (!res.ok) throw new Error('Falha ao carregar prescrição')
        const json = await res.json()
        setData(json)
      } catch (e) {
        setError((e as Error).message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const handleSign = async () => {
    if (!confirm('Deseja assinar digitalmente esta prescrição? Esta ação não pode ser desfeita.')) return
    
    setSigning(true)
    try {
      const res = await fetch(`/api/prescriptions/${id}/sign`, {
        method: 'POST'
      })
      
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erro ao assinar')
      }

      const result = await res.json()
      // Update local state
      setData(prev => prev ? ({ ...prev, digitalSignature: result.signature }) : null)
      alert('Prescrição assinada com sucesso!')
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setSigning(false)
    }
  }

  if (loading) return <div>Carregando...</div>
  if (error) return <div className="text-red-600">Erro: {error}</div>
  if (!data) return <div>Não encontrado</div>

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Prescrição #{data.id}</h3>
          <p className="text-sm text-gray-600">Paciente: {data.patient.name} • Médico: {data.doctor.name}</p>
        </div>
        <div className="space-x-2">
          {!data.digitalSignature && (
            <Button 
              onClick={handleSign} 
              disabled={signing}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {signing ? 'Assinando...' : 'Assinar Digitalmente'}
            </Button>
          )}
          <Button variant="outline" onClick={() => router.push(`/prescriptions/${id}/edit`)}>Editar</Button>
        </div>
      </div>

      {data.digitalSignature && (
        <div className="bg-green-50 border border-green-200 p-3 rounded-md flex items-center text-green-800 text-sm">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          Documento assinado digitalmente. Token: {data.digitalSignature.substring(0, 20)}...
        </div>
      )}

      <Card>
        <CardContent className="p-4 space-y-3">
          <h4 className="font-medium">Medicamentos</h4>
          <ul className="list-disc pl-6 space-y-1">
            {data.medications.map((m, i) => (
              <li key={i}>
                {m.name} — {m.dosage} — {m.frequency} — {m.duration}
                {m.instructions ? ` • ${m.instructions}` : ''}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {data.notes && (
        <Card>
          <CardContent className="p-4">
            <h4 className="font-medium mb-1">Observações</h4>
            <p className="text-gray-700">{data.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
