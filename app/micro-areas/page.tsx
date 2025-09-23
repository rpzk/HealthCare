"use client"
import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { MapPicker } from '@/components/map/map-picker'
import { MicroAreasOverlayMap } from '@/components/map/micro-areas-overlay'
// (Editor de polígonos avançado desativado: react-leaflet-draw requer React 19)
// Mantemos somente textarea + mapa de centroid; futura melhoria pode migrar para lib compatível.

interface MicroArea {
  id: string
  name: string
  code?: string
  description?: string
  polygonGeo?: string
  centroidLat?: number
  centroidLng?: number
}

export default function MicroAreasPage() {
  const [items, setItems] = useState<MicroArea[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<any>({ name: '', code: '', description: '' })
  const [centroid, setCentroid] = useState<{ lat: number, lng: number } | undefined>()
  const [polygonGeo, setPolygonGeo] = useState<string>('')
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/micro-areas')
      const data = await res.json()
      setItems(data)
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  async function save() {
    setSaving(true)
    try {
      const res = await fetch('/api/micro-areas', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          polygonGeo: polygonGeo || undefined,
            centroidLat: centroid?.lat,
            centroidLng: centroid?.lng,
        })
      })
      if (!res.ok) throw new Error('Falha ao criar micro-área')
      setForm({ name: '', code: '', description: '' })
      setPolygonGeo('')
      setCentroid(undefined)
      load()
    } finally { setSaving(false) }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Micro-áreas</h1>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <Input placeholder="Nome" value={form.name} onChange={e => setForm((f:any)=>({...f,name:e.target.value}))} />
          <Input placeholder="Código" value={form.code} onChange={e => setForm((f:any)=>({...f,code:e.target.value}))} />
          <Textarea placeholder="Descrição" value={form.description} onChange={e => setForm((f:any)=>({...f,description:e.target.value}))} />
          <div>
            <label className="block text-sm font-medium mb-1">Centro aproximado (centroid)</label>
            <MapPicker value={centroid} onChange={setCentroid} />
            <p className="text-xs text-muted-foreground mt-1">Clique no mapa para definir o centro da micro-área.</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Polígono (GeoJSON Feature/Polygon ou MultiPolygon)</label>
            <Textarea placeholder='{"type":"Feature","geometry":{"type":"Polygon","coordinates":[[[...]]]}}' value={polygonGeo} onChange={e => setPolygonGeo(e.target.value)} className="font-mono text-xs" rows={6} />
            <p className="text-xs text-muted-foreground mt-1">Edição gráfica de polígonos desativada (compatibilidade React 18). Cole GeoJSON válido manualmente.</p>
          </div>
          <Button onClick={save} disabled={saving || !form.name}>{saving ? 'Salvando...' : 'Criar micro-área'}</Button>
        </div>
        <div>
          <h2 className="font-semibold mb-2">Existentes</h2>
          {loading ? <p className="text-sm text-muted-foreground">Carregando...</p> : (
            <ul className="space-y-2">
              {items.map(m => (
                <li key={m.id} className="border rounded p-3 text-sm">
                  <div className="font-medium">{m.name} {m.code ? <span className="text-xs text-muted-foreground">({m.code})</span> : null}</div>
                  {m.description && <div className="text-xs text-muted-foreground mt-1">{m.description}</div>}
                  {(m.centroidLat && m.centroidLng) ? <div className="text-xs text-muted-foreground mt-1">Centroid: {m.centroidLat.toFixed(5)}, {m.centroidLng.toFixed(5)}</div> : null}
                  {m.polygonGeo ? <div className="text-[10px] mt-1 line-clamp-3 break-all text-muted-foreground">GeoJSON: {m.polygonGeo}</div> : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Visualização agregada</h2>
          <MicroAreasOverlayMap />
          <p className="text-xs text-muted-foreground">Mapa demonstra polígonos (quando fornecidos), centroides e locais associados.</p>
        </div>
    </div>
  )
}
