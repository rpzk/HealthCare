'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

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
}

export default function PrescriptionEditForm({ id }: { id: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [patientId, setPatientId] = useState('')
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState('ACTIVE')
  const [medications, setMedications] = useState<Medication[]>([])

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/prescriptions/${id}`)
        if (!res.ok) throw new Error('Falha ao carregar prescrição')
        const json: PrescriptionDetail = await res.json()
        setPatientId(json.patient.id)
        setNotes(json.notes || '')
        setStatus(json.status)
        setMedications(json.medications)
      } catch (e) {
        setError((e as Error).message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const addMedication = () => setMedications(prev => [...prev, { name: '', dosage: '', frequency: '', duration: '' }])
  const updateMedication = (idx: number, patch: Partial<Medication>) => {
    setMedications(prev => prev.map((m, i) => i === idx ? { ...m, ...patch } : m))
  }
  const removeMedication = (idx: number) => setMedications(prev => prev.filter((_, i) => i !== idx))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch(`/api/prescriptions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId, medications, notes, status })
      })
      if (!res.ok) throw new Error('Falha ao salvar alterações')
      router.push(`/prescriptions/${id}`)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div>Carregando...</div>
  if (error) return <div className="text-red-600">Erro: {error}</div>

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm mb-1">ID do Paciente *</label>
          <Input value={patientId} onChange={e => setPatientId(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm mb-1">Status</label>
          <select className="w-full border rounded px-2 py-2" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="ACTIVE">Ativa</option>
            <option value="COMPLETED">Concluída</option>
            <option value="CANCELLED">Cancelada</option>
            <option value="EXPIRED">Expirada</option>
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">Observações</label>
          <Input value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="font-medium">Medicamentos</h4>
          <Button type="button" size="sm" onClick={addMedication}>Adicionar</Button>
        </div>
        {medications.map((m, idx) => (
          <div key={idx} className="grid grid-cols-1 md:grid-cols-5 gap-2">
            <Input placeholder="Nome *" value={m.name} onChange={e => updateMedication(idx, { name: e.target.value })} required />
            <Input placeholder="Dosagem *" value={m.dosage} onChange={e => updateMedication(idx, { dosage: e.target.value })} required />
            <Input placeholder="Frequência *" value={m.frequency} onChange={e => updateMedication(idx, { frequency: e.target.value })} required />
            <Input placeholder="Duração *" value={m.duration} onChange={e => updateMedication(idx, { duration: e.target.value })} required />
            <div className="flex gap-2">
              <Input placeholder="Instruções" value={m.instructions || ''} onChange={e => updateMedication(idx, { instructions: e.target.value })} />
              <Button type="button" variant="outline" onClick={() => removeMedication(idx)}>Remover</Button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={saving}>Cancelar</Button>
        <Button type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Salvar Alterações'}</Button>
      </div>
    </form>
  )
}
