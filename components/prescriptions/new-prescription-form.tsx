'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Medication = {
  name: string
  dosage: string
  frequency: string
  duration: string
  instructions?: string
}

export default function NewPrescriptionForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [patientId, setPatientId] = useState('')
  const [notes, setNotes] = useState('')
  const [medications, setMedications] = useState<Medication[]>([
    { name: '', dosage: '', frequency: '', duration: '' }
  ])

  const addMedication = () => setMedications(prev => [...prev, { name: '', dosage: '', frequency: '', duration: '' }])
  const updateMedication = (idx: number, patch: Partial<Medication>) => {
    setMedications(prev => prev.map((m, i) => i === idx ? { ...m, ...patch } : m))
  }
  const removeMedication = (idx: number) => setMedications(prev => prev.filter((_, i) => i !== idx))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/prescriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId, medications, notes })
      })
      if (!res.ok) throw new Error('Falha ao criar prescrição')
      router.push('/prescriptions')
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm mb-1">ID do Paciente *</label>
          <Input value={patientId} onChange={e => setPatientId(e.target.value)} required />
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
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>Cancelar</Button>
        <Button type="submit" disabled={loading}>{loading ? 'Enviando...' : 'Salvar Prescrição'}</Button>
      </div>
    </form>
  )
}
