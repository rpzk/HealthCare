'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { CalendarIcon, Clock } from 'lucide-react'
import { format, addMinutes, setHours, setMinutes } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface TimeSlot {
  time: string
  available: boolean
  appointment?: {
    id: string
    patientName: string
    type: string
    status: string
  }
}

interface Doctor {
  id: string
  name: string
  speciality?: string
}

interface Patient {
  id: string
  name: string
  cpf: string
}

export default function SchedulePageClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectDoctorId = searchParams?.get('doctorId')
  const preselectPatientId = searchParams?.get('patientId')
  const waitingListId = searchParams?.get('waitingListId')

  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedDoctor, setSelectedDoctor] = useState<string>('')
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [patientsLoaded, setPatientsLoaded] = useState(false)
  const [patientsLoading, setPatientsLoading] = useState(false)
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<string>('')
  const [dialogMode, setDialogMode] = useState<'SCHEDULE' | 'START_NOW'>('SCHEDULE')
  const [formData, setFormData] = useState({
    patientId: '',
    type: 'CONSULTATION',
    notes: '',
  })
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const loadDoctors = async () => {
      try {
        const res = await fetch('/api/professionals/doctors')
        const data = await res.json().catch(() => ({}))
        const list: Doctor[] = Array.isArray(data?.doctors) ? data.doctors : []

        setDoctors(list)

        if (list.length > 0) {
          const preferred = preselectDoctorId && list.some((d) => d.id === preselectDoctorId)
            ? preselectDoctorId
            : list[0].id
          setSelectedDoctor(preferred)
        } else {
          setSelectedDoctor('')
          setTimeSlots([])
        }
      } catch (err) {
        console.error('Error fetching doctors:', err)
        setDoctors([])
        setSelectedDoctor('')
        setTimeSlots([])
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar profissionais',
          variant: 'destructive',
        })
      }
    }

    loadDoctors()
  }, [preselectDoctorId, toast])

  useEffect(() => {
    if (preselectPatientId) {
      setFormData(prev => ({ ...prev, patientId: preselectPatientId }))
    }
  }, [preselectPatientId])

  useEffect(() => {
    if (!isDialogOpen) return
    if (patientsLoaded || patientsLoading) return

    const controller = new AbortController()

    const loadPatients = async () => {
      try {
        setPatientsLoading(true)
        const res = await fetch('/api/patients', { signal: controller.signal })
        if (res.status === 429) {
          toast({
            title: 'Erro',
            description: 'Muitas requisições. Aguarde alguns segundos e tente novamente.',
            variant: 'destructive',
          })
          return
        }

        const data = await res.json().catch(() => ({}))
        setPatients(data.patients || data.data || [])
        setPatientsLoaded(true)
      } catch (err) {
        if (controller.signal.aborted) return
        console.error('Error fetching patients:', err)
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar pacientes',
          variant: 'destructive',
        })
      } finally {
        if (!controller.signal.aborted) setPatientsLoading(false)
      }
    }

    loadPatients()
    return () => controller.abort()
  }, [isDialogOpen, patientsLoaded, patientsLoading, toast])

  useEffect(() => {
    if (!selectedDoctor || !selectedDate) return

    const controller = new AbortController()

    const fetchAppointments = async () => {
      try {
        const dateStr = format(selectedDate, 'yyyy-MM-dd')
        const res = await fetch(`/api/appointments?date=${dateStr}&doctorId=${selectedDoctor}`, {
          signal: controller.signal,
        })
        if (res.status === 429) {
          toast({
            title: 'Erro',
            description: 'Muitas requisições. Aguarde alguns segundos e tente novamente.',
            variant: 'destructive',
          })
          return
        }
        const data = await res.json().catch(() => ({}))

        const appointments = data.data || []
        const slots = generateTimeSlots(selectedDate, appointments)
        setTimeSlots(slots)
      } catch (err) {
        if (controller.signal.aborted) return
        console.error('Error fetching appointments:', err)
      }
    }

    fetchAppointments()
    return () => controller.abort()
  }, [selectedDoctor, selectedDate, toast])

  const generateTimeSlots = (date: Date, appointments: any[]): TimeSlot[] => {
    const slots: TimeSlot[] = []
    const startHour = 8
    const endHour = 18
    const slotDuration = 30

    let currentTime = setMinutes(setHours(date, startHour), 0)
    const endTime = setMinutes(setHours(date, endHour), 0)

    while (currentTime < endTime) {
      const timeStr = format(currentTime, 'HH:mm')
      const appointment = appointments.find(apt => {
        const aptTime = new Date(apt.scheduledDate)
        return format(aptTime, 'HH:mm') === timeStr
      })

      slots.push({
        time: timeStr,
        available: !appointment,
        appointment: appointment ? {
          id: appointment.id,
          patientName: appointment.patient?.name || 'Paciente',
          type: appointment.type,
          status: appointment.status,
        } : undefined,
      })

      currentTime = addMinutes(currentTime, slotDuration)
    }

    return slots
  }

  const handleSlotClick = (slot: TimeSlot) => {
    if (slot.available) {
      setDialogMode('SCHEDULE')
      setSelectedSlot(slot.time)
      setIsDialogOpen(true)
    }
  }

  const handleOpenStartNow = () => {
    setDialogMode('START_NOW')
    setSelectedSlot('')
    setIsDialogOpen(true)
  }

  const handleCreateAppointment = async () => {
    if (!formData.patientId) {
      toast({
        title: 'Erro',
        description: 'Selecione um paciente',
        variant: 'destructive',
      })
      return
    }

    if (!selectedDoctor) {
      toast({
        title: 'Erro',
        description: 'Selecione um profissional',
        variant: 'destructive',
      })
      return
    }

    if (dialogMode === 'SCHEDULE' && !selectedSlot) {
      toast({
        title: 'Erro',
        description: 'Selecione um horário',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)

    let scheduledDate: Date
    if (dialogMode === 'START_NOW') {
      scheduledDate = new Date()
    } else {
      const [hours, minutes] = selectedSlot.split(':')
      scheduledDate = new Date(selectedDate)
      scheduledDate.setHours(parseInt(hours), parseInt(minutes), 0, 0)
    }

    try {
      const createUrl = dialogMode === 'START_NOW' ? '/api/consultations' : '/api/appointments'
      const payload = dialogMode === 'START_NOW'
        ? {
            patientId: formData.patientId,
            doctorId: selectedDoctor,
            scheduledDate: scheduledDate.toISOString(),
            type: formData.type,
            notes: formData.notes,
            status: 'IN_PROGRESS',
          }
        : {
            patientId: formData.patientId,
            doctorId: selectedDoctor,
            scheduledDate: scheduledDate.toISOString(),
            type: formData.type,
            notes: formData.notes,
          }

      const res = await fetch(createUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(typeof json?.error === 'string' ? json.error : 'Erro ao criar agendamento')
      }

      const createdId: string | undefined =
        (dialogMode === 'START_NOW' ? json?.consultation?.id : json?.id) || undefined

      if (waitingListId && createdId) {
        try {
          await fetch(`/api/waiting-list/${waitingListId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'mark_scheduled', appointmentId: createdId }),
          })
        } catch {
          // best-effort
        }
      }

      toast({
        title: 'Sucesso',
        description: dialogMode === 'START_NOW' ? 'Consulta iniciada' : 'Agendamento criado com sucesso',
      })

      if (dialogMode === 'START_NOW' && createdId) {
        setIsDialogOpen(false)
        router.push(`/consultations/${createdId}`)
        return
      }

      const appointments = await fetch(
        `/api/appointments?date=${format(selectedDate, 'yyyy-MM-dd')}&doctorId=${selectedDoctor}`
      ).then(r => r.json())
      setTimeSlots(generateTimeSlots(selectedDate, appointments.data || []))

      setIsDialogOpen(false)
      setFormData({ patientId: '', type: 'CONSULTATION', notes: '' })
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SCHEDULED': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'CONFIRMED': return 'bg-green-100 text-green-800 border-green-200'
      case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'COMPLETED': return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'CANCELLED': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 overflow-y-auto p-8">
          <div className="mx-auto max-w-6xl space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold">Agendamento de Consultas</h1>
                <p className="text-muted-foreground">Gerencie horários e agendamentos</p>
              </div>

              <Button onClick={handleOpenStartNow} disabled={!selectedDoctor}>
                Iniciar consulta agora
              </Button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
              <Card className="xl:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5" />
                    Selecione a Data
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    locale={ptBR}
                    className="rounded-md border w-full"
                    classNames={{
                      head_cell: 'text-muted-foreground rounded-md w-10 font-normal text-[0.8rem] text-center',
                      cell: 'h-10 w-10 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20',
                      day: 'h-10 w-10 p-0 font-normal aria-selected:opacity-100',
                    }}
                  />

                  <div className="mt-4 space-y-2">
                    <Label>Profissional</Label>
                    <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o profissional" />
                      </SelectTrigger>
                      <SelectContent>
                        {doctors.map(doctor => (
                          <SelectItem key={doctor.id} value={doctor.id}>
                            {doctor.name}{doctor.speciality ? ` - ${doctor.speciality}` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card className="xl:col-span-3">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Horários Disponíveis
                  </CardTitle>
                  <CardDescription>
                    {format(selectedDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {timeSlots.map(slot => (
                      <button
                        key={slot.time}
                        onClick={() => handleSlotClick(slot)}
                        disabled={!slot.available}
                        className={`p-3 rounded-lg border-2 transition-all text-sm font-medium ${
                          slot.available
                            ? 'bg-green-50 border-green-200 hover:bg-green-100 text-green-800 cursor-pointer'
                            : slot.appointment
                            ? `${getStatusColor(slot.appointment.status)} cursor-not-allowed`
                            : 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        <div className="flex flex-col items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>{slot.time}</span>
                          {slot.appointment && (
                            <span className="text-xs truncate w-full text-center">
                              {slot.appointment.patientName}
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>

                  {timeSlots.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>{doctors.length === 0 ? 'Nenhum profissional disponível' : 'Selecione um profissional para ver os horários disponíveis'}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-green-100 border-2 border-green-200" />
                    <span>Disponível</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-blue-100 border-2 border-blue-200" />
                    <span>Agendado</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-green-100 border-2 border-green-200" />
                    <span>Confirmado</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-yellow-100 border-2 border-yellow-200" />
                    <span>Em Atendimento</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-red-100 border-2 border-red-200" />
                    <span>Cancelado</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{dialogMode === 'START_NOW' ? 'Iniciar Consulta' : 'Novo Agendamento'}</DialogTitle>
                  <DialogDescription>
                    {dialogMode === 'START_NOW'
                      ? 'Iniciar imediatamente'
                      : `${format(selectedDate, 'dd/MM/yyyy')} às ${selectedSlot}`}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Paciente</Label>
                    <Select value={formData.patientId} onValueChange={(value) => setFormData({ ...formData, patientId: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder={patientsLoading ? 'Carregando pacientes...' : 'Selecione o paciente'} />
                      </SelectTrigger>
                      <SelectContent>
                        {patientsLoading && (
                          <SelectItem value="__loading" disabled>
                            Carregando...
                          </SelectItem>
                        )}
                        {!patientsLoading && patients.length === 0 && (
                          <SelectItem value="__empty" disabled>
                            Nenhum paciente disponível
                          </SelectItem>
                        )}
                        {patients.map(patient => (
                          <SelectItem key={patient.id} value={patient.id}>
                            {patient.name} - {patient.cpf}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Tipo de Atendimento</Label>
                    <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CONSULTATION">Consulta</SelectItem>
                        <SelectItem value="RETURN">Retorno</SelectItem>
                        <SelectItem value="EXAM">Exame</SelectItem>
                        <SelectItem value="PROCEDURE">Procedimento</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Observações</Label>
                    <Textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Observações sobre o agendamento..."
                      rows={3}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={loading}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreateAppointment} disabled={loading || patientsLoading}>
                    {loading
                      ? (dialogMode === 'START_NOW' ? 'Iniciando...' : 'Criando...')
                      : (dialogMode === 'START_NOW' ? 'Iniciar agora' : 'Confirmar Agendamento')}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </main>
      </div>
    </div>
  )
}
