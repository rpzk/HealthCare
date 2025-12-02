'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { VitalsDashboard } from '@/components/vitals/vitals-dashboard'
import { AddDeviceDialog } from '@/components/vitals/add-device-dialog'
import { ManualReadingDialog } from '@/components/vitals/manual-reading-dialog'
import { Smartphone, Search, User } from 'lucide-react'

interface Patient {
  id: string
  name: string
  email: string
}

export default function DevicesPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [patients, setPatients] = useState<Patient[]>([])
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [loading, setLoading] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const searchPatients = async () => {
    if (searchTerm.length < 2) return
    
    setLoading(true)
    try {
      const res = await fetch(`/api/patients?search=${encodeURIComponent(searchTerm)}&limit=10`)
      if (res.ok) {
        const data = await res.json()
        setPatients(data.patients || data || [])
      }
    } catch (error) {
      console.error('Error searching patients:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = () => {
    setRefreshKey(k => k + 1)
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Smartphone className="h-8 w-8 text-blue-600" />
          Dispositivos de Saúde
        </h1>
        <p className="text-gray-600 mt-1">
          Conecte wearables e monitore dados de saúde em tempo real
        </p>
      </div>

      {/* Busca de Paciente */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Selecionar Paciente</CardTitle>
          <CardDescription>
            Busque um paciente para visualizar ou gerenciar seus dispositivos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por nome, CPF ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchPatients()}
                className="pl-10"
              />
            </div>
            <Button onClick={searchPatients} disabled={loading}>
              {loading ? 'Buscando...' : 'Buscar'}
            </Button>
          </div>

          {/* Resultados da busca */}
          {patients.length > 0 && !selectedPatient && (
            <div className="mt-4 space-y-2">
              {patients.map(patient => (
                <div
                  key={patient.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelectedPatient(patient)}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-full">
                      <User className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">{patient.name}</p>
                      <p className="text-sm text-gray-500">{patient.email}</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    Selecionar
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Paciente selecionado */}
          {selectedPatient && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500 rounded-full">
                  <User className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-medium">{selectedPatient.name}</p>
                  <p className="text-sm text-gray-600">{selectedPatient.email}</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedPatient(null)
                  setPatients([])
                }}
              >
                Trocar Paciente
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dashboard de Vitais */}
      {selectedPatient ? (
        <div className="space-y-6">
          {/* Ações */}
          <div className="flex gap-2 justify-end">
            <ManualReadingDialog
              patientId={selectedPatient.id}
              onReadingAdded={handleRefresh}
            />
            <AddDeviceDialog
              patientId={selectedPatient.id}
              onDeviceAdded={handleRefresh}
            />
          </div>

          {/* Dashboard */}
          <VitalsDashboard
            key={refreshKey}
            patientId={selectedPatient.id}
          />
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Smartphone className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-600">
              Selecione um paciente
            </h3>
            <p className="text-gray-500 mt-2">
              Use a busca acima para encontrar um paciente e visualizar seus dados de dispositivos
            </p>
          </CardContent>
        </Card>
      )}

      {/* Informações sobre integração */}
      <Card className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50">
        <CardContent className="p-6">
          <h3 className="font-bold text-lg mb-4">📱 Como funciona a integração?</h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-semibold text-blue-700 mb-2">Apple Health / Google Fit</h4>
              <p className="text-sm text-gray-600">
                Através do nosso app mobile (em desenvolvimento), você poderá sincronizar 
                automaticamente todos os dados de saúde do seu iPhone ou Android.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-purple-700 mb-2">Dispositivos Diretos</h4>
              <p className="text-sm text-gray-600">
                Alguns dispositivos como balanças WiFi e monitores Bluetooth podem ser 
                conectados diretamente ao sistema.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-green-700 mb-2">Entrada Manual</h4>
              <p className="text-sm text-gray-600">
                Enquanto isso, você pode registrar manualmente as medições dos seus 
                dispositivos usando o botão "Registrar Medição Manual".
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
