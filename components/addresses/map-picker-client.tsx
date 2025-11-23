"use client"

import { useState } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { AddressSuggestion } from './address-autocomplete'
import { Loader2 } from 'lucide-react'

// Fix for Leaflet marker icons
const icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

interface MapPickerClientProps {
  onAddressSelect: (suggestion: AddressSuggestion) => void
  initialLat?: number
  initialLng?: number
}

function LocationMarker({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) {
  const [position, setPosition] = useState<L.LatLng | null>(null)
  
  const map = useMapEvents({
    click(e: L.LeafletMouseEvent) {
      setPosition(e.latlng)
      onLocationSelect(e.latlng.lat, e.latlng.lng)
      map.flyTo(e.latlng, map.getZoom())
    },
  })

  return position === null ? null : (
    <Marker position={position} icon={icon} />
  )
}

export default function MapPickerClient({ onAddressSelect, initialLat, initialLng }: MapPickerClientProps) {
  const [loading, setLoading] = useState(false)

  // Default center (São Paulo) if no initial coordinates
  const center: [number, number] = [initialLat || -23.550520, initialLng || -46.633308]

  const handleLocationSelect = async (lat: number, lng: number) => {
    setLoading(true)
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
      const data = await response.json()
      
      if (data && data.address) {
        const suggestion: AddressSuggestion = {
          label: data.display_name,
          street: data.address.road || data.address.pedestrian || '',
          number: data.address.house_number || '',
          neighborhood: data.address.suburb || data.address.neighbourhood || '',
          city: data.address.city || data.address.town || data.address.village || '',
          state: data.address.state || '',
          zipCode: data.address.postcode || '',
          lat: parseFloat(data.lat),
          lng: parseFloat(data.lon)
        }
        onAddressSelect(suggestion)
      }
    } catch (error) {
      console.error('Error fetching address from coordinates:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-[300px] w-full rounded-md border overflow-hidden relative">
      {loading && (
        <div className="absolute inset-0 bg-white/50 z-[1000] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
      <MapContainer 
        center={center} 
        zoom={13} 
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker onLocationSelect={handleLocationSelect} />
        {initialLat && initialLng && (
          <Marker position={[initialLat, initialLng]} icon={icon} />
        )}
      </MapContainer>
    </div>
  )
}
