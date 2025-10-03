"use client"
import { useEffect, useMemo, useState } from 'react'
import type { ChangeEvent } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { MapPicker } from '@/components/map/map-picker'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'

interface AddressFormState {
  city: string
  state: string
  street: string
  number: string
  neighborhood: string
  zipCode: string
}

interface Coordinates {
  lat: number
  lng: number
}

interface MicroAreaOption {
  id: string
  name: string
  code?: string | null
}

interface AddressFormProps {
  patientId: string
  onSaved?: () => void
}

export function AddressForm({ patientId, onSaved }: AddressFormProps) {
  const [form, setForm] = useState<AddressFormState>({
    city: '',
    state: '',
    street: '',
    number: '',
    neighborhood: '',
    zipCode: ''
  })
  const [coords, setCoords] = useState<Coordinates | undefined>()
  const [saving, setSaving] = useState(false)
  const [microAreas, setMicroAreas] = useState<MicroAreaOption[]>([])
  const [microAreaId, setMicroAreaId] = useState<string | undefined>()

  useEffect(() => {
    let cancelled = false

    async function loadMicroAreas() {
      try {
        const response = await fetch('/api/micro-areas')
        if (!response.ok) return
        const data: unknown = await response.json()
        if (!Array.isArray(data)) return
        const valid = data.filter(isMicroAreaOption)
        if (!cancelled) setMicroAreas(valid)
      } catch {
        if (!cancelled) setMicroAreas([])
      }
    }

    loadMicroAreas()

    return () => {
      cancelled = true
    }
  }, [])

  const handleFieldChange = (field: keyof AddressFormState) => (event: ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target
    setForm((previous) => ({ ...previous, [field]: value }))
  }

  const addressPayload = useMemo(() => ({
    ...form,
    patientId,
    latitude: coords?.lat ?? null,
    longitude: coords?.lng ?? null,
    isPrimary: true,
    microAreaId: microAreaId ?? null
  }), [coords, form, microAreaId, patientId])

  async function saveAddress() {
    setSaving(true)
    try {
      const res = await fetch('/api/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addressPayload)
      })
      if (!res.ok) throw new Error('Falha ao salvar endereço')
      onSaved?.()
      setForm({ city: '', state: '', street: '', neighborhood: '', number: '', zipCode: '' })
      setCoords(undefined)
      setMicroAreaId(undefined)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Input placeholder="Rua" value={form.street} onChange={handleFieldChange('street')} />
        <Input placeholder="Número" value={form.number} onChange={handleFieldChange('number')} />
        <Input placeholder="Bairro" value={form.neighborhood} onChange={handleFieldChange('neighborhood')} />
        <Input placeholder="Cidade" value={form.city} onChange={handleFieldChange('city')} />
        <Input placeholder="UF" value={form.state} onChange={handleFieldChange('state')} />
        <Input placeholder="CEP" value={form.zipCode} onChange={handleFieldChange('zipCode')} />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Localização no mapa</label>
        <MapPicker value={coords} onChange={setCoords} />
        <p className="text-xs text-gray-500 mt-1">Clique no mapa para definir latitude/longitude</p>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Micro-área (opcional)</label>
        <Select value={microAreaId} onValueChange={setMicroAreaId}>
          <SelectTrigger>
            <SelectValue placeholder="Selecionar micro-área" />
          </SelectTrigger>
          <SelectContent>
            {microAreas.map((microArea) => (
              <SelectItem key={microArea.id} value={microArea.id}>
                {microArea.name}
                {microArea.code ? ` (${microArea.code})` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button onClick={saveAddress} disabled={saving}>{saving ? 'Salvando...' : 'Salvar endereço'}</Button>
    </div>
  )
}

function isMicroAreaOption(candidate: unknown): candidate is MicroAreaOption {
  if (!candidate || typeof candidate !== 'object') return false
  const { id, name, code } = candidate as Record<string, unknown>
  if (typeof id !== 'string' || typeof name !== 'string') return false
  if (code !== undefined && code !== null && typeof code !== 'string') return false
  return true
}
