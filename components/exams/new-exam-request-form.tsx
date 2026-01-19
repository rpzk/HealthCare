'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function NewExamRequestForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    patientId: '',
    examType: '',
    description: '',
    priority: 'NORMAL',
    notes: '',
    scheduledDate: ''
  })

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/exam-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          scheduledDate: form.scheduledDate || undefined
        })
      })
      if (!res.ok) throw new Error('Falha ao solicitar exame')
      router.push('/exams')
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
          <Input value={form.patientId} onChange={e => setForm({ ...form, patientId: e.target.value })} required />
        </div>
        <div>
          <label className="block text-sm mb-1">Tipo de Exame *</label>
          <Input value={form.examType} onChange={e => setForm({ ...form, examType: e.target.value })} required />
        </div>
      </div>
      <div>
        <label className="block text-sm mb-1">Descrição *</label>
        <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm mb-1">Prioridade</label>
          <select className="w-full border rounded px-3 py-2" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
            <option value="NORMAL">Normal</option>
            <option value="HIGH">Alta</option>
            <option value="LOW">Baixa</option>
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">Data agendada</label>
          <Input type="datetime-local" value={form.scheduledDate} onChange={e => setForm({ ...form, scheduledDate: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm mb-1">Observações</label>
          <Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
        </div>
      </div>
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>Cancelar</Button>
        <Button type="submit" disabled={loading}>{loading ? 'Enviando...' : 'Solicitar Exame'}</Button>
      </div>
    </form>
  )
}
