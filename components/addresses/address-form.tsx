"use client"
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { MapPicker } from '@/components/map/map-picker'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { useEffect } from 'react'

export function AddressForm({ patientId, onSaved }: { patientId: string, onSaved?: () => void }) {
  const [form, setForm] = useState<any>({ city: '', state: '', street: '', zipCode: '' })
  const [coords, setCoords] = useState<{ lat: number, lng: number } | undefined>(undefined)
  const [saving, setSaving] = useState(false)
  const [microAreas, setMicroAreas] = useState<any[]>([])
  const [microAreaId, setMicroAreaId] = useState<string | undefined>()

  useEffect(() => {
    fetch('/api/micro-areas').then(r => r.json()).then(setMicroAreas).catch(()=>{})
  }, [])

  async function saveAddress() {
    setSaving(true)
    try {
      const res = await fetch('/api/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          patientId,
          latitude: coords?.lat,
          longitude: coords?.lng,
          isPrimary: true,
          microAreaId
        })
      })
      if (!res.ok) throw new Error('Falha ao salvar endereço')
      onSaved?.()
      setForm({ city: '', state: '', street: '', zipCode: '' })
      setCoords(undefined)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Input placeholder="Rua" value={form.street} onChange={e => setForm((f:any) => ({ ...f, street: e.target.value }))} />
        <Input placeholder="Número" value={form.number} onChange={e => setForm((f:any) => ({ ...f, number: e.target.value }))} />
        <Input placeholder="Bairro" value={form.neighborhood} onChange={e => setForm((f:any) => ({ ...f, neighborhood: e.target.value }))} />
        <Input placeholder="Cidade" value={form.city} onChange={e => setForm((f:any) => ({ ...f, city: e.target.value }))} />
        <Input placeholder="UF" value={form.state} onChange={e => setForm((f:any) => ({ ...f, state: e.target.value }))} />
        <Input placeholder="CEP" value={form.zipCode} onChange={e => setForm((f:any) => ({ ...f, zipCode: e.target.value }))} />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Localização no mapa</label>
        <MapPicker value={coords} onChange={setCoords} />
        <p className="text-xs text-gray-500 mt-1">Clique no mapa para definir latitude/longitude</p>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Micro-área (opcional)</label>
        <Select value={microAreaId} onValueChange={(v)=>setMicroAreaId(v)}>
          <SelectTrigger>
            <SelectValue placeholder="Selecionar micro-área" />
          </SelectTrigger>
          <SelectContent>
            {microAreas.map((m:any) => (
              <SelectItem key={m.id} value={m.id}>{m.name}{m.code ? ` (${m.code})` : ''}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button onClick={saveAddress} disabled={saving}>{saving ? 'Salvando...' : 'Salvar endereço'}</Button>
    </div>
  )
}
