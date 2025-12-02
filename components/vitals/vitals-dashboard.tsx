'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts'
import {
  Heart,
  Activity,
  Thermometer,
  Droplets,
  Scale,
  Wind,
  Moon,
  Footprints,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Smartphone,
  Wifi,
  WifiOff,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  Zap,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface VitalsDashboardProps {
  patientId: string
}

interface DashboardData {
  period: number
  totalReadings: number
  statistics: Record<string, {
    count: number
    min: number
    max: number
    avg: number
    latest: number
    latestAt: string
    trend: 'up' | 'down' | 'stable'
    abnormalCount: number
  }>
  devices: Array<{
    id: string
    deviceName: string
    deviceType: string
    connectionStatus: string
    lastSyncAt: string | null
  }>
  recentAlerts: Array<{
    id: string
    type: string
    value: number
    unit: string
    severity: string
    measuredAt: string
    deviceName?: string
  }>
  chartData: Record<string, Array<{ date: string; value: number }>>
  healthSummary: {
    status: 'excellent' | 'good' | 'attention' | 'alert'
    message: string
    highlights: string[]
    concerns: string[]
  }
}

const READING_TYPE_INFO: Record<string, {
  label: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  unit: string
}> = {
  HEART_RATE: { label: 'Freq. Cardíaca', icon: Heart, color: '#EF4444', unit: 'bpm' },
  BLOOD_PRESSURE_SYSTOLIC: { label: 'PA Sistólica', icon: Activity, color: '#3B82F6', unit: 'mmHg' },
  BLOOD_PRESSURE_DIASTOLIC: { label: 'PA Diastólica', icon: Activity, color: '#8B5CF6', unit: 'mmHg' },
  OXYGEN_SATURATION: { label: 'SpO₂', icon: Wind, color: '#10B981', unit: '%' },
  BLOOD_GLUCOSE: { label: 'Glicemia', icon: Droplets, color: '#F59E0B', unit: 'mg/dL' },
  BODY_TEMPERATURE: { label: 'Temperatura', icon: Thermometer, color: '#EC4899', unit: '°C' },
  WEIGHT: { label: 'Peso', icon: Scale, color: '#6366F1', unit: 'kg' },
  STEPS: { label: 'Passos', icon: Footprints, color: '#22C55E', unit: '' },
  SLEEP_DURATION: { label: 'Sono', icon: Moon, color: '#6366F1', unit: 'h' },
  CALORIES_BURNED: { label: 'Calorias', icon: Zap, color: '#F97316', unit: 'kcal' },
}

const STATUS_CONFIG = {
  excellent: { color: 'bg-green-500', label: 'Excelente', icon: CheckCircle2 },
  good: { color: 'bg-blue-500', label: 'Bom', icon: CheckCircle2 },
  attention: { color: 'bg-yellow-500', label: 'Atenção', icon: AlertTriangle },
  alert: { color: 'bg-red-500', label: 'Alerta', icon: XCircle },
}

export function VitalsDashboard({ patientId }: VitalsDashboardProps) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState(30)

  useEffect(() => {
    loadDashboard()
  }, [patientId, period])

  const loadDashboard = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/devices/dashboard?patientId=${patientId}&period=${period}`)
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } catch (error) {
      console.error('Error loading dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 bg-gray-200 rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Smartphone className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">Nenhum dado de dispositivo encontrado</p>
          <p className="text-sm text-gray-500 mt-2">
            Conecte um dispositivo ou sincronize com o Apple Health/Google Fit
          </p>
        </CardContent>
      </Card>
    )
  }

  const StatusIcon = STATUS_CONFIG[data.healthSummary.status].icon

  return (
    <div className="space-y-6">
      {/* Header com Status Geral */}
      <Card className={`border-l-4 ${
        data.healthSummary.status === 'excellent' ? 'border-l-green-500 bg-green-50' :
        data.healthSummary.status === 'good' ? 'border-l-blue-500 bg-blue-50' :
        data.healthSummary.status === 'attention' ? 'border-l-yellow-500 bg-yellow-50' :
        'border-l-red-500 bg-red-50'
      }`}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-full ${STATUS_CONFIG[data.healthSummary.status].color}`}>
                <StatusIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold">
                  Status de Saúde: {STATUS_CONFIG[data.healthSummary.status].label}
                </h2>
                <p className="text-gray-600">{data.healthSummary.message}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={period}
                onChange={(e) => setPeriod(Number(e.target.value))}
                className="rounded-md border p-2 text-sm"
              >
                <option value={7}>7 dias</option>
                <option value={30}>30 dias</option>
                <option value={90}>90 dias</option>
              </select>
              <Button variant="outline" size="icon" onClick={loadDashboard}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Highlights e Concerns */}
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {data.healthSummary.highlights.length > 0 && (
              <div>
                <h4 className="font-medium text-green-700 mb-2">✓ Pontos Positivos</h4>
                <ul className="space-y-1">
                  {data.healthSummary.highlights.map((h, i) => (
                    <li key={i} className="text-sm text-green-600 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      {h}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {data.healthSummary.concerns.length > 0 && (
              <div>
                <h4 className="font-medium text-amber-700 mb-2">⚠ Pontos de Atenção</h4>
                <ul className="space-y-1">
                  {data.healthSummary.concerns.map((c, i) => (
                    <li key={i} className="text-sm text-amber-600 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Cards de Métricas Principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Object.entries(data.statistics).slice(0, 8).map(([type, stats]) => {
          const info = READING_TYPE_INFO[type] || {
            label: type,
            icon: Activity,
            color: '#888',
            unit: ''
          }
          const Icon = info.icon
          const TrendIcon = stats.trend === 'up' ? TrendingUp :
                           stats.trend === 'down' ? TrendingDown : Minus

          return (
            <Card key={type}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="p-2 rounded-full"
                      style={{ backgroundColor: `${info.color}20` }}
                    >
                      <Icon className={`h-4 w-4`} />
                    </div>
                    <span className="text-sm font-medium text-gray-600">{info.label}</span>
                  </div>
                  <TrendIcon
                    className={`h-4 w-4 ${
                      stats.trend === 'up' ? 'text-red-500' :
                      stats.trend === 'down' ? 'text-green-500' :
                      'text-gray-400'
                    }`}
                  />
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold">{stats.latest.toFixed(type === 'BODY_TEMPERATURE' ? 1 : 0)}</span>
                  <span className="text-sm text-gray-500">{info.unit}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                  <span>Média: {stats.avg.toFixed(1)}</span>
                  <span>{stats.count} medições</span>
                </div>
                {stats.abnormalCount > 0 && (
                  <Badge variant="destructive" className="mt-2">
                    {stats.abnormalCount} alertas
                  </Badge>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Gráficos e Detalhes */}
      <Tabs defaultValue="charts" className="w-full">
        <TabsList>
          <TabsTrigger value="charts">Gráficos</TabsTrigger>
          <TabsTrigger value="devices">Dispositivos</TabsTrigger>
          <TabsTrigger value="alerts">Alertas</TabsTrigger>
        </TabsList>

        <TabsContent value="charts">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Frequência Cardíaca */}
            {data.chartData['HEART_RATE'] && data.chartData['HEART_RATE'].length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="h-5 w-5 text-red-500" />
                    Frequência Cardíaca
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data.chartData['HEART_RATE']}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="date"
                          tickFormatter={(v) => new Date(v).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                        />
                        <YAxis domain={[40, 140]} />
                        <Tooltip
                          labelFormatter={(v) => new Date(v).toLocaleString('pt-BR')}
                          formatter={(v: number) => [`${v} bpm`, 'FC']}
                        />
                        <Area
                          type="monotone"
                          dataKey="value"
                          stroke="#EF4444"
                          fill="#FEE2E2"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Pressão Arterial */}
            {(data.chartData['BLOOD_PRESSURE_SYSTOLIC'] || data.chartData['BLOOD_PRESSURE_DIASTOLIC']) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-blue-500" />
                    Pressão Arterial
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data.chartData['BLOOD_PRESSURE_SYSTOLIC'] || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="date"
                          tickFormatter={(v) => new Date(v).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                        />
                        <YAxis domain={[40, 180]} />
                        <Tooltip
                          labelFormatter={(v) => new Date(v).toLocaleString('pt-BR')}
                        />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke="#3B82F6"
                          name="Sistólica"
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Glicemia */}
            {data.chartData['BLOOD_GLUCOSE'] && data.chartData['BLOOD_GLUCOSE'].length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Droplets className="h-5 w-5 text-amber-500" />
                    Glicemia
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data.chartData['BLOOD_GLUCOSE']}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="date"
                          tickFormatter={(v) => new Date(v).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                        />
                        <YAxis domain={[50, 200]} />
                        <Tooltip
                          labelFormatter={(v) => new Date(v).toLocaleString('pt-BR')}
                          formatter={(v: number) => [`${v} mg/dL`, 'Glicose']}
                        />
                        <Area
                          type="monotone"
                          dataKey="value"
                          stroke="#F59E0B"
                          fill="#FEF3C7"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Passos */}
            {data.chartData['STEPS'] && data.chartData['STEPS'].length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Footprints className="h-5 w-5 text-green-500" />
                    Passos Diários
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data.chartData['STEPS']}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="date"
                          tickFormatter={(v) => new Date(v).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                        />
                        <YAxis />
                        <Tooltip
                          labelFormatter={(v) => new Date(v).toLocaleString('pt-BR')}
                          formatter={(v: number) => [v.toLocaleString(), 'Passos']}
                        />
                        <Area
                          type="monotone"
                          dataKey="value"
                          stroke="#22C55E"
                          fill="#DCFCE7"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="devices">
          <Card>
            <CardHeader>
              <CardTitle>Dispositivos Conectados</CardTitle>
              <CardDescription>
                Gerencie seus dispositivos de saúde
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.devices.length === 0 ? (
                <div className="text-center py-8">
                  <Smartphone className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-600">Nenhum dispositivo conectado</p>
                  <Button className="mt-4">
                    Conectar Dispositivo
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {data.devices.map(device => (
                    <div
                      key={device.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-full ${
                          device.connectionStatus === 'CONNECTED' ? 'bg-green-100' : 'bg-gray-100'
                        }`}>
                          {device.connectionStatus === 'CONNECTED' ? (
                            <Wifi className="h-5 w-5 text-green-600" />
                          ) : (
                            <WifiOff className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                        <div>
                          <h4 className="font-medium">{device.deviceName}</h4>
                          <p className="text-sm text-gray-500">{device.deviceType}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={device.connectionStatus === 'CONNECTED' ? 'default' : 'secondary'}>
                          {device.connectionStatus === 'CONNECTED' ? 'Conectado' : 'Desconectado'}
                        </Badge>
                        {device.lastSyncAt && (
                          <p className="text-xs text-gray-500 mt-1">
                            <Clock className="h-3 w-3 inline mr-1" />
                            {formatDistanceToNow(new Date(device.lastSyncAt), {
                              addSuffix: true,
                              locale: ptBR
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Alertas Recentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.recentAlerts.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p className="text-gray-600">Nenhum alerta no período</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {data.recentAlerts.map(alert => {
                    const info = READING_TYPE_INFO[alert.type] || {
                      label: alert.type,
                      icon: Activity,
                      color: '#888'
                    }
                    return (
                      <div
                        key={alert.id}
                        className={`p-4 rounded-lg border-l-4 ${
                          alert.severity === 'CRITICAL' ? 'border-l-red-500 bg-red-50' :
                          alert.severity === 'HIGH' ? 'border-l-orange-500 bg-orange-50' :
                          alert.severity === 'MEDIUM' ? 'border-l-yellow-500 bg-yellow-50' :
                          'border-l-blue-500 bg-blue-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Badge
                              variant={alert.severity === 'CRITICAL' ? 'destructive' : 'secondary'}
                            >
                              {alert.severity}
                            </Badge>
                            <span className="font-medium">{info.label}</span>
                            <span className="text-lg font-bold">
                              {alert.value} {alert.unit}
                            </span>
                          </div>
                          <span className="text-sm text-gray-500">
                            {formatDistanceToNow(new Date(alert.measuredAt), {
                              addSuffix: true,
                              locale: ptBR
                            })}
                          </span>
                        </div>
                        {alert.deviceName && (
                          <p className="text-sm text-gray-500 mt-1">
                            via {alert.deviceName}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
