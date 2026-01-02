'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import {
  Activity,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Loader2,
  Download,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface QuestionnaireMetrics {
  totalSent: number
  completed: number
  pending: number
  expired: number
  completionRate: number
  averageTime: number
  trends: Array<{
    date: string
    sent: number
    completed: number
  }>
  systemBreakdown: Array<{
    system: string
    count: number
    completion: number
  }>
}

interface Props {
  userId: string
}

export function QuestionnaireAnalyticsDashboard({ userId }: Props) {
  const [metrics, setMetrics] = useState<QuestionnaireMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('30d')

  useEffect(() => {
    fetchMetrics()
  }, [period])

  async function fetchMetrics() {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/questionnaires/analytics?period=${period}`
      )
      if (res.ok) {
        const data = await res.json()
        setMetrics(data)
      }
    } catch (error) {
      console.error('Erro ao carregar métricas:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !metrics) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  const COLORS = ['#10B981', '#F59E0B', '#EF4444', '#6366F1']

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Enviados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-2xl font-bold">{metrics.totalSent}</p>
                <p className="text-xs text-muted-foreground mt-1">últimos {period === '30d' ? '30 dias' : period === '7d' ? '7 dias' : '90 dias'}</p>
              </div>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Concluídos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-2xl font-bold text-green-600">{metrics.completed}</p>
                <p className="text-xs text-green-600 mt-1">
                  {metrics.completionRate.toFixed(1)}% de taxa
                </p>
              </div>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-2xl font-bold text-amber-600">{metrics.pending}</p>
                <p className="text-xs text-amber-600 mt-1">aguardando resposta</p>
              </div>
              <Clock className="h-4 w-4 text-amber-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tempo Médio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-2xl font-bold">{Math.round(metrics.averageTime)}</p>
                <p className="text-xs text-muted-foreground mt-1">minutos</p>
              </div>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Trend Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Tendência</CardTitle>
                <CardDescription>
                  Questionários enviados vs completados
                </CardDescription>
              </div>
              <div className="flex gap-2">
                {['7d', '30d', '90d'].map((p) => (
                  <Button
                    key={p}
                    variant={period === p ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPeriod(p)}
                  >
                    {p === '7d' ? '7D' : p === '30d' ? '30D' : '90D'}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={metrics.trends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="sent"
                  stroke="#6366F1"
                  name="Enviados"
                />
                <Line
                  type="monotone"
                  dataKey="completed"
                  stroke="#10B981"
                  name="Concluídos"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* System Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Por Sistema Terapêutico</CardTitle>
            <CardDescription>
              Distribuição de questionários por sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={metrics.systemBreakdown}
                  dataKey="count"
                  nameKey="system"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  {metrics.systemBreakdown.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>

            {/* Legend */}
            <div className="space-y-2 pt-4 border-t">
              {metrics.systemBreakdown.map((item, idx) => (
                <div key={item.system} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                    />
                    <span className="font-medium">{item.system}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant="outline">{item.count}</Badge>
                    <span className="text-xs text-muted-foreground w-12 text-right">
                      {item.completion.toFixed(0)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Distribuição por Status</CardTitle>
          <CardDescription>
            Visualização detalhada do status de todos os questionários
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={[
              {
                status: 'Concluído',
                value: metrics.completed,
                fill: '#10B981',
              },
              {
                status: 'Pendente',
                value: metrics.pending,
                fill: '#F59E0B',
              },
              {
                status: 'Expirado',
                value: metrics.expired,
                fill: '#EF4444',
              },
            ]}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="status" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
