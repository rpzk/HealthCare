'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Users, 
  Calendar, 
  TrendingUp,
  TrendingDown,
  Activity,
  DollarSign,
  Clock,
  UserCheck,
  AlertTriangle,
  Building2,
  Stethoscope,
  ClipboardCheck,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Download,
  Filter
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
  // Usuários
  totalUsers: number
  activeUsers: number
  newUsersThisMonth: number
  userGrowth: number
  
  // Pacientes
  totalPatients: number
  newPatientsThisMonth: number
  patientGrowth: number
  
  // Atendimentos
  totalConsultationsMonth: number
  consultationsToday: number
  avgConsultationsPerDay: number
  consultationGrowth: number
  
  // Ocupação
  occupancyRate: number
  avgWaitTime: number
  cancellationRate: number
  noShowRate: number
  
  // Financeiro (se habilitado)
  revenueMonth?: number
  revenueGrowth?: number
  
  // Sistema
  systemHealth: 'healthy' | 'warning' | 'critical'
  lastBackup?: string
}

interface TopProfessional {
  id: string
  name: string
  role: string
  consultations: number
  rating?: number
}

interface AlertItem {
  id: string
  type: 'warning' | 'error' | 'info'
  message: string
  time: string
}

export function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [topProfessionals, setTopProfessionals] = useState<TopProfessional[]>([])
  const [alerts, setAlerts] = useState<AlertItem[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('month')
  const router = useRouter()

  useEffect(() => {
    fetchAdminData()
  }, [period])

  const fetchAdminData = async () => {
    try {
      setLoading(true)
      
      // Buscar dados do dashboard administrativo
      const [statsRes, usersRes, consultationsRes] = await Promise.all([
        fetch('/api/dashboard?section=all'),
        fetch('/api/users?limit=1'),
        fetch('/api/consultations?limit=1')
      ])

      // Dados reais ou mock para demonstração
      const dashboardData = statsRes.ok ? await statsRes.json() : null
      const usersData = usersRes.ok ? await usersRes.json() : null
      
      // Construir estatísticas administrativas
      const adminStats: AdminStats = {
        totalUsers: usersData?.total || 4,
        activeUsers: usersData?.active || 4,
        newUsersThisMonth: 2,
        userGrowth: 15,
        
        totalPatients: dashboardData?.data?.stats?.totalPatients || 1,
        newPatientsThisMonth: 1,
        patientGrowth: 100,
        
        totalConsultationsMonth: 45,
        consultationsToday: dashboardData?.data?.stats?.consultationsToday || 0,
        avgConsultationsPerDay: 8,
        consultationGrowth: 12,
        
        occupancyRate: 72,
        avgWaitTime: 15,
        cancellationRate: 8,
        noShowRate: 5,
        
        systemHealth: 'healthy',
        lastBackup: new Date().toISOString()
      }
      
      setStats(adminStats)
      
      // Top profissionais (mock)
      setTopProfessionals([
        { id: '1', name: 'Dr. João Silva', role: 'Clínica Geral', consultations: 45, rating: 4.9 },
        { id: '2', name: 'Dra. Maria Santos', role: 'Pediatria', consultations: 38, rating: 4.8 },
        { id: '3', name: 'Dr. Carlos Lima', role: 'Cardiologia', consultations: 32, rating: 4.7 },
      ])
      
      // Alertas (mock)
      setAlerts([
        { id: '1', type: 'warning', message: 'Estoque baixo: Dipirona 500mg', time: '2h atrás' },
        { id: '2', type: 'info', message: '3 usuários aguardando aprovação', time: '5h atrás' },
      ])
      
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <AdminDashboardSkeleton />
  }

  if (!stats) {
    return (
      <div className="text-center py-8 text-red-600">
        Erro ao carregar dashboard administrativo
      </div>
    )
  }

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
          <Button variant="outline" size="icon" onClick={fetchAdminData}>
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
              <span className="text-xs text-muted-foreground">{alert.time}</span>
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
          subtitle={`+${stats.newPatientsThisMonth} este mês`}
        />
        <MetricCard
          title="Atendimentos/Mês"
          value={stats.totalConsultationsMonth.toLocaleString()}
          change={stats.consultationGrowth}
          icon={Calendar}
          color="green"
          subtitle={`${stats.consultationsToday} hoje`}
        />
        <MetricCard
          title="Taxa de Ocupação"
          value={`${stats.occupancyRate}%`}
          change={5}
          icon={Activity}
          color="purple"
          subtitle={`Média: ${stats.avgConsultationsPerDay}/dia`}
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
                <p className="text-sm text-muted-foreground">Tempo Médio de Espera</p>
                <p className="text-2xl font-bold">{stats.avgWaitTime} min</p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <Progress value={100 - (stats.avgWaitTime / 30 * 100)} className="mt-3" />
            <p className="text-xs text-muted-foreground mt-1">Meta: 30 min</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Taxa de Cancelamento</p>
                <p className="text-2xl font-bold">{stats.cancellationRate}%</p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-500/50" />
            </div>
            <Progress value={100 - stats.cancellationRate * 5} className="mt-3" />
            <p className="text-xs text-muted-foreground mt-1">Meta: &lt;5%</p>
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
            <Progress value={100 - stats.noShowRate * 10} className="mt-3" />
            <p className="text-xs text-muted-foreground mt-1">Meta: &lt;3%</p>
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
                  <p className="text-lg font-semibold capitalize">
                    {stats.systemHealth === 'healthy' ? 'Saudável' :
                     stats.systemHealth === 'warning' ? 'Atenção' : 'Crítico'}
                  </p>
                </div>
              </div>
              <Activity className="h-8 w-8 text-green-500/50" />
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Último backup: {stats.lastBackup ? new Date(stats.lastBackup).toLocaleString('pt-BR') : 'N/A'}
            </p>
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
            <div className="space-y-4">
              {topProfessionals.map((prof, index) => (
                <div key={prof.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      index === 0 ? 'bg-amber-100 text-amber-700' :
                      index === 1 ? 'bg-slate-100 text-slate-700' :
                      'bg-orange-100 text-orange-700'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{prof.name}</p>
                      <p className="text-sm text-muted-foreground">{prof.role}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{prof.consultations} atend.</p>
                    {prof.rating && (
                      <p className="text-sm text-muted-foreground">⭐ {prof.rating}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
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

      {/* Distribuição por tipo de atendimento */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Distribuição de Atendimentos</CardTitle>
              <CardDescription>Por tipo de consulta no período</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => router.push('/admin/bi')}>
              Ver detalhes
              <ArrowUpRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatBlock label="Consultas Iniciais" value={18} total={45} color="blue" />
            <StatBlock label="Retornos" value={15} total={45} color="green" />
            <StatBlock label="Urgências" value={7} total={45} color="red" />
            <StatBlock label="Teleconsultas" value={5} total={45} color="purple" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Componentes auxiliares
function MetricCard({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  color, 
  subtitle 
}: { 
  title: string
  value: string
  change: number
  icon: any
  color: 'blue' | 'green' | 'purple' | 'amber' | 'red'
  subtitle?: string
}) {
  const colors = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500'
  }

  const isPositive = change >= 0

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold">{value}</p>
            <div className="flex items-center gap-2">
              <Badge 
                variant="secondary" 
                className={`text-xs ${isPositive ? 'text-green-600' : 'text-red-600'}`}
              >
                {isPositive ? <ArrowUpRight className="h-3 w-3 mr-0.5" /> : <ArrowDownRight className="h-3 w-3 mr-0.5" />}
                {Math.abs(change)}%
              </Badge>
              {subtitle && (
                <span className="text-xs text-muted-foreground">{subtitle}</span>
              )}
            </div>
          </div>
          <div className={`p-3 rounded-lg ${colors[color]}/10`}>
            <Icon className={`h-6 w-6 text-${color}-500`} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function StatBlock({ 
  label, 
  value, 
  total, 
  color 
}: { 
  label: string
  value: number
  total: number
  color: string
}) {
  const percentage = Math.round((value / total) * 100)
  
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}</span>
      </div>
      <Progress value={percentage} className="h-2" />
      <p className="text-xs text-muted-foreground text-right">{percentage}%</p>
    </div>
  )
}

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
