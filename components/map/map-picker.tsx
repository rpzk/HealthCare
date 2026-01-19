"use client"
import dynamic from 'next/dynamic'
import React from 'react'

const Map = dynamic(() => import('./react-leaflet-map'), { ssr: false })

export function MapPicker({ value, onChange }: { value?: { lat: number, lng: number }, onChange: (v: { lat: number, lng: number }) => void }) {
  return (
    <div style={{ height: 300 }}>
      <Map value={value} onChange={onChange} />
    </div>
  )
}
