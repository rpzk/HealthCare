'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Loader2,
  Phone,
  Mail,
  User,
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ProfessionalCalendar } from '@/components/professional-calendar'

interface Consultation {
  id: string
  patientName: string
  patientEmail: string
  patientPhone?: string
  patientCPF?: string
  scheduledDate: string
  status: string
  type: string
  reason?: string
  notes?: string
  createdAt: string
}

interface Stats {
  total: number
  scheduled: number
  inProgress: number
  completed: number
  cancelled: number
}

const PROFESSIONAL_ROLES = ['DOCTOR', 'NURSE', 'PHYSIOTHERAPIST', 'PSYCHOLOGIST', 'NUTRITIONIST', 'DENTIST']

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  SCHEDULED: {
    label: 'Agendada',
    color: 'bg-blue-100 text-blue-800',
    icon: <Clock className="h-4 w-4" />,
  },
  IN_PROGRESS: {
    label: 'Em andamento',
    color: 'bg-green-100 text-green-800',
    icon: <CheckCircle2 className="h-4 w-4" />,
  },
  COMPLETED: {
    label: 'Concluída',
    color: 'bg-gray-100 text-gray-800',
    icon: <CheckCircle2 className="h-4 w-4" />,
  },
  CANCELLED: {
    label: 'Cancelada',
    color: 'bg-red-100 text-red-800',
    icon: <XCircle className="h-4 w-4" />,
  },
}

