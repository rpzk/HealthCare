'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { logger } from '@/lib/logger'
import {
  TrendingUp,
  Target,
  CheckCircle2,
  Trophy,
  Gem,
  Brain,
  Calendar,
  Flame,
  Loader2,
  ArrowUp,
  ArrowRight,
} from 'lucide-react'

interface Stats {
  overview: {
    totalAssessments: number
    totalPlans: number
    activePlans: number
  }
  goals: {
    total: number
    completed: number
    progress: number
  }
  actions: {
    total: number
    completed: number
    progress: number
    thisWeek: number
  }
  milestones: {
    total: number
    achieved: number
  }
  stratum: {
    current: string | null
    evolution: Array<{
      date: string
      level: string
      months: number
      confidence: number
    }>
  }
  strengths: {
    top5: Array<{
      code: string
      name: string
      score: number
      virtue: string
    }>
    assessmentCount: number
  }
  categoryProgress: Array<{
    category: string
    total: number
    completed: number
    progress: number
  }>
}

const categoryLabels: Record<string, { label: string; color: string; bgColor: string }> = {
  HEALTH: { label: 'Saúde', color: 'text-green-600', bgColor: 'bg-green-100' },
  CAREER: { label: 'Carreira', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  PERSONAL: { label: 'Pessoal', color: 'text-purple-600', bgColor: 'bg-purple-100' },
  RELATIONSHIP: { label: 'Relações', color: 'text-pink-600', bgColor: 'bg-pink-100' },
  FINANCIAL: { label: 'Financeiro', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  SPIRITUAL: { label: 'Espiritual', color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
}

const stratumDescriptions: Record<string, string> = {
  S1: '1 dia - 3 meses',
  S2: '3 meses - 1 ano',
  S3: '1 - 2 anos',
  S4: '2 - 5 anos',
  S5: '5 - 10 anos',
  S6: '10 - 20 anos',
  S7: '20 - 50 anos',
  S8: '50+ anos',
}

interface DevelopmentDashboardProps {
  patientId?: string
}

export function DevelopmentDashboard({ patientId }: DevelopmentDashboardProps) {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStats = useCallback(async () => {
    try {
      const url = patientId 
        ? `/api/development/stats?patientId=${patientId}`
        : '/api/development/stats'
      const res = await fetch(url)
      if (!res.ok) throw new Error('Erro ao buscar estatísticas')
      const data = await res.json()
      setStats(data)
    } catch (error) {
      logger.error('Erro:', error)
    } finally {
      setLoading(false)
    }
  }, [patientId])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>Erro ao carregar estatísticas</p>
      </div>
    )
  }

  const hasData = stats.overview.totalAssessments > 0 || stats.overview.totalPlans > 0

  if (!hasData) {
    return (
      <Card className="bg-gradient-to-br from-gray-50 to-gray-100">
        <CardContent className="py-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center">
            <TrendingUp className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-700 mb-2">
            Comece sua jornada de desenvolvimento
          </h3>
          <p className="text-gray-500 max-w-md mx-auto">
            Complete as avaliações e crie seu primeiro plano para ver seu 
            progresso aqui.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Target className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.goals.completed}/{stats.goals.total}</p>
                <p className="text-sm text-gray-500">Metas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.actions.completed}</p>
                <p className="text-sm text-gray-500">Ações feitas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Trophy className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.milestones.achieved}/{stats.milestones.total}</p>
                <p className="text-sm text-gray-500">Marcos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Flame className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.actions.thisWeek}</p>
                <p className="text-sm text-gray-500">Esta semana</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Progresso Geral */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              Progresso Geral
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Metas</span>
                  <span className="font-medium">{stats.goals.progress}%</span>
                </div>
                <Progress value={stats.goals.progress} className="h-2" />
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Ações</span>
                  <span className="font-medium">{stats.actions.progress}%</span>
                </div>
                <Progress value={stats.actions.progress} className="h-2" />
              </div>

              {stats.categoryProgress.length > 0 && (
                <div className="pt-4 border-t">
                  <p className="text-sm font-medium mb-3">Por categoria:</p>
                  <div className="space-y-2">
                    {stats.categoryProgress.map(cat => {
                      const config = categoryLabels[cat.category] || { label: cat.category, color: 'text-gray-600', bgColor: 'bg-gray-100' }
                      return (
                        <div key={cat.category} className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded text-xs ${config.bgColor} ${config.color}`}>
                            {config.label}
                          </span>
                          <div className="flex-1">
                            <Progress value={cat.progress} className="h-1.5" />
                          </div>
                          <span className="text-xs text-gray-500">{cat.progress}%</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Horizonte Temporal */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Brain className="h-4 w-4 text-blue-600" />
              Horizonte Temporal
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.stratum.current ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <span className="text-2xl font-bold text-white">
                      {stats.stratum.current}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium">Estrato Atual</p>
                    <p className="text-sm text-gray-500">
                      {stratumDescriptions[stats.stratum.current]}
                    </p>
                  </div>
                </div>

                {stats.stratum.evolution.length > 1 && (
                  <div className="pt-4 border-t">
                    <p className="text-sm font-medium mb-2">Evolução:</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {stats.stratum.evolution.map((ev, index) => (
                        <div key={ev.date} className="flex items-center gap-1">
                          <Badge variant="outline" className={
                            index === stats.stratum.evolution.length - 1
                              ? 'bg-blue-50 border-blue-200'
                              : ''
                          }>
                            {ev.level}
                          </Badge>
                          {index < stats.stratum.evolution.length - 1 && (
                            <ArrowRight className="h-3 w-3 text-gray-300" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                <Brain className="h-12 w-12 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Avaliação não realizada</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Forças de Caráter */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Gem className="h-4 w-4 text-purple-600" />
              Suas Top 5 Forças
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.strengths.top5.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {stats.strengths.top5.map((strength, index) => (
                  <div
                    key={strength.code}
                    className={`p-4 rounded-lg text-center ${
                      index === 0 
                        ? 'bg-gradient-to-br from-purple-100 to-pink-100 ring-2 ring-purple-200' 
                        : 'bg-gray-50'
                    }`}
                  >
                    <div className={`text-2xl mb-2 ${index === 0 ? 'scale-125' : ''}`}>
                      {getStrengthEmoji(strength.code)}
                    </div>
                    <p className={`font-medium text-sm ${index === 0 ? 'text-purple-700' : ''}`}>
                      {strength.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {strength.virtue}
                    </p>
                    <Badge 
                      variant="secondary" 
                      className={`mt-2 ${index === 0 ? 'bg-purple-200 text-purple-700' : ''}`}
                    >
                      #{index + 1}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                <Gem className="h-12 w-12 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Complete a avaliação de forças</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Timeline de Avaliações */}
      {stats.overview.totalAssessments > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-600" />
              Histórico de Avaliações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>{stats.overview.totalAssessments} avaliações realizadas</span>
              <span>•</span>
              <span>{stats.strengths.assessmentCount} de forças</span>
              <span>•</span>
              <span>{stats.stratum.evolution.length} de horizonte temporal</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function getStrengthEmoji(code: string): string {
  const emojis: Record<string, string> = {
    CREATIVITY: '🎨',
    CURIOSITY: '🔍',
    JUDGMENT: '⚖️',
    LOVE_OF_LEARNING: '📚',
    PERSPECTIVE: '🦉',
    BRAVERY: '🦁',
    PERSEVERANCE: '🏔️',
    HONESTY: '💎',
    ZEST: '⚡',
    LOVE: '❤️',
    KINDNESS: '🤝',
    SOCIAL_INTELLIGENCE: '🎭',
    TEAMWORK: '👥',
    FAIRNESS: '⚖️',
    LEADERSHIP: '👑',
    FORGIVENESS: '🕊️',
    HUMILITY: '🙏',
    PRUDENCE: '🎯',
    SELF_REGULATION: '🧘',
    APPRECIATION_OF_BEAUTY: '🌸',
    GRATITUDE: '🙌',
    HOPE: '🌟',
    HUMOR: '😄',
    SPIRITUALITY: '✨',
  }
  return emojis[code] || '💪'
}
