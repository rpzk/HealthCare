'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  Brain,
  Gem,
  Sparkles,
  Heart,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Lightbulb,
  Target,
  TrendingUp,
  Calendar,
  Clock,
  Shield,
  Crown,
  Flame,
} from 'lucide-react'

interface PatientDevelopmentData {
  stratum?: {
    level: string
    timeSpanMonths: number
    name: string
    description: string
  }
  topStrengths: Array<{
    code: string
    name: string
    virtue: string
    score: number
  }>
  currentGoals: Array<{
    title: string
    category: string
    progress: number
  }>
  streak: number
  lastAssessment?: string
}

interface ConsultationWidgetProps {
  patientId: string
  patientName?: string
  variant?: 'sidebar' | 'inline' | 'compact'
}

const virtueIcons: Record<string, typeof Heart> = {
  'Sabedoria': Lightbulb,
  'Coragem': Shield,
  'Humanidade': Heart,
  'Justiça': Crown,
  'Temperança': Target,
  'Transcendência': Sparkles,
}

const stratumData: Record<string, { name: string; description: string; suggestion: string }> = {
  'S1': {
    name: 'Operacional',
    description: 'Foco em tarefas imediatas (1 dia - 3 meses)',
    suggestion: 'Orientações práticas e concretas. Foco em ações do dia-a-dia.',
  },
  'S2': {
    name: 'Supervisor',
    description: 'Planejamento de curto prazo (3 meses - 1 ano)',
    suggestion: 'Metas semanais/mensais. Acompanhamento frequente.',
  },
  'S3': {
    name: 'Gerente',
    description: 'Visão de médio prazo (1 - 2 anos)',
    suggestion: 'Planos de tratamento com marcos trimestrais.',
  },
  'S4': {
    name: 'Diretor',
    description: 'Estratégia plurianual (2 - 5 anos)',
    suggestion: 'Discussão sobre prevenção e qualidade de vida a longo prazo.',
  },
  'S5': {
    name: 'VP',
    description: 'Visão de longo prazo (5 - 10 anos)',
    suggestion: 'Conectar saúde com legado e propósito de vida.',
  },
  'S6': {
    name: 'CEO',
    description: 'Transformação (10 - 20 anos)',
    suggestion: 'Abordagem sistêmica, impacto familiar e social.',
  },
}

const strengthSuggestions: Record<string, string> = {
  'PERSEVERANCE': 'Use a persistência natural para manter hábitos saudáveis.',
  'CURIOSITY': 'Explore informações sobre sua condição - paciente curioso adere melhor.',
  'GRATITUDE': 'Praticar gratidão pode melhorar bem-estar emocional.',
  'HOPE': 'Mantenha a esperança como motor de mudança.',
  'KINDNESS': 'Ajudar outros pode fortalecer sua própria jornada de saúde.',
  'LOVE': 'Relacionamentos de qualidade impactam a saúde cardiovascular.',
  'HUMOR': 'O humor reduz cortisol e fortalece o sistema imune.',
  'BRAVERY': 'Coragem para enfrentar mudanças necessárias.',
  'HONESTY': 'Ser honesto consigo sobre hábitos é o primeiro passo.',
  'CREATIVITY': 'Encontre formas criativas de incorporar hábitos saudáveis.',
  'SELF_REGULATION': 'Autocontrole é sua força para mudança de comportamento.',
  'PRUDENCE': 'Decisões cuidadosas sobre alimentação e exercício.',
  'SPIRITUALITY': 'Conexão espiritual pode dar significado ao cuidado.',
  'SOCIAL_INTELLIGENCE': 'Construa rede de apoio para sua jornada.',
  'PERSPECTIVE': 'Visão ampla ajuda a manter foco no que importa.',
}

