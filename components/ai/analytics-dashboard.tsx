"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  MetricCard, 
  ProgressRing, 
  SimpleBarChart, 
  StatusIndicator 
} from '@/components/ui/analytics'
import { 
  Activity, 
  Brain, 
  Users, 
  AlertTriangle, 
  Clock, 
  TrendingUp, 
  Server,
  Zap
} from 'lucide-react'

interface AIAnalytics {
  totalAnalyses: number
  symptomAnalyses: number
  drugInteractions: number
  medicalSummaries: number
  criticalAlerts: number
  accuracyRate: number
  topSymptoms: Array<{ symptom: string; count: number }>
  topDiagnoses: Array<{ diagnosis: string; count: number }>
  interactionsBySeverity: {
    mild: number
    moderate: number
    severe: number
  }
  dailyUsage: Array<{ date: string; analyses: number }>
  responseTime: {
    average: number
    fastest: number
    slowest: number
  }
}

interface PerformanceMetrics {
  aiServiceStatus: string
  averageResponseTime: number
  successRate: number
  queueSize: number
  activeAnalyses: number
  todayUsage: number
  peakUsageToday: string
  systemLoad: string
}

interface Recommendation {
  type: string
  priority: 'low' | 'medium' | 'high'
  title: string
  description: string
  action: string
}

