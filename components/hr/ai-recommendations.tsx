'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Brain, 
  Lightbulb, 
  Target, 
  Heart, 
  TrendingUp,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Bookmark,
  BookmarkCheck,
  ArrowRight,
  RefreshCw,
  AlertCircle
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface Recommendation {
  id: string
  type: 'treatment' | 'development' | 'intervention' | 'resource' | 'lifestyle'
  priority: 'essential' | 'recommended' | 'optional'
  title: string
  description: string
  rationale: string
  actions: string[]
  expectedOutcome: string
  timeframe: string
  resources?: string[]
  relatedStrengths?: string[]
  relatedStratum?: string
}

interface RecommendationContext {
  patientName: string
  stratum?: {
    level: number
    title: string
    characteristics: string[]
  }
  topStrengths?: {
    name: string
    virtue: string
    score: number
  }[]
  currentGoals?: {
    title: string
    status: string
    progress: number
  }[]
  engagementLevel?: string
}

interface AIRecommendationsProps {
  patientId: string
  compact?: boolean
}

const typeConfig = {
  treatment: { 
    label: 'Tratamento', 
    icon: Heart, 
    color: 'text-red-600',
    bgColor: 'bg-red-50 dark:bg-red-900/20'
  },
  development: { 
    label: 'Desenvolvimento', 
    icon: TrendingUp, 
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20'
  },
  intervention: { 
    label: 'Intervenção', 
    icon: AlertCircle, 
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20'
  },
  resource: { 
    label: 'Recurso', 
    icon: Lightbulb, 
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20'
  },
  lifestyle: { 
    label: 'Estilo de Vida', 
    icon: Sparkles, 
    color: 'text-green-600',
    bgColor: 'bg-green-50 dark:bg-green-900/20'
  }
}

const priorityConfig = {
  essential: { label: 'Essencial', color: 'bg-red-500 text-white' },
  recommended: { label: 'Recomendado', color: 'bg-blue-500 text-white' },
  optional: { label: 'Opcional', color: 'bg-gray-500 text-white' }
}

