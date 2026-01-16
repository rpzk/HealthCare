'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Calendar } from '@/components/ui/calendar'
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { toastApiError } from '@/lib/toast-api-error'
import { format, addDays, isBefore, startOfToday, startOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Professional {
  id: string
  name: string
  role: string
  doctorSchedules: Array<{
    dayOfWeek: number
    startTime: string
    endTime: string
    slotDuration?: number
    maxBookingDaysAhead: number
    minBookingHoursAhead: number
    autoConfirmBooking: boolean
  }>
}

interface TimeSlot {
  time: string
  available: boolean
}

const ROLE_LABELS: Record<string, string> = {
  DOCTOR: 'Médico(a)',
  NURSE: 'Enfermeiro(a)',
  PHYSIOTHERAPIST: 'Fisioterapeuta',
  PSYCHOLOGIST: 'Psicólogo(a)',
  NUTRITIONIST: 'Nutricionista',
  DENTIST: 'Dentista',
}

export default function PatientBookingPage() {
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<string>('')
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [bookingComplete, setBookingComplete] = useState(false)
  const [bookedConsultation, setBookedConsultation] = useState<any>(null)

  // Fetch available professionals
  useEffect(() => {
    const fetchProfessionals = async () => {
      try {
        const response = await fetch('/api/appointments/patient-book')
        if (response.ok) {
          const data = await response.json()
          setProfessionals(data.professionals)
          if (data.professionals.length === 0) {
            toast.info('Nenhum profissional disponível para auto-agendamento no momento.')
          }
        } else {
          toast.error('Erro ao carregar profissionais')
        }
      } catch (error) {
        console.error('Error fetching professionals:', error)
        toast.error('Erro ao buscar profissionais disponíveis')
      } finally {
        setLoading(false)
      }
    }

    fetchProfessionals()
  }, [])

  // Generate time slots when date is selected
  useEffect(() => {
    if (!selectedDate || !selectedProfessional) {
      setTimeSlots([])
      return
    }

    const dayOfWeek = selectedDate.getDay()
    const schedule = selectedProfessional.doctorSchedules.find(
      (s) => s.dayOfWeek === dayOfWeek
    )

    if (!schedule) {
      setTimeSlots([])
      toast.info('Profissional não trabalha neste dia.')
      return
    }

    const slots: TimeSlot[] = []
    const [startHour, startMin] = schedule.startTime.split(':').map(Number)
    const [endHour, endMin] = schedule.endTime.split(':').map(Number)

    let currentHour = startHour
    let currentMin = startMin

    const endTotalMin = endHour * 60 + endMin
    const now = new Date()

    while (currentHour * 60 + currentMin < endTotalMin) {
      const timeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`
      
      // Check if slot meets minimum advance booking requirement
      const slotDateTime = new Date(selectedDate)
      slotDateTime.setHours(currentHour, currentMin, 0, 0)
      const hoursAhead = (slotDateTime.getTime() - now.getTime()) / (1000 * 60 * 60)
      
      const isAvailable = hoursAhead >= schedule.minBookingHoursAhead

      slots.push({
        time: timeStr,
        available: isAvailable,
      })

      currentMin += schedule.slotDuration || 30
      if (currentMin >= 60) {
        currentMin -= 60
        currentHour += 1
      }
    }

    setTimeSlots(slots)
  }, [selectedDate, selectedProfessional])

  const handleBooking = async () => {
    if (!selectedProfessional || !selectedDate || !selectedTime) {
      toast.error('Selecione profissional, data e horário')
      return
    }

    if (!reason.trim()) {
      toast.error('Informe o motivo da consulta')
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch('/api/appointments/patient-book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctorId: selectedProfessional.id,
          date: format(selectedDate, 'yyyy-MM-dd'),
          timeSlot: selectedTime,
          reason,
          notes,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        toastApiError(data, 'Erro ao agendar')
        return
      }

      setBookedConsultation(data.consultation)
      setBookingComplete(true)
      toast.success(data.message)

      // Reset form
      setTimeout(() => {
        setSelectedProfessional(null)
        setSelectedDate(null)
        setSelectedTime('')
        setReason('')
        setNotes('')
        setBookingComplete(false)
      }, 5000)
    } catch (error) {
      console.error('Booking error:', error)
      toast.error('Erro ao processar agendamento')
    } finally {
      setSubmitting(false)
    }
  }

  const isDateValid = (date: Date) => {
    const today = startOfToday()
    const maxDate = selectedProfessional
      ? addDays(
          today,
          Math.min(
            ...selectedProfessional.doctorSchedules.map((s) => s.maxBookingDaysAhead)
          )
        )
      : addDays(today, 30)

    return !isBefore(date, today) && !isBefore(maxDate, date)
  }

  if (loading) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 p-8 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Agendar Consulta</h1>
              <p className="text-muted-foreground mt-2">
                Escolha um profissional, data e horário para sua consulta
              </p>
            </div>

            {professionals.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No momento, nenhum profissional está disponível para auto-agendamento.
                  Contacte a clínica para agendar sua consulta.
                </AlertDescription>
              </Alert>
            ) : bookingComplete && bookedConsultation ? (
              <Card className="border-green-200 bg-green-50">
                <CardContent className="pt-6">
                  <div className="text-center space-y-4">
                    <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto" />
                    <h3 className="text-lg font-semibold">Consulta Agendada com Sucesso!</h3>
                    <div className="space-y-2 text-sm">
                      <p>
                        <strong>Profissional:</strong> {bookedConsultation.doctorName}
                      </p>
                      <p>
                        <strong>Data e Hora:</strong>{' '}
                        {format(
                          new Date(bookedConsultation.scheduledDate),
                          "dd 'de' MMMM 'às' HH:mm",
                          { locale: ptBR }
                        )}
                      </p>
                      <p>
                        <strong>Status:</strong> {bookedConsultation.status === 'CONFIRMED' ? '✅ Confirmada' : '⏳ Pendente de confirmação'}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Você receberá uma confirmação por email
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Professional Selection */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Profissional
                    </CardTitle>
                    <CardDescription>Escolha o profissional</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {professionals.map((prof) => (
                        <button
                          key={prof.id}
                          onClick={() => {
                            setSelectedProfessional(prof)
                            setSelectedDate(null)
                            setSelectedTime('')
                          }}
                          className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                            selectedProfessional?.id === prof.id
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          <div className="font-medium text-sm">{prof.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {ROLE_LABELS[prof.role] || prof.role}
                          </div>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Date and Time Selection */}
                {selectedProfessional && (
                  <>
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <CalendarIcon className="h-5 w-5" />
                          Data
                        </CardTitle>
                        <CardDescription>Escolha a data</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Calendar
                          mode="single"
                          selected={selectedDate || undefined}
                          onSelect={(date) => setSelectedDate(date || null)}
                          disabled={(date) => !isDateValid(date)}
                          locale={ptBR}
                          className="rounded-md border"
                          required={false}
                        />
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Clock className="h-5 w-5" />
                          Horário
                        </CardTitle>
                        <CardDescription>Escolha um horário</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {timeSlots.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            Selecione uma data
                          </p>
                        ) : (
                          <div className="grid grid-cols-2 gap-2">
                            {timeSlots.map((slot) => (
                              <button
                                key={slot.time}
                                onClick={() => slot.available && setSelectedTime(slot.time)}
                                disabled={!slot.available}
                                className={`p-2 rounded text-sm font-medium transition-all ${
                                  selectedTime === slot.time
                                    ? 'bg-primary text-primary-foreground'
                                    : slot.available
                                    ? 'bg-muted hover:bg-muted/80'
                                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                }`}
                              >
                                {slot.time}
                              </button>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>
            )}

            {/* Consultation Details */}
            {selectedProfessional && !bookingComplete && (
              <Card>
                <CardHeader>
                  <CardTitle>Detalhes da Consulta</CardTitle>
                  <CardDescription>
                    Informe o motivo e qualquer observação relevante
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reason">Motivo da Consulta *</Label>
                    <Textarea
                      id="reason"
                      placeholder="Ex: Consulta de rotina, dor de cabeça, seguimento..."
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="min-h-20"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Observações</Label>
                    <Textarea
                      id="notes"
                      placeholder="Informações adicionais que o profissional deve saber..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="min-h-20"
                    />
                  </div>

                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {selectedProfessional.doctorSchedules[0]?.autoConfirmBooking
                        ? '✅ Sua consulta será confirmada automaticamente'
                        : '⏳ Sua consulta será confirmada pelo profissional'}
                    </AlertDescription>
                  </Alert>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedProfessional(null)
                        setSelectedDate(null)
                        setSelectedTime('')
                      }}
                      disabled={submitting}
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleBooking}
                      disabled={submitting || !selectedDate || !selectedTime}
                      className="flex-1"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Agendando...
                        </>
                      ) : (
                        'Confirmar Agendamento'
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
