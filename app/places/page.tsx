"use client"
import { useEffect, useState } from 'react'
import { MapPicker } from '@/components/map/map-picker'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function PlacesPage() {
  const [places, setPlaces] = useState<any[]>([])
  const [form, setForm] = useState<any>({ name: '', category: '' })
  const [coords, setCoords] = useState<{ lat: number, lng: number } | undefined>(undefined)
  const [microAreas, setMicroAreas] = useState<any[]>([])
  const [microAreaId, setMicroAreaId] = useState<string | undefined>()

  async function load() {
    const res = await fetch('/api/places')
    const data = await res.json()
    setPlaces(data)
  }
  async function loadMicroAreas() {
    try { const r = await fetch('/api/micro-areas'); const d = await r.json(); setMicroAreas(d) } catch {}
  }
  useEffect(() => { load(); loadMicroAreas() }, [])

  async function save() {
    const res = await fetch('/api/places', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, latitude: coords?.lat, longitude: coords?.lng, microAreaId })
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
          <div>
            <label className="block text-sm font-medium mb-1">Micro-área (opcional)</label>
            <Select value={microAreaId} onValueChange={(v)=>setMicroAreaId(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar micro-área" />
              </SelectTrigger>
              <SelectContent>
                {microAreas.map((m:any)=>(<SelectItem key={m.id} value={m.id}>{m.name}{m.code?` (${m.code})`:''}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={save}>Salvar local</Button>
        </div>
        <div>
          <h2 className="font-semibold mb-2">Cadastrados</h2>
          <ul className="space-y-1">
            {places.map(p => (
              <li key={p.id} className="text-sm">{p.name} — {p.category} {p.latitude && p.longitude ? `(${p.latitude.toFixed(4)}, ${p.longitude.toFixed(4)})` : ''} {p.microAreaId ? <span className="text-xs text-muted-foreground">[{p.microAreaId.slice(0,6)}]</span>:null}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
