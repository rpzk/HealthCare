'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Stethoscope, Calendar, User, Clock, ArrowLeft, Phone, MapPin } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface TodayConsultation {
  id: string
  patient: {
    id: string
    name: string
    phone: string
  }
  doctor_name: string
  specialty: string
  consultation_date: string
  type: string
  reason: string
  status: string
}

export default function TodayConsultationsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [consultations, setConsultations] = useState<TodayConsultation[]>([])

  useEffect(() => {
    fetchTodayConsultations()
  }, [])

  const fetchTodayConsultations = async () => {
    try {
      const response = await fetch('/api/consultations/today')
      if (response.ok) {
        const data = await response.json()
        // Ordenar por horário
        const sorted = data.sort((a: TodayConsultation, b: TodayConsultation) => 
          new Date(a.consultation_date).getTime() - new Date(b.consultation_date).getTime()
        )
        setConsultations(sorted)
      }
    } catch (error) {
      console.error('Erro ao buscar consultas de hoje:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatFullDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })
  }

  const getStatusColor = (status: string) => {
    const colors = {
      'SCHEDULED': 'bg-blue-500/20 text-blue-600 dark:text-blue-400',
      'COMPLETED': 'bg-green-500/20 text-green-600 dark:text-green-400',
      'CANCELLED': 'bg-red-500/20 text-red-600 dark:text-red-400',
      'IN_PROGRESS': 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400'
    }
    return colors[status as keyof typeof colors] || 'bg-muted text-muted-foreground'
  }

  const getStatusLabel = (status: string) => {
    const labels = {
      'SCHEDULED': 'Agendada',
      'COMPLETED': 'Concluída',
      'CANCELLED': 'Cancelada',
      'IN_PROGRESS': 'Em Andamento'
    }
    return labels[status as keyof typeof labels] || status
  }

  const getTypeLabel = (type: string) => {
    const labels = {
      'ROUTINE': 'Rotina',
      'EMERGENCY': 'Emergência',
      'FOLLOW_UP': 'Retorno',
      'FIRST_TIME': 'Primeira Consulta'
    }
    return labels[type as keyof typeof labels] || type
  }

  const updateConsultationStatus = async (consultationId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/consultations/${consultationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      if (response.ok) {
        // Atualizar o estado local
        setConsultations(prev => 
          prev.map(consultation => 
            consultation.id === consultationId 
              ? { ...consultation, status: newStatus }
              : consultation
          )
        )
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error)
    }
  }

  const today = new Date()
  const todayString = formatFullDate(today.toISOString())

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button 
          variant="outline" 
          onClick={() => router.back()}
          className="flex items-center space-x-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Voltar</span>
        </Button>
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Calendar className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Consultas de Hoje</h1>
            <p className="text-sm text-muted-foreground">{todayString}</p>
          </div>
        </div>
      </div>

      {/* Estatísticas do dia */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{consultations.length}</p>
              </div>
              <Calendar className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Agendadas</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {consultations.filter(c => c.status === 'SCHEDULED').length}
                </p>
              </div>
              <div className="h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Em Andamento</p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {consultations.filter(c => c.status === 'IN_PROGRESS').length}
                </p>
              </div>
              <div className="h-8 w-8 rounded-full bg-yellow-500/20 flex items-center justify-center">
                <div className="h-4 w-4 rounded-full bg-yellow-600 dark:bg-yellow-400"></div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Concluídas</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {consultations.filter(c => c.status === 'COMPLETED').length}
                </p>
              </div>
              <div className="h-8 w-8 rounded-full bg-green-500/20 flex items-center justify-center">
                <div className="h-4 w-4 rounded-full bg-green-600 dark:bg-green-400"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Timeline das consultas */}
      <Card>
        <CardHeader>
          <CardTitle>Agenda do Dia</CardTitle>
          <CardDescription>
            Consultas programadas para hoje - {new Date().toLocaleDateString('pt-BR')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {consultations.map((consultation) => (
              <div
                key={consultation.id}
                className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-primary/10 rounded-lg">
                        <Clock className="h-5 w-5 text-primary" />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-xl font-bold text-foreground">
                            {formatTime(consultation.consultation_date)}
                          </h3>
                          <Badge className={getStatusColor(consultation.status)}>
                            {getStatusLabel(consultation.status)}
                          </Badge>
                          <Badge variant="outline">
                            {getTypeLabel(consultation.type)}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="font-semibold text-foreground flex items-center">
                              <User className="h-4 w-4 mr-2" />
                              {consultation.patient.name}
                            </p>
                            <p className="text-sm text-muted-foreground flex items-center mt-1">
                              <Phone className="h-4 w-4 mr-2" />
                              {consultation.patient.phone}
                            </p>
                          </div>
                          
                          <div>
                            <p className="font-semibold text-foreground flex items-center">
                              <Stethoscope className="h-4 w-4 mr-2" />
                              Dr(a). {consultation.doctor_name}
                            </p>
                            <p className="text-sm text-muted-foreground flex items-center mt-1">
                              <MapPin className="h-4 w-4 mr-2" />
                              {consultation.specialty}
                            </p>
                          </div>
                        </div>
                        
                        <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                          <p className="text-sm"><strong>Motivo:</strong> {consultation.reason}</p>
                        </div>
                      </div>
                    </div>

                    {/* Ações rápidas */}
                    <div className="flex space-x-2 ml-16">
                      {consultation.status === 'SCHEDULED' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => updateConsultationStatus(consultation.id, 'IN_PROGRESS')}
                            className="bg-yellow-600 hover:bg-yellow-700 text-white"
                          >
                            Iniciar Consulta
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateConsultationStatus(consultation.id, 'CANCELLED')}
                            className="text-destructive border-destructive hover:bg-destructive/10"
                          >
                            Cancelar
                          </Button>
                        </>
                      )}
                      
                      {consultation.status === 'IN_PROGRESS' && (
                        <Button
                          size="sm"
                          onClick={() => updateConsultationStatus(consultation.id, 'COMPLETED')}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          Finalizar Consulta
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="outline"
                      >
                        Ver Prontuário
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {consultations.length === 0 && (
              <div className="text-center py-12">
                <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-xl text-muted-foreground mb-2">Nenhuma consulta agendada para hoje</p>
                <p className="text-sm text-muted-foreground mb-4">Que tal aproveitar para colocar a agenda em dia?</p>
                <Button 
                  onClick={() => router.push('/consultations/new')}
                  className="flex items-center space-x-2"
                >
                  <Calendar className="h-4 w-4" />
                  <span>Agendar Nova Consulta</span>
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dicas rápidas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Ações Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              variant="outline" 
              className="h-auto p-4"
              onClick={() => router.push('/consultations/new')}
            >
              <div className="text-center">
                <Calendar className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="font-medium">Agendar Consulta</p>
                <p className="text-xs text-muted-foreground">Criar novo agendamento</p>
              </div>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-auto p-4"
              onClick={() => router.push('/patients')}
            >
              <div className="text-center">
                <User className="h-8 w-8 mx-auto mb-2 text-blue-600 dark:text-blue-400" />
                <p className="font-medium">Ver Pacientes</p>
                <p className="text-xs text-muted-foreground">Lista completa</p>
              </div>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-auto p-4"
              onClick={() => router.push('/consultations/history')}
            >
              <div className="text-center">
                <Stethoscope className="h-8 w-8 mx-auto mb-2 text-green-600 dark:text-green-400" />
                <p className="font-medium">Histórico</p>
                <p className="text-xs text-muted-foreground">Consultas anteriores</p>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