export function ConsultationDevelopmentWidget({ 
  patientId, 
  patientName,
  variant = 'sidebar' 
}: ConsultationWidgetProps) {
  const [data, setData] = useState<PatientDevelopmentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        // Fetch stratum assessment
        const stratumRes = await fetch(`/api/stratum/assessments?userId=${patientId}&limit=1`)
        const stratumAssessments = stratumRes.ok ? await stratumRes.json() : []
        
        // Fetch strengths assessment
        const strengthsRes = await fetch(`/api/strengths/assessments?userId=${patientId}&limit=1`)
        const strengthsAssessments = strengthsRes.ok ? await strengthsRes.json() : []
        
        // Fetch current goals
        const plansRes = await fetch(`/api/development/plans?userId=${patientId}&status=ACTIVE`)
        const plans = plansRes.ok ? await plansRes.json() : []
        
        const latestStratum = stratumAssessments[0]
        const latestStrengths = strengthsAssessments[0]
        
        const currentGoals = plans.flatMap((plan: any) => 
          plan.goals?.filter((g: any) => g.status === 'IN_PROGRESS').slice(0, 3).map((g: any) => ({
            title: g.title,
            category: g.category,
            progress: g.progress,
          })) || []
        )

        setData({
          stratum: latestStratum ? {
            level: latestStratum.calculatedStratum,
            timeSpanMonths: latestStratum.timeSpanMonths,
            name: stratumData[latestStratum.calculatedStratum]?.name || '',
            description: stratumData[latestStratum.calculatedStratum]?.description || '',
          } : undefined,
          topStrengths: latestStrengths?.topStrengths?.slice(0, 3).map((s: any) => ({
            code: s.code,
            name: s.name,
            virtue: s.virtue,
            score: s.score,
          })) || [],
          currentGoals,
          streak: 0, // Would come from stats
          lastAssessment: latestStratum?.completedAt || latestStrengths?.completedAt,
        })
      } catch (error) {
        console.error('Error loading patient development data:', error)
      } finally {
        setLoading(false)
      }
    }

    if (patientId) {
      loadData()
    }
  }, [patientId])

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-4">
          <div className="h-20 bg-gray-200 rounded" />
        </CardContent>
      </Card>
    )
  }

  // No data available
  if (!data || (!data.stratum && data.topStrengths.length === 0)) {
    return (
      <Card className="border-dashed border-purple-300 bg-purple-50/50">
        <CardContent className="p-4 text-center">
          <Sparkles className="h-8 w-8 text-purple-400 mx-auto mb-2" />
          <p className="text-sm text-purple-700 font-medium">
            Perfil de Desenvolvimento não avaliado
          </p>
          <p className="text-xs text-purple-600 mt-1">
            Sugerir avaliação ao paciente
          </p>
          <Button size="sm" variant="outline" className="mt-3" asChild>
            <a href={`/patients/${patientId}?tab=development`} target="_blank">
              Ver Desenvolvimento
            </a>
          </Button>
        </CardContent>
      </Card>
    )
  }

  const stratumInfo = data.stratum ? stratumData[data.stratum.level] : null

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {data.stratum && (
              <Badge className="bg-blue-100 text-blue-700">{data.stratum.level}</Badge>
            )}
            {data.topStrengths.slice(0, 2).map((s, i) => (
              <Badge key={i} variant="outline" className="text-xs">{s.code}</Badge>
            ))}
          </div>
          {data.stratum && (
            <p className="text-xs text-gray-500 mt-1 truncate">
              {stratumInfo?.suggestion}
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <Card className="border-purple-200 bg-gradient-to-br from-white to-purple-50/30">
      <Collapsible open={expanded} onOpenChange={setExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-purple-50/50 transition-colors py-3 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <div>
                  <CardTitle className="text-sm">Perfil de Desenvolvimento</CardTitle>
                  {patientName && (
                    <p className="text-xs text-gray-500">{patientName}</p>
                  )}
                </div>
              </div>
              {expanded ? (
                <ChevronUp className="h-4 w-4 text-gray-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-400" />
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="px-4 pb-4 pt-0 space-y-4">
            {/* Stratum Info */}
            {data.stratum && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-sm">Horizonte Temporal</span>
                  </div>
                  <Badge className="bg-blue-600">{data.stratum.level}</Badge>
                </div>
                <p className="text-xs text-blue-700 mb-2">{stratumInfo?.description}</p>
                <div className="p-2 bg-white rounded border border-blue-200">
                  <div className="flex items-start gap-2">
                    <Lightbulb className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-gray-700">{stratumInfo?.suggestion}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Top Strengths */}
            {data.topStrengths.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Gem className="h-4 w-4 text-purple-600" />
                  <span className="font-medium text-sm">Forças Principais</span>
                </div>
                <div className="space-y-2">
                  {data.topStrengths.map((strength, index) => {
                    const Icon = virtueIcons[strength.virtue] || Sparkles
                    const suggestion = strengthSuggestions[strength.code]
                    return (
                      <div key={index} className="p-2 bg-purple-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className="h-3 w-3 text-purple-600" />
                          <span className="text-sm font-medium">{strength.name}</span>
                          <Badge variant="outline" className="text-xs">{strength.virtue}</Badge>
                        </div>
                        {suggestion && (
                          <p className="text-xs text-purple-700 pl-5">{suggestion}</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Current Goals */}
            {data.currentGoals.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-sm">Metas Ativas</span>
                </div>
                <div className="space-y-2">
                  {data.currentGoals.map((goal, index) => (
                    <div key={index} className="p-2 bg-green-50 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{goal.title}</span>
                        <span className="text-xs text-green-700">{goal.progress}%</span>
                      </div>
                      <Progress value={goal.progress} className="h-1.5" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Suggestions for this consultation */}
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <span className="font-medium text-sm text-amber-800">Sugestões para Consulta</span>
              </div>
              <ul className="space-y-1 text-xs text-amber-700">
                {data.stratum && parseInt(data.stratum.level.replace('S', '')) <= 2 && (
                  <li>• Use linguagem concreta e orientações práticas</li>
                )}
                {data.stratum && parseInt(data.stratum.level.replace('S', '')) >= 3 && (
                  <li>• Discuta impactos de longo prazo das escolhas de saúde</li>
                )}
                {data.topStrengths.some(s => s.code === 'CURIOSITY') && (
                  <li>• Ofereça materiais educativos - paciente é curioso</li>
                )}
                {data.topStrengths.some(s => s.code === 'SOCIAL_INTELLIGENCE') && (
                  <li>• Envolva família/rede de apoio no plano de cuidado</li>
                )}
                {data.topStrengths.some(s => s.code === 'PERSEVERANCE') && (
                  <li>• Desafie com metas progressivas - paciente persistente</li>
                )}
                {data.currentGoals.length > 0 && (
                  <li>• Pergunte sobre progresso nas metas de desenvolvimento</li>
                )}
              </ul>
            </div>

            {/* Last Assessment */}
            {data.lastAssessment && (
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>
                    Última avaliação: {new Date(data.lastAssessment).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <Button size="sm" variant="ghost" className="h-6 text-xs" asChild>
                  <a href={`/patients/${patientId}?tab=development`} target="_blank">
                    Ver Completo
                  </a>
                </Button>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
