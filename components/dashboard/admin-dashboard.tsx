'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Users, 
  Calendar, 
  Activity,
  Clock,
  UserCheck,
  AlertTriangle,
  Building2,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Download,
  Inbox
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface AdminStats {
  totalUsers: number
  activeUsers: number
  newUsersThisMonth: number
  userGrowth: number
  totalPatients: number
  newPatientsThisPeriod: number
  patientGrowth: number
  totalConsultationsMonth: number
  consultationsToday: number
  avgConsultationsPerDay: number
  consultationGrowth: number
  cancellationRate: number
  noShowRate: number
  systemHealth: 'healthy' | 'warning' | 'critical'
}

interface TopProfessional {
  id: string
  name: string
  role: string
  consultations: number
}

interface AlertItem {
  id: string
  type: 'warning' | 'error' | 'info'
  message: string
}

interface DashboardData {
  stats: AdminStats
  topProfessionals: TopProfessional[]
  alerts: AlertItem[]
  period: string
  generatedAt: string
}

export function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState('month')
  const router = useRouter()

  useEffect(() => {
    fetchAdminData()
  }, [period])

  const fetchAdminData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/admin/dashboard?period=${period}`)
      
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Erro ao carregar dados')
      }

      const result = await response.json()
      setData(result.data)
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <AdminDashboardSkeleton />
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
        <p className="text-lg font-medium text-red-600">{error}</p>
        <Button variant="outline" className="mt-4" onClick={fetchAdminData}>
          Tentar novamente
        </Button>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhum dado disponível
      </div>
    )
  }

  const { stats, topProfessionals, alerts } = data

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard Administrativo</h1>
          <p className="text-muted-foreground">
            Visão geral e indicadores de gestão
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hoje</SelectItem>
              <SelectItem value="week">Esta Semana</SelectItem>
              <SelectItem value="month">Este Mês</SelectItem>
              <SelectItem value="quarter">Trimestre</SelectItem>
              <SelectItem value="year">Este Ano</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={fetchAdminData} title="Atualizar">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Alertas */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`flex items-center justify-between p-3 rounded-lg border ${
                alert.type === 'error' 
                  ? 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900' 
                  : alert.type === 'warning'
                  ? 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900'
                  : 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className={`h-4 w-4 ${
                  alert.type === 'error' ? 'text-red-500' : 
                  alert.type === 'warning' ? 'text-amber-500' : 'text-blue-500'
                }`} />
                <span className="text-sm">{alert.message}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* KPIs Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total de Pacientes"
          value={stats.totalPatients.toLocaleString()}
          change={stats.patientGrowth}
          icon={Users}
          color="blue"
          subtitle={stats.newPatientsThisPeriod > 0 ? `+${stats.newPatientsThisPeriod} no período` : undefined}
        />
        <MetricCard
          title="Atendimentos"
          value={stats.totalConsultationsMonth.toLocaleString()}
          change={stats.consultationGrowth}
          icon={Calendar}
          color="green"
          subtitle={`${stats.consultationsToday} hoje`}
        />
        <MetricCard
          title="Média Diária"
          value={stats.avgConsultationsPerDay.toString()}
          change={0}
          icon={Activity}
          color="purple"
          subtitle="atendimentos/dia"
          hideChange
        />
        <MetricCard
          title="Usuários Ativos"
          value={stats.activeUsers.toString()}
          change={stats.userGrowth}
          icon={UserCheck}
          color="amber"
          subtitle={`${stats.totalUsers} total`}
        />
      </div>

      {/* Segunda linha de KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Taxa de Cancelamento</p>
                <p className="text-2xl font-bold">{stats.cancellationRate}%</p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <Progress value={Math.max(0, 100 - stats.cancellationRate * 5)} className="mt-3" />
            <p className="text-xs text-muted-foreground mt-1">Meta: &lt;10%</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">No-Show (Faltas)</p>
                <p className="text-2xl font-bold">{stats.noShowRate}%</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-amber-500/50" />
            </div>
            <Progress value={Math.max(0, 100 - stats.noShowRate * 10)} className="mt-3" />
            <p className="text-xs text-muted-foreground mt-1">Meta: &lt;5%</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Novos Usuários</p>
                <p className="text-2xl font-bold">{stats.newUsersThisMonth}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500/50" />
            </div>
            <p className="text-xs text-muted-foreground mt-3">No período selecionado</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Status do Sistema</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className={`h-3 w-3 rounded-full ${
                    stats.systemHealth === 'healthy' ? 'bg-green-500' :
                    stats.systemHealth === 'warning' ? 'bg-amber-500' : 'bg-red-500'
                  }`} />
                  <p className="text-lg font-semibold">
                    {stats.systemHealth === 'healthy' ? 'Saudável' :
                     stats.systemHealth === 'warning' ? 'Atenção' : 'Crítico'}
                  </p>
                </div>
              </div>
              <Activity className="h-8 w-8 text-green-500/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grid de informações detalhadas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Profissionais */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Top Profissionais</CardTitle>
                <CardDescription>Por atendimentos no período</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => router.push('/admin/staff')}>
                Ver todos
                <ArrowUpRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {topProfessionals.length > 0 ? (
              <div className="space-y-4">
                {topProfessionals.map((prof, index) => (
                  <div key={prof.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        index === 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300' :
                        index === 1 ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' :
                        'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{prof.name}</p>
                        <p className="text-sm text-muted-foreground">{prof.role || 'Profissional'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{prof.consultations} atend.</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Inbox className="h-12 w-12 mb-3 opacity-50" />
                <p>Nenhum atendimento no período</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ações Rápidas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ações Rápidas</CardTitle>
            <CardDescription>Acesso às funções mais usadas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                className="h-auto py-4 flex-col gap-2"
                onClick={() => router.push('/admin/invites')}
              >
                <Users className="h-5 w-5" />
                <span className="text-xs">Novo Usuário</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto py-4 flex-col gap-2"
                onClick={() => router.push('/reports')}
              >
                <BarChart3 className="h-5 w-5" />
                <span className="text-xs">Relatórios</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto py-4 flex-col gap-2"
                onClick={() => router.push('/settings')}
              >
                <Building2 className="h-5 w-5" />
                <span className="text-xs">Configurações</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto py-4 flex-col gap-2"
                onClick={() => router.push('/security-monitoring')}
              >
                <Activity className="h-5 w-5" />
                <span className="text-xs">Monitoramento</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Timestamp */}
      <p className="text-xs text-muted-foreground text-right">
        Atualizado em {new Date(data.generatedAt).toLocaleString('pt-BR')}
      </p>
    </div>
  )
}

// Componente MetricCard
function MetricCard({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  color, 
  subtitle,
  hideChange = false
}: { 
  title: string
  value: string
  change: number
  icon: any
  color: 'blue' | 'green' | 'purple' | 'amber' | 'red'
  subtitle?: string
  hideChange?: boolean
}) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    green: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    amber: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
    red: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
  }

  const isPositive = change >= 0

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold">{value}</p>
            <div className="flex items-center gap-2 flex-wrap">
              {!hideChange && (
                <Badge 
                  variant="secondary" 
                  className={`text-xs ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
                >
                  {isPositive ? <ArrowUpRight className="h-3 w-3 mr-0.5" /> : <ArrowDownRight className="h-3 w-3 mr-0.5" />}
                  {Math.abs(change)}%
                </Badge>
              )}
              {subtitle && (
                <span className="text-xs text-muted-foreground">{subtitle}</span>
              )}
            </div>
          </div>
          <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Skeleton
function AdminDashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-10" />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-4 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
