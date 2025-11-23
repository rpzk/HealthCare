"use client"

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { MapPin } from 'lucide-react'
import { AddressSuggestion } from './address-autocomplete'

// Dynamically import the client component with SSR disabled
const MapPickerClient = dynamic(
  () => import('./map-picker-client'),
  { ssr: false }
)

interface AddressMapPickerProps {
  onAddressSelect: (suggestion: AddressSuggestion) => void
  initialLat?: number
  initialLng?: number
}

export function AddressMapPicker({ onAddressSelect, initialLat, initialLng }: AddressMapPickerProps) {
  const [showMap, setShowMap] = useState(false)

  return (
    <div className="space-y-2">
      <Button 
        type="button" 
        variant="outline" 
        onClick={() => setShowMap(!showMap)}
        className="w-full flex items-center justify-center gap-2"
      >
        <MapPin className="h-4 w-4" />
        {showMap ? 'Ocultar Mapa' : 'Selecionar no Mapa'}
      </Button>

      {showMap && (
        <MapPickerClient 
          onAddressSelect={onAddressSelect}
          initialLat={initialLat}
          initialLng={initialLng}
        />
      )}
    </div>
  )
}
