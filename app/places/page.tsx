"use client"
import { useEffect, useState } from 'react'
import { MapPicker } from '@/components/map/map-picker'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function PlacesPage() {
  const [places, setPlaces] = useState<any[]>([])
  const [form, setForm] = useState<any>({ name: '', category: '' })
  const [coords, setCoords] = useState<{ lat: number, lng: number } | undefined>(undefined)

  async function load() {
    const res = await fetch('/api/places')
    const data = await res.json()
    setPlaces(data)
  }
  useEffect(() => { load() }, [])

  async function save() {
    const res = await fetch('/api/places', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, latitude: coords?.lat, longitude: coords?.lng })
    })
    if (res.ok) { setForm({ name: '', category: '' }); setCoords(undefined); load() }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Locais de Interesse</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Input placeholder="Nome" value={form.name} onChange={e => setForm((f:any) => ({ ...f, name: e.target.value }))} />
          <Input placeholder="Categoria" value={form.category} onChange={e => setForm((f:any) => ({ ...f, category: e.target.value }))} />
          <MapPicker value={coords} onChange={setCoords} />
          <Button onClick={save}>Salvar local</Button>
        </div>
        <div>
          <h2 className="font-semibold mb-2">Cadastrados</h2>
          <ul className="space-y-1">
            {places.map(p => (
              <li key={p.id} className="text-sm">{p.name} — {p.category} {p.latitude && p.longitude ? `(${p.latitude.toFixed(4)}, ${p.longitude.toFixed(4)})` : ''}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