export function AIRecommendations({ patientId, compact = false }: AIRecommendationsProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [context, setContext] = useState<RecommendationContext | null>(null)
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())
  const [savedRecommendations, setSavedRecommendations] = useState<Set<string>>(new Set())
  const [selectedTab, setSelectedTab] = useState('all')
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)

  const fetchRecommendations = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/development/recommendations?patientId=${patientId}`)
      if (!response.ok) throw new Error('Failed to fetch recommendations')
      
      const data = await response.json()
      setRecommendations(data.recommendations || [])
      setContext(data.context || null)
      setGeneratedAt(data.generatedAt || null)
    } catch (error) {
      console.error('Error fetching recommendations:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível gerar recomendações',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [patientId, toast])

  useEffect(() => {
    if (patientId) {
      void fetchRecommendations()
    }
  }, [fetchRecommendations, patientId])

  const toggleExpand = (id: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const toggleSave = (id: string) => {
    setSavedRecommendations(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
        toast({
          title: 'Recomendação removida',
          description: 'A recomendação foi removida dos salvos'
        })
      } else {
        next.add(id)
        toast({
          title: 'Recomendação salva',
          description: 'A recomendação foi adicionada aos salvos'
        })
      }
      return next
    })
  }

  const filteredRecommendations = recommendations.filter(rec => {
    if (selectedTab === 'all') return true
    if (selectedTab === 'saved') return savedRecommendations.has(rec.id)
    return rec.type === selectedTab
  })

  const renderRecommendationCard = (rec: Recommendation) => {
    const type = typeConfig[rec.type]
    const priority = priorityConfig[rec.priority]
    const TypeIcon = type.icon
    const isExpanded = expandedCards.has(rec.id)
    const isSaved = savedRecommendations.has(rec.id)

    return (
      <Card 
        key={rec.id} 
        className={`transition-all duration-200 ${
          isSaved ? 'ring-2 ring-purple-500' : ''
        } hover:shadow-md`}
      >
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg ${type.bgColor}`}>
              <TypeIcon className={`h-5 w-5 ${type.color}`} />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h4 className="font-semibold text-sm">{rec.title}</h4>
                <Badge className={priority.color} variant="default">
                  {priority.label}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {type.label}
                </Badge>
              </div>
              
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {rec.description}
              </p>

              {/* Quick Info */}
              <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {rec.timeframe}
                </span>
                {rec.relatedStratum && (
                  <span className="flex items-center gap-1">
                    <Target className="h-3 w-3" />
                    {rec.relatedStratum}
                  </span>
                )}
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="mt-4 space-y-4 border-t pt-4">
                  {/* Rationale */}
                  <div>
                    <h5 className="text-xs font-semibold uppercase text-gray-500 mb-1">
                      Justificativa
                    </h5>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {rec.rationale}
                    </p>
                  </div>

                  {/* Actions */}
                  <div>
                    <h5 className="text-xs font-semibold uppercase text-gray-500 mb-2">
                      Ações Recomendadas
                    </h5>
                    <ul className="space-y-2">
                      {rec.actions.map((action, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span>{action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Expected Outcome */}
                  <div>
                    <h5 className="text-xs font-semibold uppercase text-gray-500 mb-1">
                      Resultado Esperado
                    </h5>
                    <p className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      <ArrowRight className="h-4 w-4 text-purple-500" />
                      {rec.expectedOutcome}
                    </p>
                  </div>

                  {/* Resources */}
                  {rec.resources && rec.resources.length > 0 && (
                    <div>
                      <h5 className="text-xs font-semibold uppercase text-gray-500 mb-2">
                        Recursos Sugeridos
                      </h5>
                      <div className="flex flex-wrap gap-2">
                        {rec.resources.map((resource, idx) => (
                          <Badge key={idx} variant="secondary">
                            {resource}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Related Strengths */}
                  {rec.relatedStrengths && rec.relatedStrengths.length > 0 && (
                    <div>
                      <h5 className="text-xs font-semibold uppercase text-gray-500 mb-2">
                        Forças Relacionadas
                      </h5>
                      <div className="flex flex-wrap gap-2">
                        {rec.relatedStrengths.map((strength, idx) => (
                          <Badge key={idx} variant="outline" className="bg-purple-50 text-purple-700">
                            {strength}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleSave(rec.id)}
                className={isSaved ? 'text-purple-600' : 'text-gray-400'}
              >
                {isSaved ? (
                  <BookmarkCheck className="h-4 w-4" />
                ) : (
                  <Bookmark className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleExpand(rec.id)}
              >
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center gap-3">
            <Brain className="h-6 w-6 text-purple-600 animate-pulse" />
            <span className="text-gray-600">Gerando recomendações com IA...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (compact) {
    // Compact view for widgets
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-600" />
              Recomendações IA
            </CardTitle>
            <Badge variant="secondary" className="text-xs">
              {recommendations.length} sugestões
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {recommendations.slice(0, 3).map(rec => {
            const type = typeConfig[rec.type]
            const TypeIcon = type.icon
            return (
              <div key={rec.id} className="flex items-start gap-3 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <TypeIcon className={`h-4 w-4 ${type.color} mt-0.5`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{rec.title}</p>
                  <p className="text-xs text-gray-500">{rec.timeframe}</p>
                </div>
                <Badge variant="outline" className="text-xs">
                  {priorityConfig[rec.priority].label}
                </Badge>
              </div>
            )
          })}
          {recommendations.length > 3 && (
            <p className="text-xs text-center text-gray-500">
              + {recommendations.length - 3} mais recomendações
            </p>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-purple-600" />
            Recomendações Inteligentes
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Sugestões personalizadas baseadas no perfil de {context?.patientName}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {generatedAt && (
            <span className="text-xs text-gray-500">
              Gerado em {new Date(generatedAt).toLocaleString('pt-BR')}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={fetchRecommendations}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Context Summary */}
      {context && (
        <Card className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {context.stratum && (
                <div>
                  <p className="text-xs text-gray-500 uppercase">Stratum</p>
                  <p className="font-semibold">S{context.stratum.level} - {context.stratum.title}</p>
                </div>
              )}
              {context.topStrengths && context.topStrengths[0] && (
                <div>
                  <p className="text-xs text-gray-500 uppercase">Top Força</p>
                  <p className="font-semibold">{context.topStrengths[0].name}</p>
                </div>
              )}
              {context.engagementLevel && (
                <div>
                  <p className="text-xs text-gray-500 uppercase">Engajamento</p>
                  <p className="font-semibold">{context.engagementLevel}</p>
                </div>
              )}
              {context.currentGoals && (
                <div>
                  <p className="text-xs text-gray-500 uppercase">Metas Ativas</p>
                  <p className="font-semibold">{context.currentGoals.length} metas</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recomendações Personalizadas</CardTitle>
              <CardDescription>
                {filteredRecommendations.length} recomendações disponíveis
              </CardDescription>
            </div>
            {savedRecommendations.size > 0 && (
              <Badge variant="secondary">
                <BookmarkCheck className="h-3 w-3 mr-1" />
                {savedRecommendations.size} salvas
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="mb-4 flex-wrap">
              <TabsTrigger value="all">
                Todas ({recommendations.length})
              </TabsTrigger>
              <TabsTrigger value="saved">
                Salvas ({savedRecommendations.size})
              </TabsTrigger>
              {Object.entries(typeConfig).map(([key, config]) => {
                const count = recommendations.filter(r => r.type === key).length
                if (count === 0) return null
                const TypeIcon = config.icon
                return (
                  <TabsTrigger key={key} value={key} className="flex items-center gap-1">
                    <TypeIcon className="h-3 w-3" />
                    {config.label} ({count})
                  </TabsTrigger>
                )
              })}
            </TabsList>

            <TabsContent value={selectedTab} className="space-y-3 mt-0">
              {filteredRecommendations.length === 0 ? (
                <div className="text-center py-12">
                  <Lightbulb className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    Nenhuma recomendação nesta categoria
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Selecione outra categoria ou atualize as recomendações
                  </p>
                </div>
              ) : (
                filteredRecommendations.map(renderRecommendationCard)
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Priority Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Guia de Prioridades</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <Badge className={priorityConfig.essential.color}>Essencial</Badge>
              <span className="text-sm text-gray-600">
                Ações críticas que requerem atenção imediata
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Badge className={priorityConfig.recommended.color}>Recomendado</Badge>
              <span className="text-sm text-gray-600">
                Ações importantes para progresso sustentável
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Badge className={priorityConfig.optional.color}>Opcional</Badge>
              <span className="text-sm text-gray-600">
                Oportunidades de crescimento adicional
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
