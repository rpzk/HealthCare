'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { 
  HeartPulse, 
  ArrowLeft,
  Activity,
  Thermometer,
  Droplets,
  Wind,
  Scale,
  Ruler,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  
  LineChart
} from 'lucide-react'
import Link from 'next/link'
import { format, parseISO, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface VitalSign {
  id: string
  type: string
  value: number
  unit: string
  recordedAt: string
  notes?: string
}

interface VitalSummary {
  type: string
  label: string
  icon: typeof HeartPulse
  color: string
  bgColor: string
  latestValue?: number
  unit: string
  trend?: 'up' | 'down' | 'stable'
  normalRange?: string
}

const vitalTypes: VitalSummary[] = [
  { 
    type: 'BLOOD_PRESSURE_SYSTOLIC', 
    label: 'Pressão Arterial', 
    icon: Activity, 
    color: 'text-red-600', 
    bgColor: 'bg-red-100 dark:bg-red-900/50',
    unit: 'mmHg',
    normalRange: '120/80'
  },
  { 
    type: 'HEART_RATE', 
    label: 'Frequência Cardíaca', 
    icon: HeartPulse, 
    color: 'text-pink-600', 
    bgColor: 'bg-pink-100 dark:bg-pink-900/50',
    unit: 'bpm',
    normalRange: '60-100'
  },
  { 
    type: 'TEMPERATURE', 
    label: 'Temperatura', 
    icon: Thermometer, 
    color: 'text-orange-600', 
    bgColor: 'bg-orange-100 dark:bg-orange-900/50',
    unit: '°C',
    normalRange: '36.1-37.2'
  },
  { 
    type: 'OXYGEN_SATURATION', 
    label: 'Saturação O₂', 
    icon: Wind, 
    color: 'text-blue-600', 
    bgColor: 'bg-blue-100 dark:bg-blue-900/50',
    unit: '%',
    normalRange: '95-100'
  },
  { 
    type: 'WEIGHT', 
    label: 'Peso', 
    icon: Scale, 
    color: 'text-green-600', 
    bgColor: 'bg-green-100 dark:bg-green-900/50',
    unit: 'kg'
  },
  { 
    type: 'HEIGHT', 
    label: 'Altura', 
    icon: Ruler, 
    color: 'text-purple-600', 
    bgColor: 'bg-purple-100 dark:bg-purple-900/50',
    unit: 'cm'
  },
  { 
    type: 'GLUCOSE', 
    label: 'Glicemia', 
    icon: Droplets, 
    color: 'text-amber-600', 
    bgColor: 'bg-amber-100 dark:bg-amber-900/50',
    unit: 'mg/dL',
    normalRange: '70-100'
  },
]

export default function SinaisVitaisPacientePage() {
  const { data: _session } = useSession()
  const [vitals, setVitals] = useState<VitalSign[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchVitals()
  }, [])

  const fetchVitals = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/patient/vitals')
      if (!response.ok) throw new Error('Falha ao carregar')
      const data = await response.json()
      setVitals(data)
    } catch (error) {
      console.error('Erro ao carregar sinais vitais:', error)
    } finally {
      setLoading(false)
    }
  }

  const getLatestVital = (type: string) => {
    return vitals
      .filter(v => v.type === type)
      .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())[0]
  }

  const getTrend = (type: string): 'up' | 'down' | 'stable' | undefined => {
    const typeVitals = vitals
      .filter(v => v.type === type)
      .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())
    
    if (typeVitals.length < 2) return undefined
    
    const diff = typeVitals[0].value - typeVitals[1].value
    if (Math.abs(diff) < 0.5) return 'stable'
    return diff > 0 ? 'up' : 'down'
  }

  const TrendIcon = ({ trend }: { trend?: 'up' | 'down' | 'stable' }) => {
    if (!trend) return null
    if (trend === 'up') return <TrendingUp className="h-3 w-3 text-red-500" />
    if (trend === 'down') return <TrendingDown className="h-3 w-3 text-green-500" />
    return <Minus className="h-3 w-3 text-gray-400" />
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-950 p-4 pb-24">
        <div className="max-w-2xl mx-auto space-y-4">
          <Skeleton className="h-12 w-full rounded-xl" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-950 pb-24">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/minha-saude">
                <Button variant="ghost" size="icon" className="rounded-full">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-lg font-semibold">Sinais Vitais</h1>
                <p className="text-xs text-muted-foreground">
                  Acompanhe suas medições
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={fetchVitals}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Grade de sinais vitais */}
      <div className="max-w-2xl mx-auto px-4 py-4">
        <div className="grid grid-cols-2 gap-3">
          {vitalTypes.map((vitalType) => {
            const latest = getLatestVital(vitalType.type)
            const trend = getTrend(vitalType.type)
            const Icon = vitalType.icon

            return (
              <Card key={vitalType.type} className="border-0 shadow-md rounded-2xl overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`p-2.5 ${vitalType.bgColor} rounded-xl`}>
                      <Icon className={`h-5 w-5 ${vitalType.color}`} />
                    </div>
                    {trend && <TrendIcon trend={trend} />}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{vitalType.label}</p>
                    {latest ? (
                      <>
                        <p className="text-2xl font-bold">
                          {latest.value}
                          <span className="text-sm font-normal text-muted-foreground ml-1">
                            {vitalType.unit}
                          </span>
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {formatDistanceToNow(parseISO(latest.recordedAt), { 
                            addSuffix: true, 
                            locale: ptBR 
                          })}
                        </p>
                      </>
                    ) : (
                      <p className="text-lg text-muted-foreground">—</p>
                    )}
                    {vitalType.normalRange && (
                      <Badge variant="outline" className="text-[10px] mt-2">
                        Normal: {vitalType.normalRange}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Histórico recente */}
      <div className="max-w-2xl mx-auto px-4 mt-4">
        <h3 className="text-sm font-semibold text-muted-foreground mb-3">Histórico Recente</h3>
        
        {vitals.length === 0 ? (
          <Card className="border-0 shadow-md rounded-2xl">
            <CardContent className="py-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                <LineChart className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100">
                Nenhum registro
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Suas medições aparecerão aqui
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {vitals
              .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())
              .slice(0, 10)
              .map((vital) => {
                const vitalType = vitalTypes.find(v => v.type === vital.type)
                const Icon = vitalType?.icon || Activity

                return (
                  <Card key={vital.id} className="border-0 shadow-sm rounded-xl">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 ${vitalType?.bgColor || 'bg-gray-100'} rounded-lg`}>
                          <Icon className={`h-4 w-4 ${vitalType?.color || 'text-gray-600'}`} />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{vitalType?.label || vital.type}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(parseISO(vital.recordedAt), "dd/MM 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">
                            {vital.value} {vital.unit}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
          </div>
        )}
      </div>
    </div>
  )
}
