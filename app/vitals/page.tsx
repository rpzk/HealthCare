'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Activity, Heart, Thermometer, Eye, User, Plus, TrendingUp } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { PageHeader } from '@/components/navigation/page-header'
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts'

interface VitalSign {
  id: string
  systolicBP: number | null
  diastolicBP: number | null
  heartRate: number | null
  temperature: number | null
  respiratoryRate: number | null
  oxygenSaturation: number | null
  weight?: number | null
  height?: number | null
  bmi?: number | null
  bloodGlucose?: number | null
  notes?: string | null
  recordedAt: string
}

interface NewVitalForm {
  systolicBP?: number
  diastolicBP?: number
  heartRate?: number
  respiratoryRate?: number
  temperature?: number
  oxygenSaturation?: number
  weight?: number
  height?: number
  notes?: string
}

export default function VitalSignsPage() {
  const [loading, setLoading] = useState(true)
  const [vitalSigns, setVitalSigns] = useState<VitalSign[]>([])
  const [showNewForm, setShowNewForm] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredSigns, setFilteredSigns] = useState<VitalSign[]>([])
  const [form, setForm] = useState<NewVitalForm>({})
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/patient/vitals')
        if (!res.ok) throw new Error('Falha ao carregar sinais vitais')
        const data = (await res.json()) as VitalSign[]
        setVitalSigns(data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  useEffect(() => {
    if (searchTerm) {
      const filtered = vitalSigns.filter(sign =>
        `${sign.notes || ''}`.toLowerCase().includes(searchTerm.toLowerCase())
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

  const chartData = useMemo(() => {
    return [...vitalSigns]
      .sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime())
      .map((v) => ({
        date: new Date(v.recordedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        systolic: v.systolicBP ?? null,
        diastolic: v.diastolicBP ?? null,
        hr: v.heartRate ?? null,
        spo2: v.oxygenSaturation ?? null,
        temp: v.temperature ?? null,
      }))
  }, [vitalSigns])

  const highBPCount = filteredSigns.filter(sign => (sign.systolicBP ?? 0) >= 140 || (sign.diastolicBP ?? 0) >= 90).length
  const feverCount = filteredSigns.filter(sign => (sign.temperature ?? 0) >= 37.5).length
  const lowSpO2Count = filteredSigns.filter(sign => (sign.oxygenSaturation ?? 100) < 95).length

  const getBMIStatus = (bmi: number) => {
    if (bmi < 18.5) return { label: 'Abaixo do peso', color: 'bg-blue-100 text-blue-800' }
    if (bmi < 25) return { label: 'Peso normal', color: 'bg-green-100 text-green-800' }
    if (bmi < 30) return { label: 'Sobrepeso', color: 'bg-yellow-100 text-yellow-800' }
    return { label: 'Obesidade', color: 'bg-red-100 text-red-800' }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background transition-colors duration-300">
        <Header />
        <div className="flex pt-32">
          <Sidebar />
          <main className="flex-1 ml-64 p-6">
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <Header />
      <div className="flex pt-32">
        <Sidebar />
        <main className="flex-1 ml-64 p-6 space-y-6">
          <PageHeader
            title="Sinais Vitais"
            description="Monitoramento e registro dos sinais vitais"
            breadcrumbs={[{ label: 'Sinais Vitais' }]}
            showBackButton={false}
            actions={
              <Button
                onClick={() => setShowNewForm(!showNewForm)}
                className="flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Novo Registro</span>
              </Button>
            }
          />

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
                    <p className="text-2xl font-bold text-red-600">{highBPCount}</p>
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
                    <p className="text-2xl font-bold text-orange-600">{feverCount}</p>
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
                    <p className="text-2xl font-bold text-blue-600">{lowSpO2Count}</p>
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
                  placeholder="Buscar em observações..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1"
                />
              </div>
            </CardContent>
          </Card>

          {/* Tendências */}
          {chartData.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Tendências recentes</CardTitle>
                <CardDescription>Visualize evolução de pressão, FC e SpO₂</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="h-60">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                        <XAxis dataKey="date" fontSize={12} />
                        <YAxis label={{ value: 'mmHg', angle: -90, position: 'insideLeft', fontSize: 12 }} fontSize={12} />
                        <Tooltip />
                        <Line type="monotone" dataKey="systolic" name="Sistólica" stroke="#ef4444" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="diastolic" name="Diastólica" stroke="#fb923c" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="h-60">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                        <XAxis dataKey="date" fontSize={12} />
                        <YAxis label={{ value: 'bpm / %', angle: -90, position: 'insideLeft', fontSize: 12 }} fontSize={12} />
                        <Tooltip />
                        <Line type="monotone" dataKey="hr" name="FC" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="spo2" name="SpO₂" stroke="#0ea5e9" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="temp" name="Temp" stroke="#f97316" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Lista de Sinais Vitais */}
          <div className="space-y-4">
            {filteredSigns.map((sign) => {
              const bpStatus = getBPStatus(sign.systolicBP || 0, sign.diastolicBP || 0)
              const tempStatus = getTemperatureStatus(sign.temperature || 0)
              const hrStatus = getHeartRateStatus(sign.heartRate || 0)
              const bmi = calculateBMI(sign.weight || undefined, sign.height || undefined)
              const alerts: string[] = []
              if ((sign.oxygenSaturation ?? 100) < 95) alerts.push('SpO₂ abaixo de 95%')
              if ((sign.heartRate ?? 0) > 100) alerts.push('FC elevada')
              if ((sign.temperature ?? 0) >= 38) alerts.push('Febre')
              if ((sign.systolicBP ?? 0) >= 140 || (sign.diastolicBP ?? 0) >= 90) alerts.push('Pressão elevada')
              
              return (
                <Card key={sign.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-red-100 rounded-lg">
                          <User className="h-5 w-5 text-red-600" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">Registro de Sinais Vitais</CardTitle>
                          <CardDescription>
                            {formatDate(sign.recordedAt)}
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
                      <div className="bg-muted rounded-lg p-3">
                        <div className="flex items-center space-x-2 mb-1">
                          <Heart className="h-4 w-4 text-red-600" />
                          <span className="text-sm font-medium">Pressão Arterial</span>
                        </div>
                        <p className="text-xl font-bold">
                          {sign.systolicBP ?? '--'}/{sign.diastolicBP ?? '--'}
                        </p>
                        <p className="text-xs text-muted-foreground">mmHg</p>
                      </div>

                      {/* Frequência Cardíaca */}
                      <div className="bg-muted rounded-lg p-3">
                        <div className="flex items-center space-x-2 mb-1">
                          <Activity className="h-4 w-4 text-pink-600" />
                          <span className="text-sm font-medium">FC</span>
                        </div>
                        <p className="text-xl font-bold">{sign.heartRate ?? '--'}</p>
                        <p className="text-xs text-muted-foreground">bpm</p>
                        <Badge className={hrStatus.color}>
                          {hrStatus.label}
                        </Badge>
                      </div>

                      {/* Temperatura */}
                      <div className="bg-muted rounded-lg p-3">
                        <div className="flex items-center space-x-2 mb-1">
                          <Thermometer className="h-4 w-4 text-orange-600" />
                          <span className="text-sm font-medium">Temperatura</span>
                        </div>
                        <p className="text-xl font-bold">{sign.temperature ?? '--'}°C</p>
                        <Badge className={tempStatus.color}>
                          {tempStatus.label}
                        </Badge>
                      </div>

                      {/* Respiração e Saturação */}
                      <div className="bg-muted rounded-lg p-3">
                        <div className="flex items-center space-x-2 mb-1">
                          <Eye className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-medium">Respiração</span>
                        </div>
                        <p className="text-lg font-bold">{sign.respiratoryRate ?? '--'} rpm</p>
                        <p className="text-lg font-bold">{sign.oxygenSaturation ?? '--'}% SpO₂</p>
                      </div>

                      {/* Peso e IMC */}
                      {sign.weight !== null && sign.weight !== undefined && (
                        <div className="bg-muted rounded-lg p-3">
                          <div className="flex items-center space-x-2 mb-1">
                            <TrendingUp className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-medium">Antropometria</span>
                          </div>
                          <p className="text-lg font-bold">{sign.weight} kg</p>
                          {sign.height && (
                            <>
                              <p className="text-sm text-gray-600">{sign.height} cm</p>
                              {bmi && (
                                <Badge className={getBMIStatus(parseFloat(bmi)).color}>
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
                    {alerts.length > 0 && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                        <strong>Alertas:</strong> {alerts.join(' · ')}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Formulário rápido */}
          {showNewForm && (
            <Card>
              <CardHeader>
                <CardTitle>Registrar Novos Sinais Vitais</CardTitle>
                <CardDescription>Preencha os campos desejados; os demais são opcionais.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Input type="number" placeholder="Pressão sistólica (mmHg)" value={form.systolicBP ?? ''} onChange={e => setForm(f => ({ ...f, systolicBP: e.target.value ? Number(e.target.value) : undefined }))} />
                <Input type="number" placeholder="Pressão diastólica (mmHg)" value={form.diastolicBP ?? ''} onChange={e => setForm(f => ({ ...f, diastolicBP: e.target.value ? Number(e.target.value) : undefined }))} />
                <Input type="number" placeholder="Frequência cardíaca (bpm)" value={form.heartRate ?? ''} onChange={e => setForm(f => ({ ...f, heartRate: e.target.value ? Number(e.target.value) : undefined }))} />
                <Input type="number" placeholder="Temperatura (°C)" value={form.temperature ?? ''} onChange={e => setForm(f => ({ ...f, temperature: e.target.value ? Number(e.target.value) : undefined }))} step="0.1" />
                <Input type="number" placeholder="Respiração (rpm)" value={form.respiratoryRate ?? ''} onChange={e => setForm(f => ({ ...f, respiratoryRate: e.target.value ? Number(e.target.value) : undefined }))} />
                <Input type="number" placeholder="Saturação (%)" value={form.oxygenSaturation ?? ''} onChange={e => setForm(f => ({ ...f, oxygenSaturation: e.target.value ? Number(e.target.value) : undefined }))} />
                <Input type="number" placeholder="Peso (kg)" value={form.weight ?? ''} onChange={e => setForm(f => ({ ...f, weight: e.target.value ? Number(e.target.value) : undefined }))} step="0.1" />
                <Input type="number" placeholder="Altura (cm)" value={form.height ?? ''} onChange={e => setForm(f => ({ ...f, height: e.target.value ? Number(e.target.value) : undefined }))} />
                <Input placeholder="Observações" value={form.notes ?? ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                <div className="md:col-span-2 lg:col-span-3 flex gap-3 justify-end">
                  <Button variant="outline" onClick={() => setShowNewForm(false)}>Cancelar</Button>
                  <Button onClick={async () => {
                    setSaving(true)
                    try {
                      const res = await fetch('/api/patient/vitals', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(form)
                      })
                      if (!res.ok) throw new Error('Falha ao salvar')
                      const list = await fetch('/api/patient/vitals')
                      const data = (await list.json()) as VitalSign[]
                      setVitalSigns(data)
                      setShowNewForm(false)
                      setForm({})
                    } catch (err) {
                      console.error(err)
                    } finally {
                      setSaving(false)
                    }
                  }} disabled={saving}>
                    {saving ? 'Salvando...' : 'Salvar'}
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
        </main>
      </div>
    </div>
  )
}
