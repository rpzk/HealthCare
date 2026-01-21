'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Clock, CheckCircle, XCircle, Calendar, AlertCircle, Info } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { logger } from '@/lib/logger'

interface Appointment {
  id: string
  scheduledDate: string
  type: string
  status: string
  chiefComplaint?: string
  notes?: string
  createdAt: string
  doctor: {
    id: string
    name: string
    speciality?: string
  }
}

export function PatientAppointmentStatus() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAppointments()
    
    // Auto-refresh a cada 30 segundos para ver mudanças de status
    const interval = setInterval(loadAppointments, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadAppointments = async () => {
    try {
      const res = await fetch('/api/patient/appointments')
      const data = await res.json()
      setAppointments(data.data || [])
    } catch (error) {
      logger.error('Error loading appointments:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDateTime = (date: string) => {
    return format(new Date(date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
  }

  const getStatusInfo = (appointment: Appointment) => {
    const isAutoBooked = appointment.notes?.includes('Auto-agendamento')
    
    if (!isAutoBooked) {
      return {
        icon: CheckCircle,
        color: 'green',
        label: 'Confirmado',
        description: 'Seu agendamento está confirmado',
      }
    }

    switch (appointment.status) {
      case 'SCHEDULED':
        return {
          icon: Clock,
          color: 'yellow',
          label: 'Aguardando Confirmação',
          description: 'Seu agendamento está sendo analisado pela equipe médica. Você receberá uma notificação em breve.',
        }
      case 'IN_PROGRESS':
        if (appointment.notes?.includes('APROVADO')) {
          return {
            icon: CheckCircle,
            color: 'green',
            label: 'Confirmado',
            description: 'Seu agendamento foi aprovado! Compareça no horário marcado.',
          }
        }
        return {
          icon: CheckCircle,
          color: 'green',
          label: 'Confirmado',
          description: 'Seu agendamento está confirmado',
        }
      case 'CANCELLED':
        return {
          icon: XCircle,
          color: 'red',
          label: 'Não Aprovado',
          description: 'Infelizmente seu agendamento não pôde ser aprovado. Entre em contato com a clínica para reagendar.',
        }
      default:
        return {
          icon: Info,
          color: 'blue',
          label: appointment.status,
          description: 'Status do agendamento',
        }
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Meus Agendamentos</CardTitle>
          <CardDescription>Carregando...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (appointments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Meus Agendamentos</CardTitle>
          <CardDescription>Você não possui agendamentos futuros</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Meus Agendamentos</h2>
      
      {appointments.map((appointment) => {
        const statusInfo = getStatusInfo(appointment)
        const StatusIcon = statusInfo.icon
        const isPending = appointment.status === 'SCHEDULED' && appointment.notes?.includes('Auto-agendamento')
        const isRejected = appointment.status === 'CANCELLED'
        const isApproved = appointment.status === 'IN_PROGRESS' && appointment.notes?.includes('APROVADO')

        return (
          <Card key={appointment.id} className={
            isPending ? 'border-yellow-300' :
            isApproved ? 'border-green-300' :
            isRejected ? 'border-red-300' : ''
          }>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CardTitle className="text-lg">
                    Dr(a). {appointment.doctor.name}
                  </CardTitle>
                  {appointment.doctor.speciality && (
                    <CardDescription>{appointment.doctor.speciality}</CardDescription>
                  )}
                </div>
                <Badge 
                  variant="outline" 
                  className={
                    statusInfo.color === 'yellow' ? 'bg-yellow-50 text-yellow-700 border-yellow-300' :
                    statusInfo.color === 'green' ? 'bg-green-50 text-green-700 border-green-300' :
                    statusInfo.color === 'red' ? 'bg-red-50 text-red-700 border-red-300' :
                    ''
                  }
                >
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {statusInfo.label}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Data e Hora */}
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium text-lg">{formatDateTime(appointment.scheduledDate)}</span>
              </div>

              {/* Motivo */}
              {appointment.chiefComplaint && (
                <div className="text-sm">
                  <span className="font-medium">Motivo: </span>
                  <span className="text-muted-foreground">{appointment.chiefComplaint}</span>
                </div>
              )}

              {/* Status Alert */}
              {isPending && (
                <Alert className="bg-yellow-50 border-yellow-200">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  <AlertTitle className="text-yellow-800">Aguardando Aprovação</AlertTitle>
                  <AlertDescription className="text-yellow-700 text-sm">
                    {statusInfo.description}
                  </AlertDescription>
                </Alert>
              )}

              {isApproved && (
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-green-800">Agendamento Confirmado!</AlertTitle>
                  <AlertDescription className="text-green-700 text-sm">
                    {statusInfo.description}
                    {appointment.notes?.includes('APROVADO') && (
                      <div className="mt-2 text-xs">
                        {appointment.notes.split('\n\n').pop()}
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {isRejected && (
                <Alert className="bg-red-50 border-red-200">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <AlertTitle className="text-red-800">Agendamento Não Aprovado</AlertTitle>
                  <AlertDescription className="text-red-700 text-sm">
                    {statusInfo.description}
                    {appointment.notes?.includes('REJEITADO') && (
                      <div className="mt-2 text-xs">
                        {appointment.notes.split('\n\n').pop()}
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {!isPending && !isApproved && !isRejected && (
                <Alert>
                  <StatusIcon className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    {statusInfo.description}
                  </AlertDescription>
                </Alert>
              )}

              {/* Informações Adicionais */}
              <div className="text-xs text-muted-foreground pt-2 border-t">
                Solicitado em {formatDateTime(appointment.createdAt)}
              </div>
            </CardContent>
          </Card>
        )
      })}

      {/* Instruções Gerais */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="text-sm">
          <strong>Status dos agendamentos:</strong>
          <ul className="mt-2 space-y-1 ml-4 list-disc">
            <li><strong>Aguardando Confirmação:</strong> Seu agendamento está sendo analisado pela equipe</li>
            <li><strong>Confirmado:</strong> Compareça no dia e horário marcados</li>
            <li><strong>Não Aprovado:</strong> Entre em contato com a clínica para reagendar</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  )
}
