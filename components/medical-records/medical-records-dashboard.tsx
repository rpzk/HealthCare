'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  BarChart3,
  FileText,
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
  Clock,
  AlertCircle,
  Activity,
  PieChart,
  Loader2,
  RefreshCw,
  Download,
  Filter,
  ChevronRight
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

// ============ TYPES ============

interface RecordStats {
  summary: {
    totalRecords: number
    averageVersion: number | null
    maxVersion: number | null
    period: number
    recordsWithEncryption?: number
  }
  byType: Array<{
    type: string
    count: number
    label: string
    percentage?: number
  }>
  byPriority: Array<{
    priority: string
    count: number
    label: string
    color: string
    percentage?: number
  }>
  bySeverity?: Array<{
    severity: string
    count: number
    label: string
  }>
  timeline: Array<{
    date: string
    count: number
  }>
  recentRecords: Array<{
    id: string
    title: string
    type: string
    priority: string
    patientName: string
    doctorName?: string
    createdAt: string
  }>
  topPatients?: Array<{
    patientId: string
    patientName: string
    recordCount: number
  }>
}

// ============ HELPER FUNCTIONS ============

const getPriorityConfig = (priority: string) => {
  const configs: Record<string, { color: string; bgColor: string; label: string }> = {
    CRITICAL: { color: 'text-red-700', bgColor: 'bg-red-100', label: 'Crítica' },
    HIGH: { color: 'text-orange-700', bgColor: 'bg-orange-100', label: 'Alta' },
    NORMAL: { color: 'text-blue-700', bgColor: 'bg-blue-100', label: 'Normal' },
    LOW: { color: 'text-green-700', bgColor: 'bg-green-100', label: 'Baixa' },
  }
  return configs[priority] || { color: 'text-gray-700', bgColor: 'bg-gray-100', label: priority }
}

