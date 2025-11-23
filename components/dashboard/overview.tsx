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
        throw new Error('Falha ao carregar dados do dashboard')
      }

      const dashboardData = await response.json()
      // A API retorna { success: true, data: {...} }
      setData(dashboardData.data || dashboardData)
    } catch (err) {
      console.error('Erro ao carregar dashboard:', err)
      setError('Não foi possível carregar os dados do dashboard.')
      
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
      color: 'bg-blue-500'
    },
    {
      title: 'Consultas Hoje',
      value: (data?.stats?.consultationsToday || 0).toString(),
      change: '+5',
      changeType: 'positive' as const,
      icon: Calendar,
      color: 'bg-green-500'
    },
    {
      title: 'Prontuários Atualizados',
      value: (data?.stats?.updatedRecords || 0).toString(),
      change: '+18%',
      changeType: 'positive' as const,
      icon: FileText,
      color: 'bg-purple-500'
    },
    {
      title: 'Taxa de Conclusão',
      value: `${data?.stats?.completionRate || 0}%`,
      change: '+2%',
      changeType: 'positive' as const,
      icon: TrendingUp,
      color: 'bg-orange-500'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Banner de erro se houver */}
      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-yellow-400" />
            <div className="ml-3">
              <p className="text-sm text-yellow-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Estatísticas principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.title} className="card-hover">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {stat.title}
                  </p>
                  <p className="text-3xl font-bold text-gray-900">
                    {stat.value}
                  </p>
                  <div className="flex items-center mt-1">
                    <span className={`text-sm font-medium ${
                      stat.changeType === 'positive' 
                        ? 'text-green-600' 
                        : 'text-red-600'
                    }`}>
                      {stat.change}
                    </span>
                    <span className="text-sm text-gray-500 ml-1">
                      vs. mês anterior
                    </span>
                  </div>
                </div>
                <div className={`p-3 rounded-lg ${stat.color}`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Próximas consultas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>Próximas Consultas</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.appointments && data.appointments.length > 0 ? (
                data.appointments.map((appointment) => (
                  <button
                    key={appointment.id}
                    className="w-full text-left flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-medical-primary"
                    aria-label={`Ver detalhes da consulta de ${appointment.patient} às ${appointment.time}`}
                    title={`Abrir consulta • ${appointment.patient} • ${appointment.time}`}
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
                    <div>
                      <p className="font-medium text-gray-900">
                        {appointment.patient}
                      </p>
                      <p className="text-sm text-gray-600">
                        {appointment.type}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">
                        {appointment.time}
                      </p>
                      <p className="text-sm text-gray-600">
                        {appointment.duration}
                      </p>
                    </div>
                  </button>
                ))
              ) : (
                <p className="text-center text-gray-500 py-4">
                  Nenhuma consulta agendada
                </p>
              )}
            </div>
            <Button className="w-full mt-4" variant="outline" onClick={() => router.push('/consultations')}>
              Ver Agenda Completa
            </Button>
          </CardContent>
        </Card>

        {/* Pacientes recentes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <UserCheck className="h-5 w-5" />
              <span>Pacientes Recentes</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.patients && data.patients.length > 0 ? (
                data.patients.map((patient) => (
                  <div 
                    key={patient.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
                  >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-medical-primary rounded-full flex items-center justify-center">
                      <span className="text-white font-medium text-sm">
                        {patient.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {patient.name}
                      </p>
                      <p className="text-sm text-gray-600">
                        {patient.age} anos • {patient.lastVisit}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`status-badge ${
                      patient.priority === 'high' 
                        ? 'status-emergency' 
                        : 'status-active'
                    }`}>
                      {patient.status}
                    </span>
                    {patient.priority === 'high' && (
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                </div>
              ))
              ) : (
                <p className="text-center text-gray-500 py-4">
                  Nenhum paciente encontrado
                </p>
              )}
            </div>
            <Button className="w-full mt-4" variant="outline" onClick={() => router.push('/patients')}>
              Ver Todos os Pacientes
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Ações rápidas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>Ações Rápidas</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button className="h-20 flex flex-col space-y-2" variant="outline">
              <Users className="h-6 w-6" />
              <span>Novo Paciente</span>
            </Button>
            <Button className="h-20 flex flex-col space-y-2" variant="outline">
              <Calendar className="h-6 w-6" />
              <span>Agendar Consulta</span>
            </Button>
            <Button className="h-20 flex flex-col space-y-2" variant="outline">
              <FileText className="h-6 w-6" />
              <span>Criar Prontuário</span>
            </Button>
            <Button 
              className="h-20 flex flex-col space-y-2 relative" 
              variant="medical"
              onClick={() => window.open('/patients/1/agent', '_blank')}
            >
              <Activity className="h-6 w-6" />
              <span>🤖 Agente Médico</span>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
