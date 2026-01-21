'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { logger } from '@/lib/logger'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts'
import {
  Brain,
  Gem,
  Target,
  TrendingUp,
  Users,
  AlertCircle,
  Calendar,
  Award,
  BarChart3,
  PieChartIcon,
  Lightbulb,
  RefreshCw,
  Download,
} from 'lucide-react'

interface AnalyticsData {
  summary: {
    totalAssessments: number
    uniqueUsers: number
    strengthAssessments: number
    developmentPlans: number
    period: string
  }
  stratumDistribution: Record<string, number>
  stratumEvolution: Array<{ month: string; average: number; count: number }>
  topStrengths: Array<{
    code: string
    name: string
    virtue: string
    count: number
    percentage: number
  }>
  virtueDistribution: Record<string, number>
  planMetrics: {
    total: number
    active: number
    completed: number
    totalGoals: number
    completedGoals: number
    totalMilestones: number
    achievedMilestones: number
  }
  goalCategories: Record<string, number>
  insights: string[]
  pendingReassessments: Array<{
    userId: string
    userName?: string
    lastAssessment: string
    daysSince: number
  }>
}

const STRATUM_COLORS = [
  '#9CA3AF', // S1 - gray
  '#10B981', // S2 - green
  '#3B82F6', // S3 - blue
  '#8B5CF6', // S4 - purple
  '#F59E0B', // S5 - amber
  '#EF4444', // S6 - red
  '#6366F1', // S7 - indigo
  '#EC4899', // S8 - pink
]

const VIRTUE_COLORS: Record<string, string> = {
  'Sabedoria': '#3B82F6',
  'Coragem': '#F97316',
  'Humanidade': '#EC4899',
  'Justiça': '#EAB308',
  'Temperança': '#22C55E',
  'Transcendência': '#8B5CF6',
}

const CATEGORY_COLORS: Record<string, string> = {
  'HEALTH': '#10B981',
  'MENTAL': '#3B82F6',
  'CAREER': '#F59E0B',
  'RELATIONSHIPS': '#EC4899',
  'PERSONAL': '#8B5CF6',
  'SPIRITUAL': '#6366F1',
}

const CATEGORY_LABELS: Record<string, string> = {
  'HEALTH': 'Saúde',
  'MENTAL': 'Mental',
  'CAREER': 'Carreira',
  'RELATIONSHIPS': 'Relações',
  'PERSONAL': 'Pessoal',
  'SPIRITUAL': 'Espiritual',
}

