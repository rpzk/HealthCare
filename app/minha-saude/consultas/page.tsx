'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  MapPin,
  Video,
  CheckCircle2,
  XCircle,
  
  Plus,
  Pill
} from 'lucide-react'
import Link from 'next/link'
import { format, parseISO, isToday, isTomorrow, isPast } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Consultation {
  id: string
  scheduledDate: string
  status: string
  type: string
  notes: string | null
  chiefComplaint?: string | null
  doctor?: {
    id: string
    name: string
    speciality?: string
  }
  location?: string
}

export default function MinhasConsultasPage() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)
  const [consultations, setConsultations] = useState<Consultation[]>([])
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null)
  const [filter, setFilter] = useState<'upcoming' | 'past' | 'all'>('upcoming')

  useEffect(() => {
    loadConsultations()
  }, [session?.user?.id])

  const loadConsultations = async () => {
    try {
      setLoading(true)
      
      const patientResponse = await fetch('/api/patients/me')
      if (!patientResponse.ok) {
        setLoading(false)
        return
      }
      
      const patient = await patientResponse.json()
      if (patient?.id) {
        const response = await fetch(`/api/consultations?patientId=${patient.id}`)
        if (response.ok) {
          const data = await response.json()
          setConsultations(data.consultations || [])
        }
      }
    } catch (err) {
      console.error('Erro:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredConsultations = consultations.filter(c => {
    const consultDate = new Date(c.scheduledDate)
    const now = new Date()
    
    if (filter === 'upcoming') {
      return consultDate >= now && c.status === 'SCHEDULED'
    }
    if (filter === 'past') {
      return consultDate < now || c.status !== 'SCHEDULED'
    }
    return true
  }).sort((a, b) => {
    const dateA = new Date(a.scheduledDate)
    const dateB = new Date(b.scheduledDate)
    return filter === 'upcoming' 
      ? dateA.getTime() - dateB.getTime()
      : dateB.getTime() - dateA.getTime()
  })

  const formatConsultationDate = (dateStr: string) => {
    const date = parseISO(dateStr)
    if (isToday(date)) return 'Hoje'
    if (isTomorrow(date)) return 'Amanhã'
    return format(date, "EEEE, d 'de' MMMM", { locale: ptBR })
  }

  const getStatusBadge = (status: string, date: string) => {
    const isPastDate = isPast(parseISO(date))
    
    if (status === 'SCHEDULED' && !isPastDate) {
      return (
        <Badge className="bg-blue-100 text-blue-700">
          <Clock className="h-3 w-3 mr-1" />
          Agendada
        </Badge>
      )
    }
    if (status === 'COMPLETED' || (status === 'SCHEDULED' && isPastDate)) {
      return (
        <Badge className="bg-green-100 text-green-700">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Realizada
        </Badge>
      )
    }
    if (status === 'CANCELLED') {
      return (
        <Badge className="bg-red-100 text-red-700">
          <XCircle className="h-3 w-3 mr-1" />
          Cancelada
        </Badge>
      )
    }
    return <Badge variant="secondary">{status}</Badge>
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'FIRST_VISIT': return 'Primeira Consulta'
      case 'FOLLOW_UP': return 'Retorno'
      case 'EMERGENCY': return 'Urgência'
      case 'TELEMEDICINE': return 'Teleconsulta'
      default: return 'Consulta'
    }
  }

  // Detalhes da consulta
  if (selectedConsultation) {
    const isPastConsultation = isPast(parseISO(selectedConsultation.scheduledDate))
    
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white dark:from-gray-900 dark:to-gray-950">
        <div className="bg-purple-600 text-white p-4">
          <div className="max-w-lg mx-auto">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-white hover:bg-white/20"
                onClick={() => setSelectedConsultation(null)}
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <h1 className="text-xl font-bold">Detalhes da Consulta</h1>
            </div>
          </div>
        </div>

        <div className="p-4 max-w-lg mx-auto">
          {/* Data e Status */}
          <Card className="rounded-2xl shadow-lg mb-4">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                {getStatusBadge(selectedConsultation.status, selectedConsultation.scheduledDate)}
                <Badge variant="outline">{getTypeLabel(selectedConsultation.type)}</Badge>
              </div>
              
              {/* Data Grande */}
              <div className="text-center py-6 bg-purple-50 rounded-xl mb-4">
                <p className="text-4xl font-bold text-purple-600">
                  {format(parseISO(selectedConsultation.scheduledDate), 'd')}
                </p>
                <p className="text-purple-600 font-medium">
                  {format(parseISO(selectedConsultation.scheduledDate), "MMMM 'de' yyyy", { locale: ptBR })}
                </p>
                <p className="text-2xl font-semibold text-purple-700 mt-2">
                  {format(parseISO(selectedConsultation.scheduledDate), 'HH:mm')}
                </p>
                <p className="text-sm text-purple-500 mt-1">
                  {formatConsultationDate(selectedConsultation.scheduledDate)}
                </p>
              </div>
              
              {/* Médico */}
              {selectedConsultation.doctor && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl mb-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <User className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Profissional</p>
                    <p className="font-medium">{selectedConsultation.doctor.name}</p>
                    {selectedConsultation.doctor.speciality && (
                      <p className="text-sm text-muted-foreground">
                        {selectedConsultation.doctor.speciality}
                      </p>
                    )}
                  </div>
                </div>
              )}
              
              {/* Local */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="p-2 bg-blue-100 rounded-lg">
                  {selectedConsultation.type === 'TELEMEDICINE' ? (
                    <Video className="h-5 w-5 text-blue-600" />
                  ) : (
                    <MapPin className="h-5 w-5 text-blue-600" />
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Local</p>
                  <p className="font-medium">
                    {selectedConsultation.type === 'TELEMEDICINE' 
                      ? 'Teleconsulta (Online)'
                      : selectedConsultation.location || 'Clínica Principal'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notas */}
          {selectedConsultation.notes && (
            <Card className="rounded-xl mb-4">
              <CardContent className="p-4">
                <h3 className="font-medium mb-2">Observações</h3>
                <p className="text-sm text-muted-foreground">{selectedConsultation.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Ações */}
          {!isPastConsultation && selectedConsultation.status === 'SCHEDULED' && (
            <div className="space-y-3">
              {selectedConsultation.type === 'TELEMEDICINE' && (
                <Button className="w-full bg-green-600 hover:bg-green-700">
                  <Video className="h-4 w-4 mr-2" />
                  Entrar na Teleconsulta
                </Button>
              )}
              
              <Button variant="outline" className="w-full text-red-600 border-red-200 hover:bg-red-50">
                <XCircle className="h-4 w-4 mr-2" />
                Cancelar Consulta
              </Button>
            </div>
          )}

          {/* Aviso para consultas passadas */}
          {isPastConsultation && (
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-sm text-muted-foreground text-center">
                Esta consulta já foi realizada. Verifique suas receitas e exames 
                para acompanhar as orientações do médico.
              </p>
              <div className="flex gap-3 mt-4">
                <Link href="/minha-saude/receitas" className="flex-1">
                  <Button variant="outline" className="w-full">
                    <Pill className="h-4 w-4 mr-2" />
                    Ver Receitas
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white dark:from-gray-900 dark:to-gray-950 pb-24">
      {/* Header */}
      <div className="bg-purple-600 text-white p-4 pb-6">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Link href="/minha-saude">
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                  <ChevronLeft className="h-6 w-6" />
                </Button>
              </Link>
              <h1 className="text-xl font-bold">Minhas Consultas</h1>
            </div>
            <Link href="/minha-saude/agendar">
              <Button size="sm" className="bg-white text-purple-600 hover:bg-purple-50">
                <Plus className="h-4 w-4 mr-1" />
                Agendar
              </Button>
            </Link>
          </div>
          
          {/* Resumo */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/10 backdrop-blur rounded-xl p-3 text-center">
              <p className="text-2xl font-bold">
                {consultations.filter(c => 
                  c.status === 'SCHEDULED' && new Date(c.scheduledDate) >= new Date()
                ).length}
              </p>
              <p className="text-xs text-purple-200">Próximas</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-3 text-center">
              <p className="text-2xl font-bold">{consultations.length}</p>
              <p className="text-xs text-purple-200">Total</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 max-w-lg mx-auto -mt-2">
        {/* Filtros */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          <Button
            variant={filter === 'upcoming' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('upcoming')}
            className="rounded-full whitespace-nowrap"
          >
            <Clock className="h-4 w-4 mr-1" />
            Próximas
          </Button>
          <Button
            variant={filter === 'past' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('past')}
            className="rounded-full whitespace-nowrap"
          >
            Anteriores
          </Button>
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
            className="rounded-full whitespace-nowrap"
          >
            Todas
          </Button>
        </div>

        {/* Lista */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28 w-full rounded-xl" />
            ))}
          </div>
        ) : filteredConsultations.length === 0 ? (
          <Card className="rounded-2xl">
            <CardContent className="p-8 text-center">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-muted-foreground mb-4">
                {filter === 'upcoming' 
                  ? 'Você não tem consultas agendadas.'
                  : 'Nenhuma consulta encontrada.'}
              </p>
              {filter === 'upcoming' && (
                <Link href="/minha-saude/agendar">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Agendar Consulta
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredConsultations.map((consultation) => (
              <Card 
                key={consultation.id} 
                className="rounded-xl cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedConsultation(consultation)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Data */}
                    <div className="flex-shrink-0 w-14 h-14 bg-purple-100 rounded-xl flex flex-col items-center justify-center">
                      <span className="text-lg font-bold text-purple-600">
                        {format(parseISO(consultation.scheduledDate), 'd')}
                      </span>
                      <span className="text-xs text-purple-500">
                        {format(parseISO(consultation.scheduledDate), 'MMM', { locale: ptBR })}
                      </span>
                    </div>
                    
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-1">
                        <p className="font-medium truncate">
                          {consultation.doctor?.name || 'Profissional'}
                        </p>
                        {getStatusBadge(consultation.status, consultation.scheduledDate)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {consultation.doctor?.speciality || getTypeLabel(consultation.type)}
                      </p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{format(parseISO(consultation.scheduledDate), 'HH:mm')}</span>
                        <span>•</span>
                        <span>{formatConsultationDate(consultation.scheduledDate)}</span>
                      </div>
                    </div>
                    
                    <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t shadow-lg px-2 py-2 md:hidden">
        <div className="flex justify-around items-center max-w-lg mx-auto">
          <Link href="/minha-saude" className="flex flex-col items-center py-1.5 px-3 text-gray-500">
            <Calendar className="h-5 w-5" />
            <span className="text-[10px] mt-0.5">Início</span>
          </Link>
          <Link href="/minha-saude/receitas" className="flex flex-col items-center py-1.5 px-3 text-gray-500">
            <Pill className="h-5 w-5" />
            <span className="text-[10px] mt-0.5">Receitas</span>
          </Link>
          <Link href="/minha-saude/consultas" className="flex flex-col items-center py-1.5 px-3 text-purple-600">
            <Calendar className="h-5 w-5" />
            <span className="text-[10px] mt-0.5 font-medium">Consultas</span>
          </Link>
        </div>
      </nav>
    </div>
  )
}
