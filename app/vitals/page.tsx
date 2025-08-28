'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Activity, Heart, Thermometer, Eye, ArrowLeft, User, Calendar, Plus, TrendingUp } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface VitalSign {
  id: string
  patient: {
    id: string
    name: string
  }
  blood_pressure_systolic: number
  blood_pressure_diastolic: number
  heart_rate: number
  temperature: number
  respiratory_rate: number
  oxygen_saturation: number
  weight?: number
  height?: number
  recorded_by: string
  recorded_at: string
  notes?: string
}

export default function VitalSignsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [vitalSigns, setVitalSigns] = useState<VitalSign[]>([])
  const [showNewForm, setShowNewForm] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredSigns, setFilteredSigns] = useState<VitalSign[]>([])

  // Dados simulados para demonstração
  const sampleVitalSigns: VitalSign[] = [
    {
      id: '1',
      patient: { id: '1', name: 'Maria Silva' },
      blood_pressure_systolic: 120,
      blood_pressure_diastolic: 80,
      heart_rate: 72,
      temperature: 36.5,
      respiratory_rate: 16,
      oxygen_saturation: 98,
      weight: 65,
      height: 165,
      recorded_by: 'Enfermeira Ana',
      recorded_at: new Date().toISOString(),
      notes: 'Paciente estável, sem alterações significativas'
    },
    {
      id: '2',
      patient: { id: '2', name: 'João Santos' },
      blood_pressure_systolic: 140,
      blood_pressure_diastolic: 90,
      heart_rate: 85,
      temperature: 37.2,
      respiratory_rate: 18,
      oxygen_saturation: 96,
      weight: 80,
      recorded_by: 'Enfermeira Paula',
      recorded_at: new Date(Date.now() - 86400000).toISOString(),
      notes: 'Pressão arterial elevada, temperatura ligeiramente alta'
    },
    {
      id: '3',
      patient: { id: '3', name: 'Ana Costa' },
      blood_pressure_systolic: 110,
      blood_pressure_diastolic: 70,
      heart_rate: 68,
      temperature: 36.2,
      respiratory_rate: 14,
      oxygen_saturation: 99,
      weight: 58,
      height: 160,
      recorded_by: 'Técnico Roberto',
      recorded_at: new Date(Date.now() - 172800000).toISOString(),
      notes: 'Sinais vitais dentro da normalidade'
    }
  ]

  useEffect(() => {
    // Simular carregamento de dados
    setTimeout(() => {
      setVitalSigns(sampleVitalSigns)
      setLoading(false)
    }, 1000)
  }, [])

  useEffect(() => {
    if (searchTerm) {
      const filtered = vitalSigns.filter(sign =>
        sign.patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sign.recorded_by.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredSigns(filtered)
    } else {
      setFilteredSigns(vitalSigns)
    }
  }, [vitalSigns, searchTerm])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getBPStatus = (systolic: number, diastolic: number) => {
    if (systolic >= 140 || diastolic >= 90) {
      return { label: 'Hipertensão', color: 'bg-red-100 text-red-800' }
    } else if (systolic >= 130 || diastolic >= 85) {
      return { label: 'Pré-hipertensão', color: 'bg-yellow-100 text-yellow-800' }
    } else if (systolic < 90 || diastolic < 60) {
      return { label: 'Hipotensão', color: 'bg-blue-100 text-blue-800' }
    } else {
      return { label: 'Normal', color: 'bg-green-100 text-green-800' }
    }
  }

  const getTemperatureStatus = (temp: number) => {
    if (temp >= 38) {
      return { label: 'Febre', color: 'bg-red-100 text-red-800' }
    } else if (temp >= 37.5) {
      return { label: 'Febrícula', color: 'bg-yellow-100 text-yellow-800' }
    } else if (temp < 35) {
      return { label: 'Hipotermia', color: 'bg-blue-100 text-blue-800' }
    } else {
      return { label: 'Normal', color: 'bg-green-100 text-green-800' }
    }
  }

  const getHeartRateStatus = (hr: number) => {
    if (hr > 100) {
      return { label: 'Taquicardia', color: 'bg-red-100 text-red-800' }
    } else if (hr < 60) {
      return { label: 'Bradicardia', color: 'bg-blue-100 text-blue-800' }
    } else {
      return { label: 'Normal', color: 'bg-green-100 text-green-800' }
    }
  }

  const calculateBMI = (weight?: number, height?: number) => {
    if (!weight || !height) return null
    const heightInMeters = height / 100
    const bmi = weight / (heightInMeters * heightInMeters)
    return bmi.toFixed(1)
  }

  const getBMIStatus = (bmi: number) => {
    if (bmi < 18.5) return { label: 'Abaixo do peso', color: 'bg-blue-100 text-blue-800' }
    if (bmi < 25) return { label: 'Peso normal', color: 'bg-green-100 text-green-800' }
    if (bmi < 30) return { label: 'Sobrepeso', color: 'bg-yellow-100 text-yellow-800' }
    return { label: 'Obesidade', color: 'bg-red-100 text-red-800' }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button 
            variant="outline" 
            onClick={() => router.back()}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Voltar</span>
          </Button>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <Activity className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Sinais Vitais</h1>
              <p className="text-sm text-gray-500">Monitoramento e registro dos sinais vitais</p>
            </div>
          </div>
        </div>
        
        <Button
          onClick={() => setShowNewForm(!showNewForm)}
          className="flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Registrar Sinais</span>
        </Button>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total de Registros</p>
                <p className="text-2xl font-bold">{filteredSigns.length}</p>
              </div>
              <Activity className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Hipertensão</p>
                <p className="text-2xl font-bold text-red-600">
                  {filteredSigns.filter(sign => 
                    sign.blood_pressure_systolic >= 140 || sign.blood_pressure_diastolic >= 90
                  ).length}
                </p>
              </div>
              <Heart className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Febre</p>
                <p className="text-2xl font-bold text-orange-600">
                  {filteredSigns.filter(sign => sign.temperature >= 37.5).length}
                </p>
              </div>
              <Thermometer className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Saturação &lt; 95%</p>
                <p className="text-2xl font-bold text-blue-600">
                  {filteredSigns.filter(sign => sign.oxygen_saturation < 95).length}
                </p>
              </div>
              <Eye className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Busca */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex space-x-4">
            <Input
              placeholder="Buscar por paciente ou profissional..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Lista de Sinais Vitais */}
      <div className="space-y-4">
        {filteredSigns.map((sign) => {
          const bpStatus = getBPStatus(sign.blood_pressure_systolic, sign.blood_pressure_diastolic)
          const tempStatus = getTemperatureStatus(sign.temperature)
          const hrStatus = getHeartRateStatus(sign.heart_rate)
          const bmi = calculateBMI(sign.weight, sign.height)
          
          return (
            <Card key={sign.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <User className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{sign.patient.name}</CardTitle>
                      <CardDescription>
                        Registrado por {sign.recorded_by} • {formatDate(sign.recorded_at)}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge className={bpStatus.color}>
                    {bpStatus.label}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {/* Pressão Arterial */}
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center space-x-2 mb-1">
                      <Heart className="h-4 w-4 text-red-600" />
                      <span className="text-sm font-medium">Pressão Arterial</span>
                    </div>
                    <p className="text-xl font-bold">
                      {sign.blood_pressure_systolic}/{sign.blood_pressure_diastolic}
                    </p>
                    <p className="text-xs text-gray-600">mmHg</p>
                  </div>

                  {/* Frequência Cardíaca */}
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center space-x-2 mb-1">
                      <Activity className="h-4 w-4 text-pink-600" />
                      <span className="text-sm font-medium">FC</span>
                    </div>
                    <p className="text-xl font-bold">{sign.heart_rate}</p>
                    <p className="text-xs text-gray-600">bpm</p>
                    <Badge size="sm" className={hrStatus.color}>
                      {hrStatus.label}
                    </Badge>
                  </div>

                  {/* Temperatura */}
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center space-x-2 mb-1">
                      <Thermometer className="h-4 w-4 text-orange-600" />
                      <span className="text-sm font-medium">Temperatura</span>
                    </div>
                    <p className="text-xl font-bold">{sign.temperature}°C</p>
                    <Badge size="sm" className={tempStatus.color}>
                      {tempStatus.label}
                    </Badge>
                  </div>

                  {/* Respiração e Saturação */}
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center space-x-2 mb-1">
                      <Eye className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium">Respiração</span>
                    </div>
                    <p className="text-lg font-bold">{sign.respiratory_rate} rpm</p>
                    <p className="text-lg font-bold">{sign.oxygen_saturation}% SpO₂</p>
                  </div>

                  {/* Peso e IMC */}
                  {sign.weight && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center space-x-2 mb-1">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium">Antropometria</span>
                      </div>
                      <p className="text-lg font-bold">{sign.weight} kg</p>
                      {sign.height && (
                        <>
                          <p className="text-sm text-gray-600">{sign.height} cm</p>
                          {bmi && (
                            <Badge size="sm" className={getBMIStatus(parseFloat(bmi)).color}>
                              IMC: {bmi}
                            </Badge>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Observações */}
                {sign.notes && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm"><strong>Observações:</strong> {sign.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Formulário rápido (simplificado) */}
      {showNewForm && (
        <Card>
          <CardHeader>
            <CardTitle>Registrar Novos Sinais Vitais</CardTitle>
            <CardDescription>
              Funcionalidade em desenvolvimento - Em breve será possível registrar novos sinais vitais
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Plus className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Formulário de registro será implementado em breve</p>
              <Button 
                onClick={() => setShowNewForm(false)} 
                variant="outline" 
                className="mt-4"
              >
                Fechar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {filteredSigns.length === 0 && !loading && (
        <Card>
          <CardContent className="text-center py-12">
            <Activity className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-xl text-gray-500 mb-2">Nenhum sinal vital registrado</p>
            <p className="text-sm text-gray-400 mb-4">
              {searchTerm ? 'Nenhum resultado encontrado para sua busca' : 'Comece registrando os primeiros sinais vitais'}
            </p>
            <Button onClick={() => setShowNewForm(true)}>
              Registrar Primeiro Sinal Vital
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
