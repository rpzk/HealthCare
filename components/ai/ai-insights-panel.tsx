'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Brain,
  AlertTriangle,
  Lightbulb,
  TrendingUp,
  Activity,
  Pill,
  FileText,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Stethoscope,
  AlertCircle,
  CheckCircle2
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ============ TIPOS ============

interface AIInsight {
  type: 'suggestion' | 'warning' | 'info' | 'prediction'
  title: string
  description: string
  confidence?: number
  source?: string
  actions?: string[]
}

interface PatientRiskData {
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
  factors: Array<{ name: string; value: string; impact: 'positive' | 'negative' | 'neutral' }>
  recommendations: string[]
}

interface DrugInteractionData {
  hasInteractions: boolean
  interactions: Array<{
    drug1: string
    drug2: string
    severity: 'minor' | 'moderate' | 'major'
    description: string
  }>
}

interface AIInsightsPanelProps {
  patientId: string
  consultationId?: string
  medications?: string[]
  symptoms?: string[]
  className?: string
}

// ============ COMPONENTE PRINCIPAL ============

export function AIInsightsPanel({
  patientId,
  consultationId,
  medications = [],
  symptoms = [],
  className
}: AIInsightsPanelProps) {
  const [loading, setLoading] = useState(true)
  const [insights, setInsights] = useState<AIInsight[]>([])
  const [riskData, setRiskData] = useState<PatientRiskData | null>(null)
  const [drugInteractions, setDrugInteractions] = useState<DrugInteractionData | null>(null)
  const [analysisResult, setAnalysisResult] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [refreshing, setRefreshing] = useState(false)

  // Carregar dados de IA
  const loadInsights = useCallback(async () => {
    try {
      setLoading(true)

      // Carregar múltiplas análises em paralelo
      const [riskResponse, interactionsResponse, analysisResponse] = await Promise.allSettled([
        // Análise de risco do paciente
        fetch(`/api/ai/patient-risk?patientId=${patientId}`),
        // Interações medicamentosas (se houver medicamentos)
        medications.length > 0 
          ? fetch('/api/ai/drug-interactions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ medications })
            })
          : Promise.resolve(null),
        // Análise de sintomas (se houver)
        symptoms.length > 0
          ? fetch('/api/ai/symptom-analysis', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ symptoms, patientId })
            })
          : Promise.resolve(null)
      ])

      // Processar resultados
      const newInsights: AIInsight[] = []

      // Risco do paciente
      if (riskResponse.status === 'fulfilled' && riskResponse.value?.ok) {
        const data = await riskResponse.value.json()
        setRiskData(data)
        
        if (data.riskLevel === 'HIGH') {
          newInsights.push({
            type: 'warning',
            title: 'Paciente de Alto Risco',
            description: 'Este paciente apresenta fatores de risco elevados que requerem atenção especial.',
            confidence: 0.85
          })
        }
      }

      // Interações medicamentosas
      if (interactionsResponse.status === 'fulfilled' && interactionsResponse.value?.ok) {
        const data = await interactionsResponse.value.json()
        setDrugInteractions(data)
        
        if (data.hasInteractions) {
          newInsights.push({
            type: 'warning',
            title: 'Interações Medicamentosas Detectadas',
            description: `${data.interactions.length} interação(ões) potencial(is) entre os medicamentos prescritos.`,
            confidence: 0.9
          })
        }
      }

      // Análise de sintomas
      if (analysisResponse.status === 'fulfilled' && analysisResponse.value?.ok) {
        const data = await analysisResponse.value.json()
        setAnalysisResult(data.analysis)
        
        if (data.suggestions?.length > 0) {
          newInsights.push({
            type: 'suggestion',
            title: 'Sugestões Diagnósticas',
            description: 'A análise dos sintomas sugere possíveis diagnósticos a considerar.',
            actions: data.suggestions
          })
        }
      }

      // Adicionar insights baseados no perfil
      if (riskData) {
        const positiveFactors = riskData.factors.filter(f => f.impact === 'positive')
        if (positiveFactors.length > 0) {
          newInsights.push({
            type: 'info',
            title: 'Fatores Protetores',
            description: `Paciente apresenta ${positiveFactors.length} fator(es) positivo(s) de saúde.`
          })
        }
      }

      setInsights(newInsights)
    } catch (error) {
      console.error('Erro ao carregar insights:', error)
    } finally {
      setLoading(false)
    }
  }, [patientId, medications, symptoms, riskData])

  // Refresh manual
  const handleRefresh = async () => {
    setRefreshing(true)
    await loadInsights()
    setRefreshing(false)
  }

  useEffect(() => {
    loadInsights()
  }, [loadInsights])

  if (loading) {
    return <AIInsightsSkeleton className={className} />
  }

  return (
    <Card className={cn('border-l-4 border-l-purple-500', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-500" />
            <CardTitle className="text-lg">Insights de IA</CardTitle>
            <Badge variant="outline" className="text-xs">
              <Sparkles className="h-3 w-3 mr-1" />
              Beta
            </Badge>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
          </Button>
        </div>
        <CardDescription>
          Análise inteligente baseada nos dados do paciente
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            <TabsTrigger value="overview" className="flex-1">
              <Lightbulb className="h-4 w-4 mr-1" />
              Resumo
            </TabsTrigger>
            <TabsTrigger value="risk" className="flex-1">
              <TrendingUp className="h-4 w-4 mr-1" />
              Risco
            </TabsTrigger>
            <TabsTrigger value="drugs" className="flex-1">
              <Pill className="h-4 w-4 mr-1" />
              Medicamentos
            </TabsTrigger>
          </TabsList>

          {/* Tab: Resumo */}
          <TabsContent value="overview" className="space-y-3 mt-4">
            {insights.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Nenhum insight disponível no momento</p>
              </div>
            ) : (
              insights.map((insight, index) => (
                <InsightCard key={index} insight={insight} />
              ))
            )}

            {analysisResult && (
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between">
                    <span className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Ver análise detalhada
                    </span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-2 p-3 bg-muted rounded-lg text-sm">
                    {analysisResult}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </TabsContent>

          {/* Tab: Risco */}
          <TabsContent value="risk" className="space-y-4 mt-4">
            {riskData ? (
              <>
                <RiskLevelIndicator level={riskData.riskLevel} />
                
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Fatores Analisados</h4>
                  {riskData.factors.map((factor, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        {factor.impact === 'positive' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                        {factor.impact === 'negative' && <AlertCircle className="h-4 w-4 text-red-500" />}
                        {factor.impact === 'neutral' && <Activity className="h-4 w-4 text-gray-500" />}
                        {factor.name}
                      </span>
                      <span className="text-muted-foreground">{factor.value}</span>
                    </div>
                  ))}
                </div>

                {riskData.recommendations.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Recomendações</h4>
                    <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                      {riskData.recommendations.map((rec, i) => (
                        <li key={i}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Análise de risco não disponível</p>
              </div>
            )}
          </TabsContent>

          {/* Tab: Medicamentos */}
          <TabsContent value="drugs" className="space-y-4 mt-4">
            {medications.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Pill className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Nenhum medicamento para analisar</p>
              </div>
            ) : drugInteractions ? (
              <>
                {drugInteractions.hasInteractions ? (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Foram detectadas {drugInteractions.interactions.length} interações potenciais
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert className="bg-green-50 border-green-200">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      Nenhuma interação significativa detectada entre os medicamentos
                    </AlertDescription>
                  </Alert>
                )}

                {drugInteractions.interactions.map((interaction, i) => (
                  <DrugInteractionCard key={i} interaction={interaction} />
                ))}
              </>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <RefreshCw className="h-8 w-8 mx-auto mb-2 animate-spin opacity-50" />
                <p>Analisando interações...</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="mt-4 pt-4 border-t">
          <p className="text-xs text-muted-foreground text-center">
            ⚠️ Esta análise é apenas para apoio à decisão clínica e não substitui a avaliação médica profissional.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

// ============ COMPONENTES AUXILIARES ============

function InsightCard({ insight }: { insight: AIInsight }) {
  const config = {
    suggestion: { icon: Lightbulb, color: 'text-blue-500', bg: 'bg-blue-50' },
    warning: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-50' },
    info: { icon: Activity, color: 'text-green-500', bg: 'bg-green-50' },
    prediction: { icon: TrendingUp, color: 'text-purple-500', bg: 'bg-purple-50' }
  }

  const { icon: Icon, color, bg } = config[insight.type]

  return (
    <div className={cn('p-3 rounded-lg', bg)}>
      <div className="flex items-start gap-3">
        <Icon className={cn('h-5 w-5 mt-0.5', color)} />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">{insight.title}</h4>
            {insight.confidence && (
              <Badge variant="outline" className="text-xs">
                {Math.round(insight.confidence * 100)}% confiança
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">{insight.description}</p>
          {insight.actions && insight.actions.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {insight.actions.slice(0, 3).map((action, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {action}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function RiskLevelIndicator({ level }: { level: 'LOW' | 'MEDIUM' | 'HIGH' }) {
  const config = {
    LOW: { label: 'Baixo Risco', color: 'bg-green-500', value: 25 },
    MEDIUM: { label: 'Risco Moderado', color: 'bg-yellow-500', value: 60 },
    HIGH: { label: 'Alto Risco', color: 'bg-red-500', value: 90 }
  }

  const { label, color, value } = config[level]

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-sm text-muted-foreground">{value}%</span>
      </div>
      <Progress value={value} className="h-2" />
    </div>
  )
}

function DrugInteractionCard({ interaction }: { 
  interaction: {
    drug1: string
    drug2: string
    severity: 'minor' | 'moderate' | 'major'
    description: string
  }
}) {
  const severityConfig = {
    minor: { label: 'Menor', color: 'text-yellow-600', bg: 'bg-yellow-50' },
    moderate: { label: 'Moderada', color: 'text-orange-600', bg: 'bg-orange-50' },
    major: { label: 'Grave', color: 'text-red-600', bg: 'bg-red-50' }
  }

  const config = severityConfig[interaction.severity]

  return (
    <div className={cn('p-3 rounded-lg border', config.bg)}>
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-sm">
          {interaction.drug1} × {interaction.drug2}
        </span>
        <Badge variant="outline" className={config.color}>
          {config.label}
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground">{interaction.description}</p>
    </div>
  )
}

function AIInsightsSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn('border-l-4 border-l-purple-500', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-5 w-32" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </CardContent>
    </Card>
  )
}

// ============ EXPORTAÇÃO ============

export default AIInsightsPanel
