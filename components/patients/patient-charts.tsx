'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Activity, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { format, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface VitalSigns {
  id: string
  measuredAt: string | Date
  weight?: number | null
  height?: number | null
  bloodPressureSystolic?: number | null
  bloodPressureDiastolic?: number | null
  heartRate?: number | null
  temperature?: number | null
  oxygenSaturation?: number | null
}

interface PatientChartsProps {
  vitalSigns: VitalSigns[]
}

export function PatientCharts({ vitalSigns }: PatientChartsProps) {
  if (vitalSigns.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Evolução Clínica
          </CardTitle>
          <CardDescription>
            Gráficos de acompanhamento de sinais vitais
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Não há dados suficientes para gerar gráficos de evolução
          </p>
        </CardContent>
      </Card>
    )
  }

  // Ordenar por data
  const sortedVitals = [...vitalSigns].sort((a, b) => 
    new Date(a.measuredAt).getTime() - new Date(b.measuredAt).getTime()
  )

  // Últimos 6 meses
  const sixMonthsAgo = subMonths(new Date(), 6)
  const recentVitals = sortedVitals.filter(vs => 
    new Date(vs.measuredAt) >= sixMonthsAgo
  )

  // Preparar dados para peso
  const weightData = recentVitals.filter(vs => vs.weight !== null && vs.weight !== undefined)
  const hasWeightData = weightData.length >= 2

  // Preparar dados para pressão arterial
  const bpData = recentVitals.filter(vs => 
    vs.bloodPressureSystolic !== null && vs.bloodPressureSystolic !== undefined
  )
  const hasBPData = bpData.length >= 2

  // Calcular tendências
  const getTrend = (data: VitalSigns[], key: keyof VitalSigns) => {
    if (data.length < 2) return null
    const first = data[0][key] as number
    const last = data[data.length - 1][key] as number
    if (!first || !last) return null
    const diff = last - first
    const percentChange = (diff / first) * 100
    return { diff, percentChange, isIncreasing: diff > 0 }
  }

  const weightTrend = getTrend(weightData, 'weight')
  const bpSystolicTrend = getTrend(bpData, 'bloodPressureSystolic')

  // Criar visualização ASCII simples (sparkline)
  const createSparkline = (data: number[], width: number = 50): string => {
    if (data.length < 2) return '─'.repeat(width)
    
    const min = Math.min(...data)
    const max = Math.max(...data)
    const range = max - min
    
    if (range === 0) return '─'.repeat(width)
    
    const blocks = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█']
    const normalized = data.map(val => Math.floor(((val - min) / range) * (blocks.length - 1)))
    
    // Interpolar para ter exatamente 'width' caracteres
    const step = data.length / width
    const sparkline: string[] = []
    for (let i = 0; i < width; i++) {
      const idx = Math.floor(i * step)
      sparkline.push(blocks[normalized[idx]] || blocks[0])
    }
    
    return sparkline.join('')
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Evolução Clínica
            <span className="text-sm font-normal text-muted-foreground">
              (últimos 6 meses)
            </span>
          </CardTitle>
          <CardDescription>
            Acompanhamento de sinais vitais ao longo do tempo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Peso */}
          {hasWeightData && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-sm">Peso (kg)</h4>
                  {weightTrend && (
                    <div className="flex items-center gap-1 text-xs">
                      {Math.abs(weightTrend.percentChange) < 2 ? (
                        <>
                          <Minus className="h-3 w-3 text-gray-500" />
                          <span className="text-gray-500">Estável</span>
                        </>
                      ) : weightTrend.isIncreasing ? (
                        <>
                          <TrendingUp className="h-3 w-3 text-red-500" />
                          <span className="text-red-500">
                            +{weightTrend.diff.toFixed(1)} kg ({weightTrend.percentChange.toFixed(1)}%)
                          </span>
                        </>
                      ) : (
                        <>
                          <TrendingDown className="h-3 w-3 text-green-500" />
                          <span className="text-green-500">
                            {weightTrend.diff.toFixed(1)} kg ({weightTrend.percentChange.toFixed(1)}%)
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </div>
                <div className="text-sm font-semibold">
                  {weightData[weightData.length - 1].weight?.toFixed(1)} kg
                </div>
              </div>
              
              <div className="bg-muted rounded p-2 font-mono text-xs overflow-x-auto">
                {createSparkline(weightData.map(d => d.weight!), 60)}
              </div>
              
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>{format(new Date(weightData[0].measuredAt), 'dd MMM', { locale: ptBR })}</span>
                <span>{weightData.length} aferições</span>
                <span>{format(new Date(weightData[weightData.length - 1].measuredAt), 'dd MMM', { locale: ptBR })}</span>
              </div>
            </div>
          )}

          {/* Pressão Arterial Sistólica */}
          {hasBPData && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-sm">Pressão Arterial Sistólica (mmHg)</h4>
                  {bpSystolicTrend && (
                    <div className="flex items-center gap-1 text-xs">
                      {Math.abs(bpSystolicTrend.percentChange) < 5 ? (
                        <>
                          <Minus className="h-3 w-3 text-gray-500" />
                          <span className="text-gray-500">Estável</span>
                        </>
                      ) : bpSystolicTrend.isIncreasing ? (
                        <>
                          <TrendingUp className="h-3 w-3 text-red-500" />
                          <span className="text-red-500">
                            +{bpSystolicTrend.diff.toFixed(0)} mmHg
                          </span>
                        </>
                      ) : (
                        <>
                          <TrendingDown className="h-3 w-3 text-green-500" />
                          <span className="text-green-500">
                            {bpSystolicTrend.diff.toFixed(0)} mmHg
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </div>
                <div className="text-sm font-semibold">
                  {bpData[bpData.length - 1].bloodPressureSystolic} mmHg
                </div>
              </div>
              
              <div className="bg-muted rounded p-2 font-mono text-xs overflow-x-auto">
                {createSparkline(bpData.map(d => d.bloodPressureSystolic!), 60)}
              </div>
              
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>{format(new Date(bpData[0].measuredAt), 'dd MMM', { locale: ptBR })}</span>
                <span>{bpData.length} aferições</span>
                <span>{format(new Date(bpData[bpData.length - 1].measuredAt), 'dd MMM', { locale: ptBR })}</span>
              </div>

              {bpData[bpData.length - 1].bloodPressureSystolic! >= 140 && (
                <div className="mt-2 p-2 bg-red-50 dark:bg-red-950/10 border border-red-200 rounded text-xs text-red-700">
                  <strong>Atenção:</strong> Pressão arterial elevada detectada
                </div>
              )}
            </div>
          )}

          {/* Frequência Cardíaca */}
          {recentVitals.filter(vs => vs.heartRate).length >= 2 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-sm">Frequência Cardíaca (bpm)</h4>
                <div className="text-sm font-semibold">
                  {recentVitals.filter(vs => vs.heartRate).slice(-1)[0].heartRate} bpm
                </div>
              </div>
              
              <div className="bg-muted rounded p-2 font-mono text-xs overflow-x-auto">
                {createSparkline(
                  recentVitals.filter(vs => vs.heartRate).map(d => d.heartRate!), 
                  60
                )}
              </div>
              
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>
                  {format(
                    new Date(recentVitals.filter(vs => vs.heartRate)[0].measuredAt), 
                    'dd MMM', 
                    { locale: ptBR }
                  )}
                </span>
                <span>{recentVitals.filter(vs => vs.heartRate).length} aferições</span>
                <span>
                  {format(
                    new Date(recentVitals.filter(vs => vs.heartRate).slice(-1)[0].measuredAt), 
                    'dd MMM', 
                    { locale: ptBR }
                  )}
                </span>
              </div>
            </div>
          )}

          {/* IMC (se houver peso e altura) */}
          {recentVitals.filter(vs => vs.weight && vs.height).length >= 2 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-sm">IMC (Índice de Massa Corporal)</h4>
                {(() => {
                  const latest = recentVitals.filter(vs => vs.weight && vs.height).slice(-1)[0]
                  const imc = latest.weight! / Math.pow(latest.height! / 100, 2)
                  return (
                    <div className="text-sm font-semibold">
                      {imc.toFixed(1)}
                    </div>
                  )
                })()}
              </div>
              
              <div className="bg-muted rounded p-2 font-mono text-xs overflow-x-auto">
                {createSparkline(
                  recentVitals
                    .filter(vs => vs.weight && vs.height)
                    .map(vs => vs.weight! / Math.pow(vs.height! / 100, 2)), 
                  60
                )}
              </div>
              
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>
                  {format(
                    new Date(recentVitals.filter(vs => vs.weight && vs.height)[0].measuredAt), 
                    'dd MMM', 
                    { locale: ptBR }
                  )}
                </span>
                <span>{recentVitals.filter(vs => vs.weight && vs.height).length} cálculos</span>
                <span>
                  {format(
                    new Date(recentVitals.filter(vs => vs.weight && vs.height).slice(-1)[0].measuredAt), 
                    'dd MMM', 
                    { locale: ptBR }
                  )}
                </span>
              </div>
            </div>
          )}

          {/* Mensagem se não houver dados suficientes */}
          {!hasWeightData && !hasBPData && recentVitals.filter(vs => vs.heartRate).length < 2 && (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-2 opacity-30" />
              <p className="text-sm">
                Dados insuficientes para gerar gráficos
              </p>
              <p className="text-xs mt-1">
                Registre sinais vitais em consultas para visualizar tendências
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