export function AIAnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<AIAnalytics | null>(null)
  const [performance, setPerformance] = useState<PerformanceMetrics | null>(null)
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true)
    
    try {
      const [analyticsRes, performanceRes, recommendationsRes] = await Promise.all([
        fetch('/api/ai/analytics'),
        fetch('/api/ai/performance'),
        fetch('/api/ai/recommendations')
      ])

      const [analyticsData, performanceData, recommendationsData] = await Promise.all([
        analyticsRes.json(),
        performanceRes.json(),
        recommendationsRes.json()
      ])

      setAnalytics(analyticsData)
      setPerformance(performanceData)
      setRecommendations(recommendationsData)
    } catch (error) {
      console.error('Erro ao buscar dados do dashboard:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData()
    
    // Atualização automática a cada 30 segundos
    const interval = setInterval(() => fetchData(true), 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  const getPriorityVariant = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive'
      case 'medium': return 'secondary'
      case 'low': return 'outline'
      default: return 'secondary'
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics de IA Médica</h1>
          <p className="text-muted-foreground">
            Métricas e insights do sistema de inteligência artificial
          </p>
        </div>
        <Button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          variant="outline"
        >
          {refreshing ? 'Atualizando...' : 'Atualizar'}
        </Button>
      </div>

      {/* Status do Sistema */}
      {performance && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Status do Sistema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatusIndicator
                status={performance.aiServiceStatus as any}
                label="Serviço de IA"
                description={`${performance.activeAnalyses} análises ativas`}
              />
              <StatusIndicator
                status={performance.systemLoad === 'low' ? 'online' : 'warning'}
                label="Carga do Sistema"
                description={`Load: ${performance.systemLoad}`}
              />
              <StatusIndicator
                status={performance.successRate > 95 ? 'online' : 'warning'}
                label="Taxa de Sucesso"
                description={`${performance.successRate}%`}
              />
              <StatusIndicator
                status={performance.queueSize === 0 ? 'online' : 'warning'}
                label="Fila de Processamento"
                description={`${performance.queueSize} na fila`}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Métricas Principais */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total de Análises"
            value={analytics.totalAnalyses.toLocaleString()}
            description="Últimos 30 dias"
            trend="+12%"
            icon={<Activity className="h-4 w-4" />}
          />
          <MetricCard
            title="Precisão da IA"
            value={`${analytics.accuracyRate}%`}
            description="Taxa de acurácia"
            trend="+2.3%"
            icon={<Brain className="h-4 w-4" />}
            variant={analytics.accuracyRate > 90 ? 'success' : 'warning'}
          />
          <MetricCard
            title="Alertas Críticos"
            value={analytics.criticalAlerts}
            description="Casos urgentes detectados"
            icon={<AlertTriangle className="h-4 w-4" />}
            variant={analytics.criticalAlerts > 20 ? 'destructive' : 'default'}
          />
          <MetricCard
            title="Tempo Médio"
            value={`${analytics.responseTime.average}s`}
            description="Resposta da IA"
            trend="-0.5s"
            icon={<Clock className="h-4 w-4" />}
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribuição de Análises */}
        {analytics && (
          <Card>
            <CardHeader>
              <CardTitle>Distribuição de Análises</CardTitle>
              <CardDescription>Tipos de análises realizadas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <ProgressRing
                    value={analytics.symptomAnalyses}
                    max={analytics.totalAnalyses}
                    label="Sintomas"
                    color="blue"
                    size="sm"
                  />
                </div>
                <div>
                  <ProgressRing
                    value={analytics.drugInteractions}
                    max={analytics.totalAnalyses}
                    label="Interações"
                    color="yellow"
                    size="sm"
                  />
                </div>
                <div>
                  <ProgressRing
                    value={analytics.medicalSummaries}
                    max={analytics.totalAnalyses}
                    label="Resumos"
                    color="green"
                    size="sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Análise de Sintomas</span>
                  <span className="font-medium">{analytics.symptomAnalyses}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Interações Medicamentosas</span>
                  <span className="font-medium">{analytics.drugInteractions}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Resumos Médicos</span>
                  <span className="font-medium">{analytics.medicalSummaries}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Sintomas Mais Frequentes */}
        {analytics && (
          <Card>
            <CardHeader>
              <CardTitle>Sintomas Mais Analisados</CardTitle>
              <CardDescription>Top 5 sintomas reportados</CardDescription>
            </CardHeader>
            <CardContent>
              <SimpleBarChart
                data={analytics.topSymptoms.map(item => ({
                  label: item.symptom,
                  value: item.count,
                  color: 'bg-blue-500'
                }))}
              />
            </CardContent>
          </Card>
        )}

        {/* Diagnósticos Comuns */}
        {analytics && (
          <Card>
            <CardHeader>
              <CardTitle>Diagnósticos Frequentes</CardTitle>
              <CardDescription>Principais diagnósticos sugeridos</CardDescription>
            </CardHeader>
            <CardContent>
              <SimpleBarChart
                data={analytics.topDiagnoses.map(item => ({
                  label: item.diagnosis,
                  value: item.count,
                  color: 'bg-green-500'
                }))}
              />
            </CardContent>
          </Card>
        )}

        {/* Interações por Severidade */}
        {analytics && (
          <Card>
            <CardHeader>
              <CardTitle>Interações por Severidade</CardTitle>
              <CardDescription>Classificação das interações medicamentosas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <span className="text-sm font-medium text-green-800">Leve</span>
                  <Badge variant="outline" className="bg-green-100 text-green-800">
                    {analytics.interactionsBySeverity.mild}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                  <span className="text-sm font-medium text-yellow-800">Moderada</span>
                  <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                    {analytics.interactionsBySeverity.moderate}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <span className="text-sm font-medium text-red-800">Severa</span>
                  <Badge variant="outline" className="bg-red-100 text-red-800">
                    {analytics.interactionsBySeverity.severe}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recomendações do Sistema */}
      {recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Recomendações do Sistema
            </CardTitle>
            <CardDescription>
              Sugestões para otimização e melhorias
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recommendations.map((rec, index) => (
                <div key={index} className="flex items-start space-x-3 p-4 border rounded-lg">
                  <div className="mt-1">
                    {rec.type === 'performance' && <Zap className="h-5 w-5 text-blue-500" />}
                    {rec.type === 'accuracy' && <Brain className="h-5 w-5 text-green-500" />}
                    {rec.type === 'usage' && <Users className="h-5 w-5 text-purple-500" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{rec.title}</h4>
                      <Badge variant={getPriorityVariant(rec.priority)}>
                        {rec.priority}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {rec.description}
                    </p>
                    <p className="text-sm font-medium text-blue-600">
                      Ação recomendada: {rec.action}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
