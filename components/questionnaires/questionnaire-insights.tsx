'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  AlertTriangle,
  Brain,
  TrendingDown,
  TrendingUp,
  Loader2,
  Lightbulb,
  User,
  Calendar,
  ArrowRight,
  Target,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface InsightItem {
  id: string
  type: 'CONCERN' | 'IMPROVEMENT' | 'PATTERN' | 'RECOMMENDATION'
  title: string
  description: string
  severity: 'low' | 'medium' | 'high'
  patientName: string
  patientId: string
  questionnaireId: string
  questionnaireName: string
  detectedAt: string
  actionable: boolean
  suggestedAction?: string
  relatedMetrics?: Record<string, number>
}

interface Props {
  userId: string
}

export function QuestionnaireInsights({ userId }: Props) {
  const [insights, setInsights] = useState<InsightItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSeverity, setSelectedSeverity] = useState<'all' | 'low' | 'medium' | 'high'>('all')

  useEffect(() => {
    fetchInsights()
    // Refresh every 5 minutes
    const interval = setInterval(fetchInsights, 300000)
    return () => clearInterval(interval)
  }, [])

  async function fetchInsights() {
    try {
      const res = await fetch(`/api/questionnaires/insights?severity=${selectedSeverity}`)
      if (res.ok) {
        const data = await res.json()
        setInsights(data)
      }
    } catch (error) {
      console.error('Erro ao carregar insights:', error)
    } finally {
      setLoading(false)
    }
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'CONCERN':
        return <AlertTriangle className="h-5 w-5 text-red-600" />
      case 'IMPROVEMENT':
        return <TrendingUp className="h-5 w-5 text-green-600" />
      case 'PATTERN':
        return <Brain className="h-5 w-5 text-purple-600" />
      case 'RECOMMENDATION':
        return <Lightbulb className="h-5 w-5 text-amber-600" />
      default:
        return <Lightbulb className="h-5 w-5 text-gray-600" />
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'CONCERN':
        return 'Preocupação'
      case 'IMPROVEMENT':
        return 'Melhoria'
      case 'PATTERN':
        return 'Padrão Identificado'
      case 'RECOMMENDATION':
        return 'Recomendação'
      default:
        return 'Insight'
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-50 border-red-200'
      case 'medium':
        return 'bg-amber-50 border-amber-200'
      case 'low':
        return 'bg-blue-50 border-blue-200'
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  const getSeverityBadgeColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-100 text-red-800'
      case 'medium':
        return 'bg-amber-100 text-amber-800'
      case 'low':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'Alta Prioridade'
      case 'medium':
        return 'Média Prioridade'
      case 'low':
        return 'Baixa Prioridade'
      default:
        return 'Normal'
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  const filteredInsights = insights.filter(i => {
    if (selectedSeverity === 'all') return true
    return i.severity === selectedSeverity
  })

  const highPriorityCount = insights.filter(i => i.severity === 'high').length
  const mediumPriorityCount = insights.filter(i => i.severity === 'medium').length

  return (
    <div className="space-y-6">
      {/* Alert Summary */}
      {highPriorityCount > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>Atenção:</strong> {highPriorityCount} insight{highPriorityCount > 1 ? 's' : ''} de <strong>alta prioridade</strong> requer{highPriorityCount > 1 ? '' : 'm'} ação imediata.
          </AlertDescription>
        </Alert>
      )}

      {/* Filter Buttons */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'high', 'medium', 'low'] as const).map((severity) => (
          <Button
            key={severity}
            variant={selectedSeverity === severity ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedSeverity(severity)}
          >
            {severity === 'all' ? 'Todos' : severity === 'high' ? 'Alta' : severity === 'medium' ? 'Média' : 'Baixa'}
            {severity !== 'all' && (
              <Badge variant="secondary" className="ml-2">
                {insights.filter(i => i.severity === severity).length}
              </Badge>
            )}
          </Button>
        ))}
      </div>

      {/* Insights Grid */}
      <div className="grid gap-4">
        {filteredInsights.length > 0 ? (
          filteredInsights.map((insight) => (
            <div
              key={insight.id}
              className={`p-5 border rounded-lg transition-all ${getSeverityColor(insight.severity)}`}
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className="mt-0.5 flex-shrink-0">
                  {getIcon(insight.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h4 className="font-semibold text-base">
                        {insight.title}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge 
                          className={getSeverityBadgeColor(insight.severity)}
                          variant="secondary"
                        >
                          {getSeverityLabel(insight.severity)}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {getTypeLabel(insight.type)}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                    {insight.description}
                  </p>

                  {/* Metrics if available */}
                  {insight.relatedMetrics && Object.keys(insight.relatedMetrics).length > 0 && (
                    <div className="mb-3 p-3 bg-white/50 rounded-md">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Métricas Relacionadas:</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {Object.entries(insight.relatedMetrics).map(([key, value]) => (
                          <div key={key} className="text-xs">
                            <p className="text-muted-foreground">{key}</p>
                            <p className="font-semibold">{typeof value === 'number' ? value.toFixed(1) : value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Patient & Questionnaire Info */}
                  <div className="flex flex-col md:flex-row md:items-center gap-3 mb-3 pb-3 border-b text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <User className="h-3 w-3" />
                      <span>{insight.patientName}</span>
                    </div>
                    <div className="hidden md:block">•</div>
                    <span>{insight.questionnaireName}</span>
                    <div className="hidden md:block">•</div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3 w-3" />
                      <span>
                        {formatDistanceToNow(new Date(insight.detectedAt), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Action */}
                  {insight.actionable && (
                    <div className="space-y-3">
                      {insight.suggestedAction && (
                        <div className="flex items-start gap-2 bg-white/70 p-3 rounded-md">
                          <Target className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 text-sm">
                            <p className="font-medium text-amber-900">Ação Sugerida</p>
                            <p className="text-amber-800 mt-0.5">
                              {insight.suggestedAction}
                            </p>
                          </div>
                        </div>
                      )}

                      <Button
                        size="sm"
                        variant="default"
                        asChild
                      >
                        <a href={`/patients/${insight.patientId}?tab=questionnaires`}>
                          Ver Questionário
                          <ArrowRight className="h-3 w-3 ml-2" />
                        </a>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Brain className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">
                {selectedSeverity === 'all'
                  ? 'Nenhum insight disponível no momento'
                  : `Nenhum insight de ${selectedSeverity === 'high' ? 'alta' : selectedSeverity === 'medium' ? 'média' : 'baixa'} prioridade`}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
