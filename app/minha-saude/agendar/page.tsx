'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Calendar,
  Clock,
  ChevronRight,
  ChevronLeft,
  Check,
  User,
  Stethoscope,
  Heart,
  AlertCircle,
  Loader2
} from 'lucide-react'
import Link from 'next/link'
import { format, addDays, startOfWeek, isSameDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Professional {
  id: string
  name: string
  role: string
  speciality: string | null
}

interface ServiceType {
  id: string
  name: string
  icon: string
  description: string
  roles: string[] // Quais roles podem atender
}

interface TimeSlot {
  time: string
  available: boolean
}

type Step = 'service' | 'professional' | 'date' | 'time' | 'confirm'

// Tipos de atendimento padrão - podem ser customizados via API/Admin
const DEFAULT_SERVICES: ServiceType[] = [
  { 
    id: 'consulta-medica', 
    name: 'Consulta Médica', 
    icon: '👨‍⚕️', 
    description: 'Atendimento com médico',
    roles: ['DOCTOR']
  },
  { 
    id: 'consulta-enfermagem', 
    name: 'Consulta de Enfermagem', 
    icon: '👩‍⚕️', 
    description: 'Atendimento com enfermeiro(a)',
    roles: ['NURSE']
  },
]

export default function AgendarConsultaPage() {
  const { data: session } = useSession()
  const router = useRouter()
  
  const [step, setStep] = useState<Step>('service')
  const [loading, setLoading] = useState(false)
  const [loadingServices, setLoadingServices] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  
  // Tipos de serviço disponíveis (carregados da config ou padrão)
  const [services, setServices] = useState<ServiceType[]>(DEFAULT_SERVICES)
  
  // Seleções do usuário
  const [selectedService, setSelectedService] = useState<ServiceType | null>(null)
  const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  
  // Dados carregados
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([])
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [patientId, setPatientId] = useState<string | null>(null)
  const [patientError, setPatientError] = useState<string | null>(null)

  // Carregar dados do paciente logado
  useEffect(() => {
    const loadPatientData = async () => {
      try {
        const response = await fetch('/api/patients/me')
        const data = await response.json()
        console.log('Dados do paciente:', data)
        
        if (response.ok && data.id) {
          setPatientId(data.id)
        } else {
          setPatientError(data.error || 'Cadastro de paciente não encontrado')
        }
      } catch (err) {
        console.error('Erro ao carregar dados do paciente:', err)
        setPatientError('Erro ao carregar dados do paciente')
      }
    }
    loadPatientData()
  }, [])

  // Carregar tipos de serviço customizados (se existirem)
  useEffect(() => {
    const loadServices = async () => {
      try {
        const response = await fetch('/api/settings/appointment-types')
        if (response.ok) {
          const data = await response.json()
          if (data.services && data.services.length > 0) {
            setServices(data.services)
          }
        }
      } catch (err) {
        // Usar serviços padrão se não conseguir carregar
        console.log('Usando tipos de atendimento padrão')
      } finally {
        setLoadingServices(false)
      }
    }
    loadServices()
  }, [])

  // Carregar profissionais quando selecionar tipo de serviço
  useEffect(() => {
    if (selectedService) {
      loadProfessionals(selectedService)
    }
  }, [selectedService])

  // Carregar horários quando selecionar data
  useEffect(() => {
    if (selectedProfessional && selectedDate) {
      loadTimeSlots(selectedProfessional.id, selectedDate)
    }
  }, [selectedProfessional, selectedDate])

  const loadProfessionals = async (service: ServiceType) => {
    try {
      setLoading(true)
      setProfessionals([])
      
      // Buscar profissionais pelos roles permitidos para esse serviço
      const roleParam = service.roles.join(',')
      const response = await fetch(`/api/users?roles=${roleParam}&limit=50`)
      
      if (response.ok) {
        const data = await response.json()
        setProfessionals(data.users || [])
      }
    } catch (err) {
      console.error('Erro ao carregar profissionais:', err)
      setError('Erro ao carregar profissionais disponíveis')
    } finally {
      setLoading(false)
    }
  }

  const loadTimeSlots = async (professionalId: string, date: Date) => {
    try {
      setLoading(true)
      
      // Tentar buscar da API de agenda
      const dateStr = format(date, 'yyyy-MM-dd')
      const response = await fetch(`/api/schedules/available?professionalId=${professionalId}&date=${dateStr}`)
      
      if (response.ok) {
        const data = await response.json()
        if (data.slots && data.slots.length > 0) {
          setAvailableSlots(data.slots)
          return
        }
      }
      
      // Fallback: horários padrão se não houver agenda configurada
      const defaultSlots: TimeSlot[] = [
        { time: '08:00', available: true },
        { time: '08:30', available: true },
        { time: '09:00', available: true },
        { time: '09:30', available: true },
        { time: '10:00', available: true },
        { time: '10:30', available: true },
        { time: '11:00', available: true },
        { time: '11:30', available: true },
        { time: '14:00', available: true },
        { time: '14:30', available: true },
        { time: '15:00', available: true },
        { time: '15:30', available: true },
        { time: '16:00', available: true },
        { time: '16:30', available: true },
        { time: '17:00', available: true },
      ]
      setAvailableSlots(defaultSlots)
    } catch (err) {
      console.error('Erro ao carregar horários:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!selectedProfessional || !selectedDate || !selectedTime) {
      setError('Por favor, complete todas as etapas')
      return
    }
    
    if (!patientId) {
      setError('Erro: Não foi possível identificar seu cadastro de paciente. Por favor, faça logout e login novamente.')
      return
    }
    
    try {
      setSubmitting(true)
      setError(null)
      
      const [hours, minutes] = selectedTime.split(':')
      const appointmentDate = new Date(selectedDate)
      appointmentDate.setHours(parseInt(hours), parseInt(minutes), 0, 0)
      
      const payload = {
        patientId: patientId,
        doctorId: selectedProfessional.id,
        scheduledDate: appointmentDate.toISOString(),
        type: 'INITIAL',
        description: reason || '',
      }
      
      console.log('Enviando agendamento:', payload)
      
      const response = await fetch('/api/consultations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      
      const data = await response.json()
      console.log('Resposta:', data)
      
      if (!response.ok) {
        const errorMsg = data.details 
          ? `${data.error}: ${JSON.stringify(data.details)}`
          : data.error || 'Erro ao agendar consulta'
        throw new Error(errorMsg)
      }
      
      setSuccess(true)
    } catch (err: any) {
      console.error('Erro no agendamento:', err)
      setError(err.message || 'Erro ao agendar consulta')
    } finally {
      setSubmitting(false)
    }
  }

  const goBack = () => {
    switch (step) {
      case 'professional': setStep('service'); break
      case 'date': setStep('professional'); break
      case 'time': setStep('date'); break
      case 'confirm': setStep('time'); break
    }
  }

  const goNext = () => {
    switch (step) {
      case 'service': setStep('professional'); break
      case 'professional': setStep('date'); break
      case 'date': setStep('time'); break
      case 'time': setStep('confirm'); break
    }
  }

  const canProceed = () => {
    switch (step) {
      case 'service': return !!selectedService
      case 'professional': return !!selectedProfessional
      case 'date': return !!selectedDate
      case 'time': return !!selectedTime
      default: return true
    }
  }

  const getStepNumber = () => {
    const steps: Step[] = ['service', 'professional', 'date', 'time', 'confirm']
    return steps.indexOf(step) + 1
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'DOCTOR': return 'Médico(a)'
      case 'NURSE': return 'Enfermeiro(a)'
      case 'TECHNICIAN': return 'Técnico(a)'
      case 'RECEPTIONIST': return 'Recepcionista'
      default: return 'Profissional'
    }
  }

  // Tela de sucesso
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white dark:from-gray-900 dark:to-gray-950 p-4 flex items-center justify-center">
        <Card className="max-w-md w-full text-center p-8">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-green-800 mb-2">Agendamento Realizado!</h1>
          <p className="text-gray-600 mb-6">
            Seu atendimento foi agendado com sucesso.
          </p>
          <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
            <div className="flex items-center gap-3 mb-3">
              <Stethoscope className="h-5 w-5 text-gray-400" />
              <span className="font-medium">{selectedService?.name}</span>
            </div>
            <div className="flex items-center gap-3 mb-3">
              <User className="h-5 w-5 text-gray-400" />
              <span>{selectedProfessional?.name}</span>
            </div>
            <div className="flex items-center gap-3 mb-3">
              <Calendar className="h-5 w-5 text-gray-400" />
              <span>{selectedDate && format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}</span>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-gray-400" />
              <span>{selectedTime}</span>
            </div>
          </div>
          <div className="space-y-3">
            <Link href="/minha-saude">
              <Button className="w-full">Voltar ao Início</Button>
            </Link>
            <Link href="/minha-saude/consultas">
              <Button variant="outline" className="w-full">Ver Meus Agendamentos</Button>
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-950">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4 pb-6">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <Link href="/minha-saude">
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                <ChevronLeft className="h-6 w-6" />
              </Button>
            </Link>
            <h1 className="text-xl font-bold">Agendar Atendimento</h1>
          </div>
          
          {/* Progress Steps */}
          <div className="flex items-center justify-between">
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  n < getStepNumber() ? 'bg-green-500 text-white' :
                  n === getStepNumber() ? 'bg-white text-blue-600' :
                  'bg-blue-500/50 text-blue-200'
                }`}>
                  {n < getStepNumber() ? <Check className="h-4 w-4" /> : n}
                </div>
                {n < 5 && (
                  <div className={`w-6 sm:w-10 h-1 ${
                    n < getStepNumber() ? 'bg-green-500' : 'bg-blue-500/50'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-[10px] sm:text-xs mt-2 text-blue-200">
            <span>Tipo</span>
            <span>Profissional</span>
            <span>Data</span>
            <span>Horário</span>
            <span>Confirmar</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 max-w-lg mx-auto -mt-2">
        <Card className="rounded-2xl shadow-lg">
          <CardContent className="p-4">
            {/* Step 1: Tipo de Atendimento */}
            {step === 'service' && (
              <div>
                <h2 className="text-lg font-semibold mb-1">Qual tipo de atendimento?</h2>
                <p className="text-sm text-muted-foreground mb-4">Selecione o serviço desejado</p>
                
                {loadingServices ? (
                  <div className="space-y-3">
                    <Skeleton className="h-24 w-full rounded-xl" />
                    <Skeleton className="h-24 w-full rounded-xl" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {services.map((service) => (
                      <button
                        key={service.id}
                        onClick={() => setSelectedService(service)}
                        className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-center gap-4 ${
                          selectedService?.id === service.id
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <span className="text-3xl">{service.icon}</span>
                        <div className="flex-1">
                          <p className="font-medium">{service.name}</p>
                          <p className="text-sm text-muted-foreground">{service.description}</p>
                        </div>
                        {selectedService?.id === service.id && (
                          <Check className="h-5 w-5 text-blue-600" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Profissional */}
            {step === 'professional' && (
              <div>
                <h2 className="text-lg font-semibold mb-1">Escolha o profissional</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Profissionais disponíveis para {selectedService?.name}
                </p>
                
                {loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-20 w-full rounded-xl" />
                    ))}
                  </div>
                ) : professionals.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Stethoscope className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>Nenhum profissional disponível</p>
                    <p className="text-sm mt-2">Entre em contato com a unidade de saúde</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {professionals.map((prof) => (
                      <button
                        key={prof.id}
                        onClick={() => setSelectedProfessional(prof)}
                        className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-center gap-4 ${
                          selectedProfessional?.id === prof.id
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className="bg-blue-100 text-blue-700">
                            {prof.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium">{prof.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {prof.speciality || getRoleLabel(prof.role)}
                          </p>
                        </div>
                        {selectedProfessional?.id === prof.id && (
                          <Check className="h-5 w-5 text-blue-600" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Data */}
            {step === 'date' && (
              <div>
                <h2 className="text-lg font-semibold mb-1">Escolha a data</h2>
                <p className="text-sm text-muted-foreground mb-4">Selecione o dia do atendimento</p>
                
                {/* Navegação da semana */}
                <div className="flex items-center justify-between mb-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setWeekStart(addDays(weekStart, -7))}
                    disabled={weekStart <= new Date()}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <span className="font-medium">
                    {format(weekStart, "MMMM yyyy", { locale: ptBR })}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setWeekStart(addDays(weekStart, 7))}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>
                
                {/* Grid de dias */}
                <div className="grid grid-cols-7 gap-2">
                  {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((day) => (
                    <div key={day} className="text-center text-xs text-muted-foreground py-2">
                      {day}
                    </div>
                  ))}
                  {Array.from({ length: 7 }).map((_, i) => {
                    const date = addDays(weekStart, i)
                    const isPast = date < new Date(new Date().setHours(0, 0, 0, 0))
                    const isWeekend = i >= 5
                    const isSelected = selectedDate && isSameDay(date, selectedDate)
                    
                    return (
                      <button
                        key={i}
                        onClick={() => !isPast && !isWeekend && setSelectedDate(date)}
                        disabled={isPast || isWeekend}
                        className={`aspect-square rounded-xl flex flex-col items-center justify-center transition-all ${
                          isSelected
                            ? 'bg-blue-600 text-white'
                            : isPast || isWeekend
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-gray-50 hover:bg-blue-50 hover:text-blue-600'
                        }`}
                      >
                        <span className="text-lg font-semibold">{format(date, 'd')}</span>
                      </button>
                    )
                  })}
                </div>
                
                {selectedDate && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-xl text-center">
                    <p className="text-blue-800 font-medium">
                      {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Horário */}
            {step === 'time' && (
              <div>
                <h2 className="text-lg font-semibold mb-1">Escolha o horário</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Horários para {selectedDate && format(selectedDate, "d 'de' MMMM", { locale: ptBR })}
                </p>
                
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  </div>
                ) : (
                  <>
                    <p className="text-sm font-medium text-gray-600 mb-2">Manhã</p>
                    <div className="grid grid-cols-4 gap-2 mb-4">
                      {availableSlots
                        .filter(s => parseInt(s.time.split(':')[0]) < 12)
                        .map((slot) => (
                          <button
                            key={slot.time}
                            onClick={() => slot.available && setSelectedTime(slot.time)}
                            disabled={!slot.available}
                            className={`py-3 rounded-xl text-sm font-medium transition-all ${
                              selectedTime === slot.time
                                ? 'bg-blue-600 text-white'
                                : slot.available
                                ? 'bg-gray-100 hover:bg-blue-50 hover:text-blue-600'
                                : 'bg-gray-50 text-gray-300 cursor-not-allowed line-through'
                            }`}
                          >
                            {slot.time}
                          </button>
                        ))}
                    </div>
                    
                    <p className="text-sm font-medium text-gray-600 mb-2">Tarde</p>
                    <div className="grid grid-cols-4 gap-2">
                      {availableSlots
                        .filter(s => parseInt(s.time.split(':')[0]) >= 12)
                        .map((slot) => (
                          <button
                            key={slot.time}
                            onClick={() => slot.available && setSelectedTime(slot.time)}
                            disabled={!slot.available}
                            className={`py-3 rounded-xl text-sm font-medium transition-all ${
                              selectedTime === slot.time
                                ? 'bg-blue-600 text-white'
                                : slot.available
                                ? 'bg-gray-100 hover:bg-blue-50 hover:text-blue-600'
                                : 'bg-gray-50 text-gray-300 cursor-not-allowed line-through'
                            }`}
                          >
                            {slot.time}
                          </button>
                        ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Step 5: Confirmação */}
            {step === 'confirm' && (
              <div>
                <h2 className="text-lg font-semibold mb-1">Confirme seu agendamento</h2>
                <p className="text-sm text-muted-foreground mb-4">Verifique os dados antes de confirmar</p>
                
                <div className="bg-gray-50 rounded-xl p-4 space-y-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Stethoscope className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Tipo de Atendimento</p>
                      <p className="font-medium">{selectedService?.name}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <User className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Profissional</p>
                      <p className="font-medium">{selectedProfessional?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedProfessional?.speciality || getRoleLabel(selectedProfessional?.role || '')}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Calendar className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Data e Horário</p>
                      <p className="font-medium">
                        {selectedDate && format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
                      </p>
                      <p className="text-sm text-muted-foreground">às {selectedTime}</p>
                    </div>
                  </div>
                </div>
                
                {/* Motivo opcional */}
                <div className="mb-4">
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Motivo do atendimento (opcional)
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Descreva brevemente o motivo..."
                    className="w-full p-3 border rounded-xl text-sm resize-none h-20 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                {patientError && (
                  <div className="p-3 bg-yellow-50 text-yellow-700 rounded-xl flex items-center gap-2 mb-4">
                    <AlertCircle className="h-5 w-5" />
                    <span className="text-sm">{patientError}</span>
                  </div>
                )}
                
                {error && (
                  <div className="p-3 bg-red-50 text-red-700 rounded-xl flex items-center gap-2 mb-4">
                    <AlertCircle className="h-5 w-5" />
                    <span className="text-sm">{error}</span>
                  </div>
                )}
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex gap-3 mt-6">
              {step !== 'service' && (
                <Button
                  variant="outline"
                  onClick={goBack}
                  className="flex-1"
                >
                  Voltar
                </Button>
              )}
              
              {step !== 'confirm' ? (
                <Button
                  onClick={goNext}
                  disabled={!canProceed()}
                  className="flex-1"
                >
                  Continuar
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={submitting || !patientId}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Agendando...
                    </>
                  ) : (
                    'Confirmar Agendamento'
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
