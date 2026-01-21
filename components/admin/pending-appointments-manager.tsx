'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { CheckCircle, XCircle, Clock, Calendar, User, Phone, Mail, AlertCircle, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { logger } from '@/lib/logger'

interface Patient {
  id: string
  name: string
  email: string
  phone?: string
  cpf?: string
}

interface Doctor {
  id: string
  name: string
  email: string
  speciality?: string
}

interface Appointment {
  id: string
  scheduledDate: string
  type: string
  status: string
  chiefComplaint?: string
  notes?: string
  createdAt: string
  patient: Patient
  doctor: Doctor
}

interface AppointmentData {
  pending: Appointment[]
  confirmed: Appointment[]
  cancelled: Appointment[]
}

interface Summary {
  total: number
  pending: number
  confirmed: number
  cancelled: number
}

export function PendingAppointmentsManager() {
  const [appointments, setAppointments] = useState<AppointmentData>({
    pending: [],
    confirmed: [],
    cancelled: [],
  })
  const [summary, setSummary] = useState<Summary>({
    total: 0,
    pending: 0,
    confirmed: 0,
    cancelled: 0,
  })
  const [loading, setLoading] = useState(true)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve')
  const [reviewNotes, setReviewNotes] = useState('')
  const [processing, setProcessing] = useState(false)
  const { toast } = useToast()

  const loadAppointments = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/appointments/pending?showAll=true')
      const data = await res.json()

      if (data.success) {
        setAppointments(data.appointments)
        setSummary(data.summary)
      }
    } catch (error) {
      logger.error('Error loading appointments:', error)
      toast({
        title: 'Erro',
        description: 'Falha ao carregar agendamentos',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    void loadAppointments()
  }, [loadAppointments])

  const handleAction = (appointment: Appointment, action: 'approve' | 'reject') => {
    setSelectedAppointment(appointment)
    setActionType(action)
    setReviewNotes('')
    setIsDialogOpen(true)
  }

  const confirmAction = async () => {
    if (!selectedAppointment) return

    setProcessing(true)

    try {
      const res = await fetch('/api/appointments/pending', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId: selectedAppointment.id,
          action: actionType,
          notes: reviewNotes,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao processar agendamento')
      }

      toast({
        title: 'Sucesso!',
        description: data.message,
      })

      setIsDialogOpen(false)
      setSelectedAppointment(null)
      setReviewNotes('')
      
      // Reload appointments
      await loadAppointments()
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setProcessing(false)
    }
  }

  const formatDateTime = (date: string) => {
    return format(new Date(date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
  }

  const formatDate = (date: string) => {
    return format(new Date(date), 'dd/MM/yyyy', { locale: ptBR })
  }

  const formatTime = (date: string) => {
    return format(new Date(date), 'HH:mm', { locale: ptBR })
  }

  const AppointmentCard = ({ appointment, showActions = true }: { appointment: Appointment; showActions?: boolean }) => (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-4 w-4" />
              {appointment.patient.name}
            </CardTitle>
            <CardDescription className="mt-1">
              Dr(a). {appointment.doctor.name}
              {appointment.doctor.speciality && ` - ${appointment.doctor.speciality}`}
            </CardDescription>
          </div>
          {appointment.status === 'SCHEDULED' && (
            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
              <Clock className="h-3 w-3 mr-1" />
              Pendente
            </Badge>
          )}
          {appointment.status === 'IN_PROGRESS' && (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
              <CheckCircle className="h-3 w-3 mr-1" />
              Confirmado
            </Badge>
          )}
          {appointment.status === 'CANCELLED' && (
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
              <XCircle className="h-3 w-3 mr-1" />
              Rejeitado
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Data e Hora */}
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{formatDateTime(appointment.scheduledDate)}</span>
          </div>

          {/* Contato do Paciente */}
          <div className="space-y-1 text-sm text-muted-foreground">
            {appointment.patient.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-3 w-3" />
                <span>{appointment.patient.email}</span>
              </div>
            )}
            {appointment.patient.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-3 w-3" />
                <span>{appointment.patient.phone}</span>
              </div>
            )}
          </div>

          {/* Motivo */}
          {appointment.chiefComplaint && (
            <div className="text-sm">
              <span className="font-medium">Motivo: </span>
              <span className="text-muted-foreground">{appointment.chiefComplaint}</span>
            </div>
          )}

          {/* Solicitado em */}
          <div className="text-xs text-muted-foreground pt-2 border-t">
            Solicitado em {formatDateTime(appointment.createdAt)}
          </div>

          {/* Ações */}
          {showActions && appointment.status === 'SCHEDULED' && (
            <div className="flex gap-2 pt-3">
              <Button
                onClick={() => handleAction(appointment, 'approve')}
                className="flex-1"
                variant="default"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Aprovar
              </Button>
              <Button
                onClick={() => handleAction(appointment, 'reject')}
                className="flex-1"
                variant="destructive"
              >
                <XCircle className="h-4 w-4 mr-1" />
                Rejeitar
              </Button>
            </div>
          )}

          {/* Notas de revisão */}
          {appointment.notes && appointment.notes.includes('APROVADO') && (
            <Alert className="mt-3 bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-xs text-green-800">
                {appointment.notes.split('\n\n').pop()}
              </AlertDescription>
            </Alert>
          )}
          {appointment.notes && appointment.notes.includes('REJEITADO') && (
            <Alert className="mt-3 bg-red-50 border-red-200">
              <XCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-xs text-red-800">
                {appointment.notes.split('\n\n').pop()}
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  )

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Agendamentos de Pacientes</CardTitle>
          <CardDescription>Carregando...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Agendamentos de Pacientes
              </CardTitle>
              <CardDescription className="mt-1">
                Aprovar ou rejeitar solicitações de agendamento
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={loadAppointments}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Resumo */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{summary.total}</div>
                <p className="text-xs text-muted-foreground">Total</p>
              </CardContent>
            </Card>
            <Card className="border-yellow-200 bg-yellow-50">
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-yellow-700">{summary.pending}</div>
                <p className="text-xs text-yellow-600">Pendentes</p>
              </CardContent>
            </Card>
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-green-700">{summary.confirmed}</div>
                <p className="text-xs text-green-600">Confirmados</p>
              </CardContent>
            </Card>
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-red-700">{summary.cancelled}</div>
                <p className="text-xs text-red-600">Rejeitados</p>
              </CardContent>
            </Card>
          </div>

          {/* Alertas */}
          {summary.pending > 0 && (
            <Alert className="mb-4 bg-yellow-50 border-yellow-200">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                <strong>{summary.pending}</strong> agendamento(s) aguardando aprovação!
              </AlertDescription>
            </Alert>
          )}

          {/* Tabs */}
          <Tabs defaultValue="pending" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="pending">
                Pendentes ({summary.pending})
              </TabsTrigger>
              <TabsTrigger value="confirmed">
                Confirmados ({summary.confirmed})
              </TabsTrigger>
              <TabsTrigger value="cancelled">
                Rejeitados ({summary.cancelled})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="mt-4">
              {appointments.pending.length === 0 ? (
                <Alert>
                  <AlertDescription>
                    Nenhum agendamento pendente no momento.
                  </AlertDescription>
                </Alert>
              ) : (
                appointments.pending.map((appointment) => (
                  <AppointmentCard key={appointment.id} appointment={appointment} />
                ))
              )}
            </TabsContent>

            <TabsContent value="confirmed" className="mt-4">
              {appointments.confirmed.length === 0 ? (
                <Alert>
                  <AlertDescription>
                    Nenhum agendamento confirmado.
                  </AlertDescription>
                </Alert>
              ) : (
                appointments.confirmed.map((appointment) => (
                  <AppointmentCard key={appointment.id} appointment={appointment} showActions={false} />
                ))
              )}
            </TabsContent>

            <TabsContent value="cancelled" className="mt-4">
              {appointments.cancelled.length === 0 ? (
                <Alert>
                  <AlertDescription>
                    Nenhum agendamento rejeitado.
                  </AlertDescription>
                </Alert>
              ) : (
                appointments.cancelled.map((appointment) => (
                  <AppointmentCard key={appointment.id} appointment={appointment} showActions={false} />
                ))
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Dialog de Confirmação */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' ? 'Aprovar Agendamento' : 'Rejeitar Agendamento'}
            </DialogTitle>
            <DialogDescription>
              {selectedAppointment && (
                <div className="mt-4 space-y-2 text-sm">
                  <p><strong>Paciente:</strong> {selectedAppointment.patient.name}</p>
                  <p><strong>Profissional:</strong> {selectedAppointment.doctor.name}</p>
                  <p><strong>Data:</strong> {formatDate(selectedAppointment.scheduledDate)}</p>
                  <p><strong>Horário:</strong> {formatTime(selectedAppointment.scheduledDate)}</p>
                  {selectedAppointment.chiefComplaint && (
                    <p><strong>Motivo:</strong> {selectedAppointment.chiefComplaint}</p>
                  )}
                </div>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="notes">
                Observações {actionType === 'reject' && '(Motivo da rejeição)'}
              </Label>
              <Textarea
                id="notes"
                placeholder={
                  actionType === 'approve'
                    ? 'Observações opcionais...'
                    : 'Explique o motivo da rejeição...'
                }
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                rows={3}
              />
            </div>

            {actionType === 'approve' && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800 text-sm">
                  O paciente será notificado sobre a confirmação do agendamento.
                </AlertDescription>
              </Alert>
            )}

            {actionType === 'reject' && (
              <Alert className="bg-red-50 border-red-200">
                <XCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800 text-sm">
                  O paciente será notificado sobre a rejeição. Recomenda-se explicar o motivo.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={processing}>
              Cancelar
            </Button>
            <Button
              onClick={confirmAction}
              disabled={processing}
              variant={actionType === 'approve' ? 'default' : 'destructive'}
            >
              {processing ? 'Processando...' : actionType === 'approve' ? 'Aprovar' : 'Rejeitar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
