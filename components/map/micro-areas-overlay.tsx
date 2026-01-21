"use client"
import dynamic from 'next/dynamic'
import { Fragment, useEffect, useState } from 'react'
import type { LatLngExpression } from 'leaflet'
import type { GeoJsonObject } from 'geojson'
import { logger } from '@/lib/logger'

// Lazy import Leaflet objects inside client component
const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false })
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false })
const Popup = dynamic(() => import('react-leaflet').then(m => m.Popup), { ssr: false })
const GeoJSON = dynamic(() => import('react-leaflet').then(m => m.GeoJSON), { ssr: false })

interface MicroArea { id:string; name:string; polygonGeo?:string; centroidLat?:number; centroidLng?:number }
interface Place { id:string; name:string; latitude?:number; longitude?:number; microAreaId?:string }
interface Address { id:string; latitude?:number; longitude?:number; microAreaId?:string; patientId?:string }

export function MicroAreasOverlayMap({ heightClass = 'h-[500px]' }: { heightClass?: string }){
  const [microAreas,setMicroAreas]=useState<MicroArea[]>([])
  const [places,setPlaces]=useState<Place[]>([])
  const [addresses,setAddresses]=useState<Address[]>([])
  const [loading,setLoading]=useState(true)

  useEffect(()=>{
    async function load(){
      try {
        const [ma,p,addr] = await Promise.all([
          fetch('/api/micro-areas').then(r=>r.json()),
          fetch('/api/places').then(r=>r.json()),
          fetch('/api/addresses').then(r=>r.json())
        ])
        setMicroAreas(ma)
        setPlaces(p)
        setAddresses(addr)
      } finally { setLoading(false) }
    }
    load()
  },[])

  const firstCentroid = microAreas.find(m=>m.centroidLat && m.centroidLng)
  const center: LatLngExpression = firstCentroid
    ? [firstCentroid.centroidLat!, firstCentroid.centroidLng!]
    : [-23.55,-46.63]

  return (
    <div className={`${heightClass} w-full border rounded overflow-hidden relative`}>
      {loading && <div className="absolute z-10 m-2 px-2 py-1 text-xs bg-white/80 rounded">Carregando...</div>}
      <MapContainer center={center} zoom={12} style={{height:'100%',width:'100%'}}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {microAreas.map(ma=>{
          let feature: GeoJsonObject | null = null
          if (ma.polygonGeo){
            try {
              feature = JSON.parse(ma.polygonGeo) as GeoJsonObject
            } catch (err) {
              logger.warn('Invalid polygonGeo for micro-area', ma.id, err)
            }
          }
          return (
            <Fragment key={ma.id}>
              {feature && <GeoJSON key={ma.id} data={feature} />}
              {ma.centroidLat && ma.centroidLng && (
                <Marker position={[ma.centroidLat, ma.centroidLng]} key={ma.id+"-centroid"}>
                  <Popup>
                    <div className="text-sm font-medium">{ma.name}</div>
                    {feature ? <div className="text-xs text-muted-foreground">GeoJSON</div> : null}
                  </Popup>
                </Marker>
              )}
            </Fragment>
          )
        })}
        {places.map(pl => pl.latitude && pl.longitude ? (
          <Marker key={pl.id} position={[pl.latitude, pl.longitude]}>
            <Popup>
              <div className="text-sm font-medium">Place: {pl.name}</div>
              {pl.microAreaId && <div className="text-xs text-muted-foreground">Micro-área: {pl.microAreaId.slice(0,6)}</div>}
            </Popup>
          </Marker>
        ): null)}
        {addresses.map(a => a.latitude && a.longitude ? (
          <Marker key={a.id} position={[a.latitude, a.longitude]}>
            <Popup>
              <div className="text-sm font-medium">Endereço</div>
              {a.microAreaId && <div className="text-xs text-muted-foreground">Micro-área: {a.microAreaId.slice(0,6)}</div>}
              {a.patientId && <div className="text-[10px] text-muted-foreground">Paciente: {a.patientId.slice(0,6)}</div>}
            </Popup>
          </Marker>
        ): null)}
      </MapContainer>
    </div>
  )
}