export default function AppointmentsDashboard() {
  const { data: session } = useSession()
  const [consultations, setConsultations] = useState<Consultation[]>([])
  const [stats, setStats] = useState<Stats>({
    total: 0,
    scheduled: 0,
    inProgress: 0,
    completed: 0,
    cancelled: 0,
  })
  const [loading, setLoading] = useState(true)
  const [activeStatus, setActiveStatus] = useState('SCHEDULED')
  const [processing, setProcessing] = useState<string | null>(null)

  const isProfessional = session?.user?.role && PROFESSIONAL_ROLES.includes(session.user.role)

  useEffect(() => {
    if (isProfessional) {
      loadConsultations()
    }
  }, [isProfessional])

  const loadConsultations = async () => {
    try {
      setLoading(true)
      const response = await fetch(
        `/api/appointments/my-consultations?status=${activeStatus}&days=30`
      )
      if (response.ok) {
        const data = await response.json()
        setConsultations(data.consultations || [])
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Error loading consultations:', error)
      toast.error('Erro ao carregar consultas')
    } finally {
      setLoading(false)
    }
  }

  const handleApproveConsultation = async (consultationId: string) => {
    try {
      setProcessing(consultationId)
      const response = await fetch('/api/appointments/my-consultations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consultationId,
          action: 'approve',
        }),
      })

      if (!response.ok) throw new Error('Erro ao aprovar')

      toast.success('Consulta aprovada!')
      await loadConsultations()
    } catch (error) {
      console.error('Error:', error)
      toast.error('Erro ao aprovar consulta')
    } finally {
      setProcessing(null)
    }
  }

  const handleRejectConsultation = async (consultationId: string) => {
    if (!confirm('Tem certeza que quer rejeitar esta consulta?')) return

    try {
      setProcessing(consultationId)
      const response = await fetch('/api/appointments/my-consultations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consultationId,
          action: 'reject',
        }),
      })

      if (!response.ok) throw new Error('Erro ao rejeitar')

      toast.success('Consulta rejeitada')
      await loadConsultations()
    } catch (error) {
      console.error('Error:', error)
      toast.error('Erro ao rejeitar consulta')
    } finally {
      setProcessing(null)
    }
  }

  if (!isProfessional) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 p-8 flex items-center justify-center">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Apenas profissionais de saúde podem acessar este dashboard
              </AlertDescription>
            </Alert>
          </main>
        </div>
      </div>
    )
  }

  const filteredConsultations = consultations.filter((c) => c.status === activeStatus)

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Meus Agendamentos</h1>
              <p className="text-muted-foreground mt-2">
                Gerencie suas consultas agendadas e pendentes
              </p>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-5 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Total</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.total}</div>
                </CardContent>
              </Card>

              <Card className="border-blue-200 bg-blue-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4" /> Agendadas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.scheduled}</div>
                </CardContent>
              </Card>

              <Card className="border-green-200 bg-green-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" /> Em andamento
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.inProgress}</div>
                </CardContent>
              </Card>

              <Card className="border-gray-200 bg-gray-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Concluídas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.completed}</div>
                </CardContent>
              </Card>

              <Card className="border-red-200 bg-red-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <XCircle className="h-4 w-4" /> Canceladas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.cancelled}</div>
                </CardContent>
              </Card>
            </div>

            {/* Professional Calendar */}
            <ProfessionalCalendar
              events={consultations.map((c) => ({
                id: c.id,
                title: `${c.patientName} - ${c.reason || 'Consulta'}`,
                start: new Date(c.scheduledDate),
                end: new Date(new Date(c.scheduledDate).getTime() + 30 * 60000), // 30 min default
                resource: {
                  type: 'consultation' as const,
                  status: c.status,
                  patientName: c.patientName,
                },
              }))}
              onSelectEvent={(event) => {
                const consultation = consultations.find((c) => c.id === event.id)
                if (consultation) {
                  toast.info(
                    `${consultation.patientName} - ${consultation.status}`
                  )
                }
              }}
            />

            {/* Consultations List */}
            <Card>
              <CardHeader>
                <CardTitle>Consultas por Status</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs value={activeStatus} onValueChange={setActiveStatus}>
                  <TabsList>
                    <TabsTrigger value="SCHEDULED" className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Agendadas ({stats.scheduled})
                    </TabsTrigger>
                    <TabsTrigger value="IN_PROGRESS" className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Em andamento ({stats.inProgress})
                    </TabsTrigger>
                    <TabsTrigger value="COMPLETED" className="flex items-center gap-2">
                      Concluídas ({stats.completed})
                    </TabsTrigger>
                    <TabsTrigger value="CANCELLED" className="flex items-center gap-2">
                      <XCircle className="h-4 w-4" />
                      Canceladas ({stats.cancelled})
                    </TabsTrigger>
                  </TabsList>

                  {['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map((status) => (
                    <TabsContent key={status} value={status} className="space-y-4 mt-4">
                      {loading ? (
                        <div className="flex justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                      ) : consultations.filter((c) => c.status === status).length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>Nenhuma consulta {STATUS_CONFIG[status].label.toLowerCase()}</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {consultations
                            .filter((c) => c.status === status)
                            .map((consultation) => (
                              <Card key={consultation.id} className="hover:shadow-md transition">
                                <CardContent className="pt-6">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1 space-y-3">
                                      {/* Patient Info */}
                                      <div className="flex items-start gap-4">
                                        <div className="bg-purple-100 rounded-full p-3">
                                          <User className="h-5 w-5 text-purple-600" />
                                        </div>
                                        <div className="flex-1">
                                          <h4 className="font-semibold">
                                            {consultation.patientName}
                                          </h4>
                                          <div className="flex flex-col gap-1 mt-1 text-sm text-muted-foreground">
                                            {consultation.patientEmail && (
                                              <div className="flex items-center gap-2">
                                                <Mail className="h-4 w-4" />
                                                {consultation.patientEmail}
                                              </div>
                                            )}
                                            {consultation.patientPhone && (
                                              <div className="flex items-center gap-2">
                                                <Phone className="h-4 w-4" />
                                                {consultation.patientPhone}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>

                                      {/* Appointment Details */}
                                      <div className="grid grid-cols-3 gap-4 pt-3 border-t">
                                        <div>
                                          <p className="text-sm text-muted-foreground">Data e Hora</p>
                                          <p className="font-medium">
                                            {format(
                                              new Date(consultation.scheduledDate),
                                              "dd 'de' MMMM 'às' HH:mm",
                                              { locale: ptBR }
                                            )}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-sm text-muted-foreground">Motivo</p>
                                          <p className="font-medium">{consultation.reason || '—'}</p>
                                        </div>
                                        <div>
                                          <p className="text-sm text-muted-foreground">Status</p>
                                          <Badge className={STATUS_CONFIG[status].color}>
                                            {STATUS_CONFIG[status].label}
                                          </Badge>
                                        </div>
                                      </div>

                                      {consultation.notes && (
                                        <div className="pt-3 border-t">
                                          <p className="text-sm text-muted-foreground">Notas</p>
                                          <p className="text-sm">{consultation.notes}</p>
                                        </div>
                                      )}
                                    </div>

                                    {/* Actions */}
                                    {status === 'SCHEDULED' && (
                                      <div className="flex flex-col gap-2 ml-4">
                                        <Button
                                          size="sm"
                                          className="bg-green-600 hover:bg-green-700"
                                          onClick={() => handleApproveConsultation(consultation.id)}
                                          disabled={processing === consultation.id}
                                        >
                                          {processing === consultation.id ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                          ) : (
                                            'Aprovar'
                                          )}
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="destructive"
                                          onClick={() => handleRejectConsultation(consultation.id)}
                                          disabled={processing === consultation.id}
                                        >
                                          Rejeitar
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                        </div>
                      )}
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
