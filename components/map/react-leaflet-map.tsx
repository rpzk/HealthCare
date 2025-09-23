"use client"
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import React, { useState, useEffect } from 'react'

// Fix default icon paths in Leaflet when bundling
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.3/dist/images/marker-shadow.png'
})

function ClickHandler({ onClick }: { onClick: (latlng: { lat: number, lng: number }) => void }) {
  useMapEvents({
    click(e: L.LeafletMouseEvent) {
      onClick({ lat: e.latlng.lat, lng: e.latlng.lng })
    }
  })
  return null
}

export default function ReactLeafletMap({ value, onChange }: { value?: { lat: number, lng: number }, onChange: (v: { lat: number, lng: number }) => void }) {
  const [position, setPosition] = useState<{ lat: number, lng: number } | undefined>(value)

  useEffect(() => { setPosition(value) }, [value])

  const center = position || { lat: -23.5505, lng: -46.6333 } // São Paulo

  return (
    <MapContainer center={[center.lat, center.lng]} zoom={13} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickHandler onClick={(latlng) => { setPosition(latlng); onChange(latlng) }} />
      {position && <Marker position={[position.lat, position.lng]} />}
    </MapContainer>
  )
}