export function DevelopmentAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('12')

  const loadAnalytics = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/development/analytics?period=${period}`)
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } catch (error) {
      logger.error('Error loading analytics:', error)
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => {
    void loadAnalytics()
  }, [loadAnalytics])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-16 bg-gray-200 rounded" />
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
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">Não foi possível carregar os dados de analytics</p>
          <Button onClick={loadAnalytics} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Prepare chart data
  const stratumChartData = Object.entries(data.stratumDistribution)
    .map(([stratum, count], index) => ({
      name: stratum,
      value: count,
      fill: STRATUM_COLORS[index],
    }))
    .filter(d => d.value > 0)

  const virtueChartData = Object.entries(data.virtueDistribution)
    .map(([virtue, count]) => ({
      name: virtue,
      value: count,
      fill: VIRTUE_COLORS[virtue] || '#888',
    }))

  const categoryChartData = Object.entries(data.goalCategories)
    .map(([category, count]) => ({
      name: CATEGORY_LABELS[category] || category,
      value: count,
      fill: CATEGORY_COLORS[category] || '#888',
    }))

  const radarData = data.topStrengths.slice(0, 6).map(s => ({
    strength: s.code,
    value: s.percentage,
    fullMark: 100,
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-purple-600" />
            Analytics de Desenvolvimento
          </h2>
          <p className="text-gray-500">Visão agregada da organização</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">3 meses</SelectItem>
              <SelectItem value="6">6 meses</SelectItem>
              <SelectItem value="12">12 meses</SelectItem>
              <SelectItem value="24">24 meses</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={loadAnalytics}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pessoas Avaliadas</p>
                <p className="text-3xl font-bold">{data.summary.uniqueUsers}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Avaliações de Horizonte</p>
                <p className="text-3xl font-bold">{data.summary.totalAssessments}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Brain className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Descobertas de Forças</p>
                <p className="text-3xl font-bold">{data.summary.strengthAssessments}</p>
              </div>
              <div className="p-3 bg-amber-100 rounded-full">
                <Gem className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Planos de Desenvolvimento</p>
                <p className="text-3xl font-bold">{data.summary.developmentPlans}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <Target className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Insights */}
      {data.insights.length > 0 && (
        <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-amber-500" />
              Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.insights.map((insight, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-purple-600 font-bold">•</span>
                  <span>{insight}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Stratum Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-blue-600" />
              Distribuição de Estratos
            </CardTitle>
            <CardDescription>
              Quantidade de pessoas por nível de horizonte temporal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stratumChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" name="Pessoas">
                    {stratumChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Stratum Evolution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Evolução do Horizonte Temporal
            </CardTitle>
            <CardDescription>
              Média do horizonte temporal (em meses) ao longo do tempo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.stratumEvolution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: number) => [`${value} meses`, 'Média']}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="average" 
                    stroke="#8B5CF6" 
                    strokeWidth={2}
                    name="Horizonte Médio"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    stroke="#22C55E" 
                    strokeWidth={2}
                    name="Avaliações"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Strengths */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gem className="h-5 w-5 text-purple-600" />
              Forças Mais Comuns
            </CardTitle>
            <CardDescription>
              As 10 forças de caráter mais frequentes na organização
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.topStrengths.slice(0, 8).map((strength, index) => (
                <div key={strength.code} className="flex items-center gap-3">
                  <span className="text-sm font-medium w-6 text-gray-500">
                    #{index + 1}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{strength.name}</span>
                      <span className="text-xs text-gray-500">{strength.percentage}%</span>
                    </div>
                    <Progress value={strength.percentage} className="h-2" />
                  </div>
                  <Badge 
                    variant="outline" 
                    className="text-xs"
                    style={{ borderColor: VIRTUE_COLORS[strength.virtue], color: VIRTUE_COLORS[strength.virtue] }}
                  >
                    {strength.virtue}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Virtue Distribution Pie */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-amber-600" />
              Distribuição por Virtude
            </CardTitle>
            <CardDescription>
              Proporção das 6 virtudes na organização
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={virtueChartData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {virtueChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Plan Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-green-600" />
            Métricas de Planos de Desenvolvimento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-3">Status dos Planos</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Ativos</span>
                  <Badge className="bg-green-100 text-green-700">{data.planMetrics.active}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Completados</span>
                  <Badge className="bg-blue-100 text-blue-700">{data.planMetrics.completed}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Total</span>
                  <Badge variant="outline">{data.planMetrics.total}</Badge>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-3">Metas</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm">Progresso</span>
                  <span className="text-sm font-medium">
                    {data.planMetrics.completedGoals}/{data.planMetrics.totalGoals}
                  </span>
                </div>
                <Progress 
                  value={data.planMetrics.totalGoals > 0 
                    ? (data.planMetrics.completedGoals / data.planMetrics.totalGoals) * 100 
                    : 0
                  } 
                  className="h-3"
                />
                <p className="text-xs text-gray-500">
                  {data.planMetrics.totalGoals > 0 
                    ? Math.round((data.planMetrics.completedGoals / data.planMetrics.totalGoals) * 100)
                    : 0
                  }% de conclusão
                </p>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-3">Marcos</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm">Alcançados</span>
                  <span className="text-sm font-medium">
                    {data.planMetrics.achievedMilestones}/{data.planMetrics.totalMilestones}
                  </span>
                </div>
                <Progress 
                  value={data.planMetrics.totalMilestones > 0 
                    ? (data.planMetrics.achievedMilestones / data.planMetrics.totalMilestones) * 100 
                    : 0
                  } 
                  className="h-3"
                />
                <p className="text-xs text-gray-500">
                  {data.planMetrics.totalMilestones > 0 
                    ? Math.round((data.planMetrics.achievedMilestones / data.planMetrics.totalMilestones) * 100)
                    : 0
                  }% de celebrações
                </p>
              </div>
            </div>
          </div>

          {/* Goal Categories */}
          {categoryChartData.length > 0 && (
            <div className="mt-6 pt-6 border-t">
              <h4 className="text-sm font-medium text-gray-500 mb-3">Metas por Categoria</h4>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryChartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={80} />
                    <Tooltip />
                    <Bar dataKey="value" name="Metas">
                      {categoryChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Reassessments */}
      {data.pendingReassessments.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-800">
              <AlertCircle className="h-5 w-5" />
              Reavaliações Pendentes
            </CardTitle>
            <CardDescription className="text-amber-700">
              Pessoas com avaliação há mais de 1 ano
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.pendingReassessments.slice(0, 10).map((user) => (
                <div 
                  key={user.userId}
                  className="flex items-center justify-between p-3 bg-white rounded-lg border"
                >
                  <div>
                    <p className="font-medium">{user.userName || 'Usuário'}</p>
                    <p className="text-xs text-gray-500">
                      Última avaliação: {new Date(user.lastAssessment).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-amber-700 border-amber-300">
                    {user.daysSince} dias
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
