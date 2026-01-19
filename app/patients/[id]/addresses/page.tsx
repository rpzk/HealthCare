"use client"
import { AddressForm } from '@/components/addresses/address-form'
import { useEffect, useState } from 'react'

type Address = {
  id: string
  street: string
  number?: string
  neighborhood?: string
  city: string
  state: string
  zipCode?: string
  latitude?: number
  longitude?: number
  isPrimary?: boolean
}

export default function PatientAddressesPage({ params }: { params: { id: string } }) {
  const patientId = params.id
  const [addresses, setAddresses] = useState<Address[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch(`/api/addresses?patientId=${patientId}`)
      const data = await res.json()
      setAddresses(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [patientId])

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Endereços do Paciente</h1>
      <AddressForm patientId={patientId} onSaved={load} />

      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Endereços cadastrados</h2>
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : addresses.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum endereço cadastrado ainda.</p>
        ) : (
          <ul className="divide-y border rounded">
            {addresses.map((a) => (
              <li key={a.id} className="p-3 text-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div>{a.street}{a.number ? `, ${a.number}` : ''}</div>
                    <div className="text-xs text-muted-foreground">{a.neighborhood ? `${a.neighborhood} - ` : ''}{a.city}/{a.state} {a.zipCode || ''}</div>
                    {a.latitude && a.longitude ? (
                      <div className="text-xs text-muted-foreground">Lat/Lng: {a.latitude.toFixed(6)}, {a.longitude.toFixed(6)}</div>
                    ) : null}
                  </div>
                  {a.isPrimary ? <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Principal</span> : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
