'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  Bell,
  Send,
  RefreshCw,
  User,
  ChevronRight,
  TrendingUp,
  Target,
  Filter
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { logger } from '@/lib/logger'

interface ReassessmentSchedule {
  id: string
  userId: string
  userName: string
  assessmentType: 'stratum' | 'strength' | 'both'
  lastAssessmentDate: string
  nextDueDate: string
  daysUntilDue: number
  status: 'upcoming' | 'due' | 'overdue'
  notificationsSent: number
  reminderSentAt?: string
}

interface ReassessmentStats {
  total: number
  upcoming: number
  due: number
  overdue: number
  completedThisYear: number
  averageCompletionRate: number
}

const statusConfig = {
  upcoming: { 
    label: 'Programado', 
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    icon: Calendar
  },
  due: { 
    label: 'Vencendo', 
    color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    icon: Clock
  },
  overdue: { 
    label: 'Atrasado', 
    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    icon: AlertCircle
  }
}

const assessmentTypeConfig = {
  stratum: { label: 'Stratum', icon: TrendingUp, color: 'text-purple-600' },
  strength: { label: 'Forças', icon: Target, color: 'text-green-600' },
  both: { label: 'Ambos', icon: CheckCircle2, color: 'text-blue-600' }
}

export function ReassessmentCalendar() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [schedules, setSchedules] = useState<ReassessmentSchedule[]>([])
  const [stats, setStats] = useState<ReassessmentStats | null>(null)
  const [selectedSchedules, setSelectedSchedules] = useState<Set<string>>(new Set())
  const [statusFilter, setStatusFilter] = useState<'all' | 'upcoming' | 'due' | 'overdue'>('all')
  const [sending, setSending] = useState(false)

  const fetchSchedules = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') {
        params.set('status', statusFilter)
      }
      
      const response = await fetch(`/api/development/reassessment?${params}`)
      if (!response.ok) throw new Error('Failed to fetch schedules')
      
      const data = await response.json()
      setSchedules(data.schedules || [])
      setStats(data.stats || null)
    } catch (error) {
      logger.error('Error fetching schedules:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os agendamentos',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [statusFilter, toast])

  useEffect(() => {
    void fetchSchedules()
  }, [fetchSchedules])

  const toggleSelect = (id: string) => {
    setSelectedSchedules(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const selectAll = () => {
    if (selectedSchedules.size === schedules.length) {
      setSelectedSchedules(new Set())
    } else {
      setSelectedSchedules(new Set(schedules.map(s => s.id)))
    }
  }

  const sendReminders = async () => {
    if (selectedSchedules.size === 0) {
      toast({
        title: 'Selecione pacientes',
        description: 'Selecione ao menos um paciente para enviar lembretes',
        variant: 'destructive'
      })
      return
    }

    setSending(true)
    try {
      const response = await fetch('/api/development/reassessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduleIds: Array.from(selectedSchedules),
          sendEmail: true
        })
      })

      if (!response.ok) throw new Error('Failed to send reminders')
      
      const data = await response.json()
      
      toast({
        title: 'Lembretes enviados',
        description: `${data.remindersSent} lembretes foram enviados com sucesso`
      })

      setSelectedSchedules(new Set())
      fetchSchedules()
    } catch (error) {
      logger.error('Error sending reminders:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível enviar os lembretes',
        variant: 'destructive'
      })
    } finally {
      setSending(false)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="h-6 w-6 text-purple-600" />
            Calendário de Reavaliações
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Gerencie as reavaliações anuais de stratum e forças
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchSchedules}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.total}</p>
                </div>
                <Calendar className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Programados</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.upcoming}</p>
                </div>
                <Clock className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-yellow-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Vencendo</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.due}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-red-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Atrasados</p>
                  <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Taxa Conclusão</p>
                  <p className="text-2xl font-bold text-green-600">{stats.averageCompletionRate}%</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Actions Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedSchedules.size === schedules.length && schedules.length > 0}
                  onCheckedChange={selectAll}
                />
                <span className="text-sm text-gray-600">
                  {selectedSchedules.size > 0 
                    ? `${selectedSchedules.size} selecionado(s)`
                    : 'Selecionar todos'
                  }
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                  className="px-3 py-1.5 border rounded-lg text-sm bg-white dark:bg-gray-800"
                >
                  <option value="all">Todos os status</option>
                  <option value="upcoming">Programados</option>
                  <option value="due">Vencendo</option>
                  <option value="overdue">Atrasados</option>
                </select>
              </div>
            </div>
            
            <Button 
              onClick={sendReminders} 
              disabled={selectedSchedules.size === 0 || sending}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {sending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Enviar Lembretes ({selectedSchedules.size})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Schedules List */}
      <Card>
        <CardHeader>
          <CardTitle>Agendamentos de Reavaliação</CardTitle>
          <CardDescription>
            {schedules.length} reavaliações encontradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {schedules.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
              <h3 className="text-lg font-medium">Nenhuma reavaliação pendente</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Todas as reavaliações estão em dia
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {schedules.map(schedule => {
                const status = statusConfig[schedule.status]
                const assessmentType = assessmentTypeConfig[schedule.assessmentType]
                const StatusIcon = status.icon
                const TypeIcon = assessmentType.icon

                return (
                  <div
                    key={schedule.id}
                    className={`flex items-center gap-4 p-4 border rounded-lg transition-all ${
                      selectedSchedules.has(schedule.id) 
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' 
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <Checkbox
                      checked={selectedSchedules.has(schedule.id)}
                      onCheckedChange={() => toggleSelect(schedule.id)}
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">{schedule.userName}</span>
                        <Badge className={status.color}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {status.label}
                        </Badge>
                        <Badge variant="outline" className="flex items-center gap-1">
                          <TypeIcon className={`h-3 w-3 ${assessmentType.color}`} />
                          {assessmentType.label}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>
                          Última: {formatDate(schedule.lastAssessmentDate)}
                        </span>
                        <span>•</span>
                        <span className={schedule.daysUntilDue < 0 ? 'text-red-600 font-medium' : ''}>
                          {schedule.daysUntilDue < 0 
                            ? `${Math.abs(schedule.daysUntilDue)} dias atrasado`
                            : schedule.daysUntilDue === 0
                            ? 'Vence hoje'
                            : `Vence em ${schedule.daysUntilDue} dias`
                          }
                        </span>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(`/development`)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Bell className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900 dark:text-blue-100">
                Sistema de Lembretes Automáticos
              </h4>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                Reavaliações de stratum e forças são recomendadas anualmente para acompanhar
                o desenvolvimento do paciente. Selecione os pacientes e envie lembretes
                para agendar as próximas avaliações.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
