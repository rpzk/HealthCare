'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { CalendarIcon, Clock, User, UserCircle2, Plus, X } from 'lucide-react'
import { format, addMinutes, isSameDay, startOfWeek, addDays, setHours, setMinutes } from 'date-fns'
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
  speciality: string
}

interface Patient {
  id: string
  name: string
  cpf: string
}

export default function SchedulePage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedDoctor, setSelectedDoctor] = useState<string>('')
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<string>('')
  const [formData, setFormData] = useState({
    patientId: '',
    type: 'CONSULTATION',
    notes: ''
  })
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  // Fetch doctors
  useEffect(() => {
    fetch('/api/admin/staff')
      .then(res => res.json())
      .then(data => {
        setDoctors(data.staff || [])
        if (data.staff?.length > 0) {
          setSelectedDoctor(data.staff[0].id)
        }
      })
      .catch(err => console.error('Error fetching doctors:', err))
  }, [])

  // Fetch patients
  useEffect(() => {
    fetch('/api/patients')
      .then(res => res.json())
      .then(data => setPatients(data.data || []))
      .catch(err => console.error('Error fetching patients:', err))
  }, [])

  // Generate time slots and fetch appointments
  useEffect(() => {
    if (!selectedDoctor || !selectedDate) return

    const fetchAppointments = async () => {
      const dateStr = format(selectedDate, 'yyyy-MM-dd')
      const res = await fetch(`/api/appointments?date=${dateStr}&doctorId=${selectedDoctor}`)
      const data = await res.json()
      
      const appointments = data.data || []
      const slots = generateTimeSlots(selectedDate, appointments)
      setTimeSlots(slots)
    }

    fetchAppointments()
  }, [selectedDoctor, selectedDate])

  const generateTimeSlots = (date: Date, appointments: any[]): TimeSlot[] => {
    const slots: TimeSlot[] = []
    const startHour = 8
    const endHour = 18
    const slotDuration = 30 // minutes

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
          status: appointment.status
        } : undefined
      })

      currentTime = addMinutes(currentTime, slotDuration)
    }

    return slots
  }

  const handleSlotClick = (slot: TimeSlot) => {
    if (slot.available) {
      setSelectedSlot(slot.time)
      setIsDialogOpen(true)
    }
  }

  const handleCreateAppointment = async () => {
    if (!formData.patientId || !selectedSlot) {
      toast({
        title: 'Erro',
        description: 'Selecione um paciente',
        variant: 'destructive'
      })
      return
    }

    setLoading(true)
    
    const [hours, minutes] = selectedSlot.split(':')
    const scheduledDate = new Date(selectedDate)
    scheduledDate.setHours(parseInt(hours), parseInt(minutes), 0, 0)

    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: formData.patientId,
          doctorId: selectedDoctor,
          scheduledDate: scheduledDate.toISOString(),
          type: formData.type,
          notes: formData.notes
        })
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Erro ao criar agendamento')
      }

      toast({
        title: 'Sucesso',
        description: 'Agendamento criado com sucesso'
      })

      // Refresh slots
      const appointments = await fetch(`/api/appointments?date=${format(selectedDate, 'yyyy-MM-dd')}&doctorId=${selectedDoctor}`).then(r => r.json())
      setTimeSlots(generateTimeSlots(selectedDate, appointments.data || []))
      
      setIsDialogOpen(false)
      setFormData({ patientId: '', type: 'CONSULTATION', notes: '' })
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive'
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
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Agendamento de Consultas</h1>
          <p className="text-muted-foreground">Gerencie horários e agendamentos</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <Card>
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
              className="rounded-md border"
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
                      {doctor.name} - {doctor.speciality}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Time Slots */}
        <Card className="lg:col-span-2">
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
                <p>Selecione um profissional para ver os horários disponíveis</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Legend */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-100 border-2 border-green-200"></div>
              <span>Disponível</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-blue-100 border-2 border-blue-200"></div>
              <span>Agendado</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-100 border-2 border-green-200"></div>
              <span>Confirmado</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-yellow-100 border-2 border-yellow-200"></div>
              <span>Em Atendimento</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-red-100 border-2 border-red-200"></div>
              <span>Cancelado</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Appointment Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Agendamento</DialogTitle>
            <DialogDescription>
              {format(selectedDate, "dd/MM/yyyy")} às {selectedSlot}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Paciente</Label>
              <Select value={formData.patientId} onValueChange={(value) => setFormData({ ...formData, patientId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o paciente" />
                </SelectTrigger>
                <SelectContent>
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
            <Button onClick={handleCreateAppointment} disabled={loading}>
              {loading ? 'Criando...' : 'Confirmar Agendamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
