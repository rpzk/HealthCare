'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Users, 
  Calendar, 
  FileText, 
  TrendingUp,
  Clock,
  UserCheck,
  AlertTriangle,
  Activity
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { DashboardSkeleton } from './skeleton'

interface DashboardStats {
  totalPatients: number
  consultationsToday: number
  updatedRecords: number
  completionRate: number
}

interface UpcomingAppointment {
  id: string
  consultationId?: string
  patientId?: string
  patient: string
  time: string
  type: string
  duration: string
  date?: string
}

interface RecentPatient {
  id: string
  name: string
  age: number
  lastVisit: string
  status: string
  priority: 'normal' | 'high'
}

interface DashboardData {
  stats: DashboardStats
  appointments: UpcomingAppointment[]
  patients: RecentPatient[]
}

export function DashboardOverview() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/dashboard?section=all')
      
      if (response.status === 401) {
        // Não autenticado: redireciona para login com retorno ao dashboard
        const callback = typeof window !== 'undefined' ? window.location.href : '/'
        router.push(`/auth/signin?callbackUrl=${encodeURIComponent(callback)}`)
        return
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Falha ao carregar dados do dashboard');
      }

      const dashboardData = await response.json()
      // A API retorna { success: true, data: {...} }
      setData(dashboardData.data || dashboardData)
    } catch (err: any) {
      console.error('Erro ao carregar dashboard:', err)
      setError(err.message || 'Não foi possível carregar os dados do dashboard.')
      
      // Em caso de erro, mostra zerado em vez de dados falsos
      setData({
        stats: {
          totalPatients: 0,
          consultationsToday: 0,
          updatedRecords: 0,
          completionRate: 0
        },
        appointments: [],
        patients: []
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <DashboardSkeleton />
  }

  if (!data) {
    return <div className="text-center py-8 text-red-600">Erro ao carregar dashboard</div>
  }

  const stats = [
    {
      title: 'Total de Pacientes',
      value: (data?.stats?.totalPatients || 0).toLocaleString(),
      change: '+12%',
      changeType: 'positive' as const,
      icon: Users,
      color: 'bg-blue-500',
      gradient: 'from-blue-500 to-blue-600'
    },
    {
      title: 'Consultas Hoje',
      value: (data?.stats?.consultationsToday || 0).toString(),
      change: '+5',
      changeType: 'positive' as const,
      icon: Calendar,
      color: 'bg-green-500',
      gradient: 'from-green-500 to-green-600'
    },
    {
      title: 'Prontuários Atualizados',
      value: (data?.stats?.updatedRecords || 0).toString(),
      change: '+18%',
      changeType: 'positive' as const,
      icon: FileText,
      color: 'bg-purple-500',
      gradient: 'from-purple-500 to-purple-600'
    },
    {
      title: 'Taxa de Conclusão',
      value: `${data?.stats?.completionRate || 0}%`,
      change: '+2%',
      changeType: 'positive' as const,
      icon: TrendingUp,
      color: 'bg-orange-500',
      gradient: 'from-orange-500 to-orange-600'
    }
  ]

  return (
    <div className="space-y-8">
      {/* Banner de erro se houver */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Erro ao carregar dados</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Estatísticas principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.title} className="card-hover border-none shadow-md overflow-hidden relative group">
            <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${stat.gradient} opacity-10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110`} />
            <CardContent className="p-6 relative z-10">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </p>
                  <p className="text-3xl font-bold text-foreground mt-2">
                    {stat.value}
                  </p>
                  <div className="flex items-center mt-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      stat.changeType === 'positive' 
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {stat.change}
                    </span>
                    <span className="text-xs text-muted-foreground ml-2">
                      vs. mês anterior
                    </span>
                  </div>
                </div>
                <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.gradient} shadow-lg`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Próximas consultas */}
        <Card className="border-none shadow-md">
          <CardHeader className="border-b border-border/50 pb-4">
            <CardTitle className="flex items-center space-x-2 text-lg">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <span>Próximas Consultas</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {data.appointments && data.appointments.length > 0 ? (
                data.appointments.map((appointment) => (
                  <button
                    key={appointment.id}
                    className="w-full text-left flex items-center justify-between p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors group"
                    onClick={() => {
                      if (appointment.consultationId) {
                        router.push(`/consultations/${appointment.consultationId}`)
                        return
                      }
                      const params = new URLSearchParams()
                      if (appointment.patientId) params.set('patientId', appointment.patientId)
                      if (appointment.date) params.set('date', appointment.date)
                      const qs = params.toString()
                      router.push(qs ? `/consultations?${qs}` : '/consultations')
                    }}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-semibold">
                        {appointment.patient.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-foreground group-hover:text-primary transition-colors">
                          {appointment.patient}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {appointment.type}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-foreground">
                        {appointment.time}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {appointment.duration}
                      </p>
                    </div>
                  </button>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center border-2 border-dashed border-muted rounded-xl">
                  <Calendar className="h-10 w-10 text-muted-foreground mb-3 opacity-50" />
                  <p className="text-muted-foreground font-medium">Nenhuma consulta agendada</p>
                  <p className="text-sm text-muted-foreground/60">Sua agenda está livre por enquanto</p>
                </div>
              )}
            </div>
            <Button className="w-full mt-6" variant="outline" onClick={() => router.push('/consultations')}>
              Ver Agenda Completa
            </Button>
          </CardContent>
        </Card>

        {/* Pacientes recentes */}
        <Card className="border-none shadow-md">
          <CardHeader className="border-b border-border/50 pb-4">
            <CardTitle className="flex items-center space-x-2 text-lg">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <UserCheck className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <span>Pacientes Recentes</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {data.patients && data.patients.length > 0 ? (
                data.patients.map((patient) => (
                  <div 
                    key={patient.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                  >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center shadow-sm">
                      <span className="text-white font-medium text-sm">
                        {patient.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {patient.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {patient.age} anos • {patient.lastVisit}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      patient.priority === 'high' 
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' 
                        : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    }`}>
                      {patient.status}
                    </span>
                  </div>
                </div>
              ))
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center border-2 border-dashed border-muted rounded-xl">
                  <Users className="h-10 w-10 text-muted-foreground mb-3 opacity-50" />
                  <p className="text-muted-foreground font-medium">Nenhum paciente recente</p>
                  <p className="text-sm text-muted-foreground/60">Os pacientes atendidos aparecerão aqui</p>
                </div>
              )}
            </div>
            <Button className="w-full mt-6" variant="outline" onClick={() => router.push('/patients')}>
              Ver Todos os Pacientes
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Ações rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <button className="p-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl text-white shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all group text-left">
          <div className="bg-white/20 w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:bg-white/30 transition-colors">
            <Users className="h-6 w-6" />
          </div>
          <h3 className="font-semibold text-lg">Novo Paciente</h3>
          <p className="text-blue-100 text-sm mt-1">Cadastrar ficha completa</p>
        </button>

        <button className="p-6 bg-gradient-to-br from-green-500 to-green-600 rounded-xl text-white shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all group text-left">
          <div className="bg-white/20 w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:bg-white/30 transition-colors">
            <Calendar className="h-6 w-6" />
          </div>
          <h3 className="font-semibold text-lg">Agendar Consulta</h3>
          <p className="text-green-100 text-sm mt-1">Marcar novo horário</p>
        </button>

        <button className="p-6 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl text-white shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all group text-left">
          <div className="bg-white/20 w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:bg-white/30 transition-colors">
            <FileText className="h-6 w-6" />
          </div>
          <h3 className="font-semibold text-lg">Criar Prontuário</h3>
          <p className="text-purple-100 text-sm mt-1">Registro clínico rápido</p>
        </button>

        <button 
          className="p-6 bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-xl text-white shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all group text-left relative overflow-hidden"
          onClick={() => window.open('/patients/1/agent', '_blank')}
        >
          <div className="absolute top-0 right-0 p-2">
            <div className="flex items-center space-x-1 bg-white/10 rounded-full px-2 py-1">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-xs font-medium">Online</span>
            </div>
          </div>
          <div className="bg-white/20 w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:bg-white/30 transition-colors">
            <Activity className="h-6 w-6" />
          </div>
          <h3 className="font-semibold text-lg">Agente Médico IA</h3>
          <p className="text-indigo-200 text-sm mt-1">Assistente inteligente</p>
        </button>
      </div>
    </div>
  )
}