const getTypeConfig = (type: string) => {
  const configs: Record<string, { icon: string; label: string; color: string }> = {
    CONSULTATION: { icon: '🩺', label: 'Consulta', color: 'text-blue-600' },
    EXAM: { icon: '🔬', label: 'Exame', color: 'text-purple-600' },
    PROCEDURE: { icon: '⚕️', label: 'Procedimento', color: 'text-green-600' },
    PRESCRIPTION: { icon: '💊', label: 'Prescrição', color: 'text-orange-600' },
    LAB_RESULT: { icon: '🧪', label: 'Resultado Lab.', color: 'text-cyan-600' },
    IMAGING: { icon: '📷', label: 'Imagem', color: 'text-pink-600' },
    VACCINATION: { icon: '💉', label: 'Vacinação', color: 'text-teal-600' },
    SURGERY: { icon: '🏥', label: 'Cirurgia', color: 'text-red-600' },
    NOTE: { icon: '📝', label: 'Anotação', color: 'text-gray-600' },
    OTHER: { icon: '📄', label: 'Outro', color: 'text-gray-600' },
  }
  return configs[type] || { icon: '📄', label: type, color: 'text-gray-600' }
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

const formatDateTime = (date: string) => {
  return new Date(date).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ============ COMPONENTS ============

// Skeleton de carregamento
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4 rounded" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20 mb-2" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-48 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-48 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Card de estatística
function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  trendValue,
  className
}: {
  title: string
  value: string | number
  description?: string
  icon: React.ElementType
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  className?: string
}) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
        {trend && trendValue && (
          <div className={cn(
            "flex items-center gap-1 text-xs mt-2",
            trend === 'up' && "text-green-600",
            trend === 'down' && "text-red-600",
            trend === 'neutral' && "text-muted-foreground"
          )}>
            {trend === 'up' && <TrendingUp className="h-3 w-3" />}
            {trend === 'down' && <TrendingDown className="h-3 w-3" />}
            <span>{trendValue}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Gráfico de barras simples (sem dependência externa)
function SimpleBarChart({ data, maxValue }: { data: Array<{ label: string; value: number; color?: string }>; maxValue?: number }) {
  const max = maxValue || Math.max(...data.map(d => d.value), 1)

  return (
    <div className="space-y-3">
      {data.map((item, index) => (
        <div key={index} className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{item.label}</span>
            <span className="font-medium">{item.value}</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full transition-all duration-500 rounded-full"
              style={{
                width: `${(item.value / max) * 100}%`,
                backgroundColor: item.color || '#3b82f6'
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

// Mini gráfico de linha para timeline
function MiniLineChart({ data }: { data: Array<{ date: string; count: number }> }) {
  if (data.length === 0) return <div className="text-sm text-muted-foreground">Sem dados</div>

  const maxCount = Math.max(...data.map(d => d.count), 1)
  const width = 100 / (data.length - 1 || 1)

  return (
    <div className="relative h-20 w-full">
      <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
        {/* Área preenchida */}
        <defs>
          <linearGradient id="fillGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </linearGradient>
        </defs>
        
        <path
          d={`M 0 100 ${data.map((d, i) => {
            const x = i * width
            const y = 100 - (d.count / maxCount) * 80
            return `L ${x} ${y}`
          }).join(' ')} L 100 100 Z`}
          fill="url(#fillGradient)"
        />

        {/* Linha */}
        <path
          d={data.map((d, i) => {
            const x = i * width
            const y = 100 - (d.count / maxCount) * 80
            return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
          }).join(' ')}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Pontos */}
        {data.map((d, i) => {
          const x = i * width
          const y = 100 - (d.count / maxCount) * 80
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="3"
              fill="white"
              stroke="#3b82f6"
              strokeWidth="2"
              className="transition-all hover:r-4"
            />
          )
        })}
      </svg>

      {/* Labels de data */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[10px] text-muted-foreground mt-2">
        <span>{data[0]?.date ? formatDate(data[0].date) : ''}</span>
        <span>{data[data.length - 1]?.date ? formatDate(data[data.length - 1].date) : ''}</span>
      </div>
    </div>
  )
}

// Lista de registros recentes
function RecentRecordsList({ records }: { records: RecordStats['recentRecords'] }) {
  if (records.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>Nenhum prontuário recente</p>
      </div>
    )
  }

  return (
    <ScrollArea className="h-[300px]">
      <div className="space-y-3">
        {records.map((record) => {
          const typeConfig = getTypeConfig(record.type)
          const priorityConfig = getPriorityConfig(record.priority)

          return (
            <Link
              key={record.id}
              href={`/medical-records/${record.id}`}
              className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors group"
            >
              <div className="text-2xl">{typeConfig.icon}</div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate group-hover:text-primary transition-colors">
                  {record.title}
                </p>
                <p className="text-sm text-muted-foreground truncate">
                  {record.patientName}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge className={cn(priorityConfig.bgColor, priorityConfig.color, 'text-xs')}>
                  {priorityConfig.label}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {formatDateTime(record.createdAt)}
                </span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          )
        })}
      </div>
    </ScrollArea>
  )
}

// Distribuição por prioridade (donut chart simples)
function PriorityDonut({ data }: { data: RecordStats['byPriority'] }) {
  const total = data.reduce((sum, d) => sum + d.count, 0)
  if (total === 0) {
    return <div className="text-center py-8 text-muted-foreground">Sem dados</div>
  }

  let cumulativePercent = 0
  const segments = data.map(d => {
    const percent = (d.count / total) * 100
    const startPercent = cumulativePercent
    cumulativePercent += percent
    return { ...d, percent, startPercent }
  })

  return (
    <div className="flex items-center gap-6">
      <div className="relative w-32 h-32">
        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
          {segments.map((seg, i) => (
            <circle
              key={i}
              cx="18"
              cy="18"
              r="15.915"
              fill="none"
              stroke={seg.color}
              strokeWidth="3"
              strokeDasharray={`${seg.percent} ${100 - seg.percent}`}
              strokeDashoffset={-seg.startPercent}
              className="transition-all duration-500"
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center flex-col">
          <span className="text-2xl font-bold">{total}</span>
          <span className="text-xs text-muted-foreground">Total</span>
        </div>
      </div>

      <div className="space-y-2">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: seg.color }}
            />
            <span className="text-sm">{seg.label}</span>
            <span className="text-sm font-medium ml-auto">{seg.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============ MAIN DASHBOARD ============

export function MedicalRecordsDashboard() {
  const [stats, setStats] = useState<RecordStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState('30')

  const fetchStats = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/medical-records/stats?period=${period}`)
      
      if (!response.ok) {
        throw new Error('Erro ao carregar estatísticas')
      }

      const data = await response.json()
      
      // Processar e normalizar dados
      const processedStats: RecordStats = {
        summary: {
          totalRecords: data.totalRecords || 0,
          averageVersion: data.averageVersion || null,
          maxVersion: data.maxVersion || null,
          period: parseInt(period)
        },
        byType: (data.recordsByType || []).map((r: Record<string, unknown>) => ({
          type: r.recordType || r.type,
          count: (r._count as Record<string, number>)?.id || r.count || 0,
          label: getTypeConfig(String(r.recordType || r.type)).label
        })),
        byPriority: (data.recordsByPriority || []).map((r: Record<string, unknown>) => {
          const priority = String(r.priority || '')
          const config = getPriorityConfig(priority)
          return {
            priority,
            count: (r._count as Record<string, number>)?.id || r.count || 0,
            label: config.label,
            color: config.bgColor.replace('bg-', '#').replace('-100', '')
          }
        }),
        timeline: (data.dailyActivity || data.timeline || []).map((r: Record<string, unknown>) => ({
          date: String(r.date || r.createdAt || ''),
          count: Number(r.count || (r._count as Record<string, number>)?.id || 0)
        })),
        recentRecords: (data.recentRecords || []).map((r: Record<string, unknown>) => ({
          id: String(r.id),
          title: String(r.title || 'Sem título'),
          type: String(r.recordType || r.type || 'OTHER'),
          priority: String(r.priority || 'NORMAL'),
          patientName: String(r.patientName || (r.patient as Record<string, string>)?.name || 'Paciente'),
          doctorName: (r.doctorName || (r.doctor as Record<string, string>)?.name) as string | undefined,
          createdAt: String(r.createdAt)
        }))
      }

      // Adicionar cores de prioridade
      processedStats.byPriority = processedStats.byPriority.map(p => ({
        ...p,
        color: getPriorityColor(p.priority)
      }))

      setStats(processedStats)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados')
    } finally {
      setIsLoading(false)
    }
  }, [period])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  if (isLoading) {
    return <DashboardSkeleton />
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
          <Button variant="outline" className="mt-4" onClick={fetchStats}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!stats) return null

  return (
    <div className="space-y-6">
      {/* Header com filtros */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Dashboard de Prontuários</h2>
          <p className="text-muted-foreground">
            Visão geral dos últimos {period} dias
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[140px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 dias</SelectItem>
              <SelectItem value="30">30 dias</SelectItem>
              <SelectItem value="90">90 dias</SelectItem>
              <SelectItem value="180">6 meses</SelectItem>
              <SelectItem value="365">1 ano</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon" onClick={fetchStats}>
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Cards de resumo */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total de Prontuários"
          value={stats.summary.totalRecords.toLocaleString('pt-BR')}
          description={`Últimos ${period} dias`}
          icon={FileText}
        />
        <StatCard
          title="Tipos Diferentes"
          value={stats.byType.length}
          description="Categorias de registro"
          icon={PieChart}
        />
        <StatCard
          title="Versão Média"
          value={stats.summary.averageVersion?.toFixed(1) || '-'}
          description="Revisões por prontuário"
          icon={Activity}
        />
        <StatCard
          title="Maior Versão"
          value={stats.summary.maxVersion || '-'}
          description="Máximo de revisões"
          icon={TrendingUp}
        />
      </div>

      {/* Gráficos principais */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Prontuários por Tipo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Por Tipo de Registro
            </CardTitle>
            <CardDescription>
              Distribuição dos prontuários por categoria
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SimpleBarChart
              data={stats.byType.map(t => ({
                label: `${getTypeConfig(t.type).icon} ${t.label}`,
                value: t.count,
                color: '#3b82f6'
              }))}
            />
          </CardContent>
        </Card>

        {/* Prontuários por Prioridade */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Por Prioridade
            </CardTitle>
            <CardDescription>
              Classificação por nível de urgência
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PriorityDonut data={stats.byPriority} />
          </CardContent>
        </Card>
      </div>

      {/* Timeline e Registros Recentes */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Atividade ao longo do tempo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Atividade Diária
            </CardTitle>
            <CardDescription>
              Prontuários criados por dia
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <MiniLineChart data={stats.timeline} />
          </CardContent>
        </Card>

        {/* Registros Recentes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Registros Recentes
              </CardTitle>
              <CardDescription>
                Últimos prontuários criados
              </CardDescription>
            </div>
            <Link href="/medical-records">
              <Button variant="ghost" size="sm">
                Ver todos
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <RecentRecordsList records={stats.recentRecords} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Helper para cor de prioridade
function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    CRITICAL: '#dc2626',
    HIGH: '#f97316',
    NORMAL: '#3b82f6',
    LOW: '#10b981'
  }
  return colors[priority] || '#6b7280'
}

export default MedicalRecordsDashboard
