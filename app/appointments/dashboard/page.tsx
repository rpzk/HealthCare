'use client'

import React, { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
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
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ProfessionalCalendar } from '@/components/professional-calendar'
import type { SlotInfo } from 'react-big-calendar'

interface Consultation {
  id: string
  patientId?: string
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

interface CalendarApiEvent {
  id: string
  title: string
  start: string
  end: string
  status: string
  type: string
  notes?: string | null
  patient?: { id: string; name: string; phone?: string | null; email?: string | null; cpf?: string | null }
  doctor?: { id: string; name: string; email?: string | null; speciality?: string | null } | null
}

interface PatientOption {
  id: string
  name: string
  cpf?: string
}

interface ConsultationDetails {
  id: string
  scheduledDate: string
  status: string
  type: string
  notes?: string | null
  patient: { id: string; name: string; email?: string | null; phone?: string | null; cpf?: string | null }
  doctor?: { id: string; name: string; email?: string | null; speciality?: string | null } | null
}

const CONSULTATION_TYPE_LABELS: Record<string, string> = {
  INITIAL: 'Consulta inicial',
  FOLLOW_UP: 'Retorno',
  EMERGENCY: 'Emergência',
  ROUTINE: 'Rotina',
  SPECIALIST: 'Especialista',
}

function toDateTimeLocalValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// Todos os roles que são considerados profissionais de saúde
const PROFESSIONAL_ROLES = [
  'DOCTOR',
  'NURSE',
  'PHYSIOTHERAPIST',
  'PSYCHOLOGIST',
  'NUTRITIONIST',
  'DENTIST',
  'HEALTH_AGENT',
  'TECHNICIAN',
  'PHARMACIST',
  'SOCIAL_WORKER',
  'RECEPTIONIST',
  'ADMIN' // Admin também pode acessar
]

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
  const router = useRouter()
  const { data: session } = useSession()
  const [consultations, setConsultations] = useState<Consultation[]>([])
  const [calendarEvents, setCalendarEvents] = useState<CalendarApiEvent[]>([])
  const [calendarLoading, setCalendarLoading] = useState(false)
  const [calendarRange, setCalendarRange] = useState<{ start: Date; end: Date } | null>(null)
  const [patients, setPatients] = useState<PatientOption[]>([])
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
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date } | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<CalendarApiEvent | null>(null)
  const [selectedConsultation, setSelectedConsultation] = useState<ConsultationDetails | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [detailsError, setDetailsError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [createForm, setCreateForm] = useState({
    patientId: '',
    type: 'ROUTINE',
    notes: '',
  })
  const [editForm, setEditForm] = useState({
    scheduledDate: '',
    type: 'ROUTINE',
    notes: '',
  })
  const [statusDrawerOpen, setStatusDrawerOpen] = useState(false)
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string | null>(null)
  const [allConsultations, setAllConsultations] = useState<Consultation[]>([])

  const openConsultationWorkspace = useCallback(
    (consultationId: string, type?: string, opts?: { preferTele?: boolean }) => {
      const preferTele = opts?.preferTele ?? false
      if (preferTele && type === 'TELEMEDICINE') {
        router.push(`/consultations/${consultationId}`)
        return
      }
      router.push(`/consultations/${consultationId}`)
    },
    [router]
  )

  // Verificação melhorada de profissional de saúde
  const isProfessional = React.useMemo(() => {
    if (!session?.user?.role) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[Dashboard] Sem role na sessão')
      }
      return false
    }
    
    const userRole = session.user.role
    const isProf = PROFESSIONAL_ROLES.includes(userRole)

    if (process.env.NODE_ENV !== 'production') {
      console.log('[Dashboard] Role do usuário:', userRole, '| É profissional?', isProf)
      console.log('[Dashboard] Roles permitidos:', PROFESSIONAL_ROLES)
    }
    
    return isProf
  }, [session?.user?.role])

  const loadConsultations = useCallback(async () => {
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
  }, [activeStatus])

  useEffect(() => {
    if (isProfessional) {
      void loadConsultations()
    }
  }, [isProfessional, loadConsultations])

  useEffect(() => {
    // Carregar eventos iniciais do calendário (sem depender do onRangeChange disparar no mount)
    if (!isProfessional) return
    if (calendarRange) return

    const now = new Date()
    const initial = {
      start: startOfDay(startOfWeek(now, { locale: ptBR })),
      end: endOfDay(endOfWeek(now, { locale: ptBR })),
    }
    setCalendarRange(initial)
    loadCalendarEvents(initial)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isProfessional])

  useEffect(() => {
    // Carregar pacientes reais para agendamento rápido
    if (!isProfessional) return
    fetch('/api/patients')
      .then((r) => r.ok ? r.json() : Promise.reject(new Error('Erro ao carregar pacientes')))
      .then((data) => setPatients(((data?.patients || data?.data || []) as PatientOption[])))
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : 'Erro ao carregar pacientes')
        setPatients([])
      })
  }, [isProfessional])

  const loadCalendarEvents = async (range: { start: Date; end: Date }) => {
    try {
      setCalendarLoading(true)
      const params = new URLSearchParams({
        start: range.start.toISOString(),
        end: range.end.toISOString(),
      })
      const res = await fetch(`/api/calendar/events?${params.toString()}`)
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(typeof json?.error === 'string' ? json.error : 'Erro ao carregar calendário')
      setCalendarEvents((json?.events || []) as CalendarApiEvent[])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao carregar calendário')
    } finally {
      setCalendarLoading(false)
    }
  }

  useEffect(() => {
    if (!editOpen || !selectedEvent?.id) return

    // Se o payload do calendário já trouxe os detalhes necessários, evita chamada extra.
    if (selectedEvent.patient?.id) {
      const hasRichPatient =
        !!selectedEvent.patient.email || !!selectedEvent.patient.cpf || !!selectedEvent.patient.phone
      const hasRichDoctor = !!selectedEvent.doctor?.id
      const hasRichNotes = typeof selectedEvent.notes === 'string' || selectedEvent.notes === null

      if (hasRichPatient || hasRichDoctor || hasRichNotes) {
        setDetailsError(null)
        setDetailsLoading(false)
        setSelectedConsultation({
          id: selectedEvent.id,
          scheduledDate: selectedEvent.start,
          status: selectedEvent.status,
          type: selectedEvent.type,
          notes: selectedEvent.notes ?? null,
          patient: {
            id: selectedEvent.patient.id,
            name: selectedEvent.patient.name,
            email: selectedEvent.patient.email ?? null,
            phone: selectedEvent.patient.phone ?? null,
            cpf: selectedEvent.patient.cpf ?? null,
          },
          doctor: selectedEvent.doctor
            ? {
                id: selectedEvent.doctor.id,
                name: selectedEvent.doctor.name,
                email: selectedEvent.doctor.email ?? null,
                speciality: selectedEvent.doctor.speciality ?? null,
              }
            : null,
        })

        setEditForm((p) => ({
          scheduledDate: p.scheduledDate,
          type: p.type,
          notes: p.notes === '' && typeof selectedEvent.notes === 'string' ? selectedEvent.notes : p.notes,
        }))

        return
      }
    }

    const abortController = new AbortController()
    const loadDetails = async () => {
      try {
        setDetailsError(null)
        setDetailsLoading(true)
        setSelectedConsultation(null)

        const res = await fetch(`/api/appointments/${selectedEvent.id}`, { signal: abortController.signal })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error(typeof json?.error === 'string' ? json.error : 'Erro ao carregar detalhes do agendamento')
        }

        const consultation = json?.consultation as ConsultationDetails | undefined
        if (!consultation) throw new Error('Resposta inválida ao carregar detalhes')
        setSelectedConsultation(consultation)

        const initialScheduled = toDateTimeLocalValue(new Date(selectedEvent.start))
        setEditForm((p) => {
          const nextScheduled = toDateTimeLocalValue(new Date(consultation.scheduledDate))
          return {
            scheduledDate: p.scheduledDate === initialScheduled ? nextScheduled : p.scheduledDate,
            type: p.type === (selectedEvent.type || 'ROUTINE') ? (consultation.type || p.type) : p.type,
            notes: p.notes === '' ? (consultation.notes || '') : p.notes,
          }
        })
      } catch (e) {
        if ((e as any)?.name === 'AbortError') return
        setDetailsError(e instanceof Error ? e.message : 'Erro ao carregar detalhes')
      } finally {
        setDetailsLoading(false)
      }
    }

    loadDetails()
    return () => abortController.abort()
  }, [editOpen, selectedEvent])

  const loadAllConsultations = async () => {
    try {
      const response = await fetch(`/api/appointments/my-consultations?days=30`)
      if (response.ok) {
        const data = await response.json()
        setAllConsultations(data.consultations || [])
      }
    } catch (error) {
      console.error('Error loading all consultations:', error)
      toast.error('Erro ao carregar todas as consultas')
    }
  }

  const handleCreateFromSlot = async () => {
    if (!selectedSlot) return
    const doctorId = (session?.user as any)?.id as string | undefined
    if (!doctorId) {
      toast.error('Sessão inválida: não foi possível identificar o profissional')
      return
    }
    if (!createForm.patientId) {
      toast.error('Selecione um paciente')
      return
    }

    try {
      setSaving(true)
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: createForm.patientId,
          doctorId,
          scheduledDate: selectedSlot.start.toISOString(),
          type: createForm.type,
          duration: 30,
          notes: createForm.notes || undefined,
        }),
      })

      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(typeof json?.error === 'string' ? json.error : 'Erro ao criar agendamento')

      toast.success('Agendamento criado')
      setCreateOpen(false)
      setSelectedSlot(null)
      setCreateForm({ patientId: '', type: 'ROUTINE', notes: '' })
      await loadConsultations()
      await loadAllConsultations()
      if (calendarRange) {
        await loadCalendarEvents(calendarRange)
      } else {
        // Fallback: garantir refresh do calendário mesmo sem range setado
        const base = selectedSlot.start
        const fallbackRange = {
          start: startOfDay(startOfWeek(base, { locale: ptBR })),
          end: endOfDay(endOfWeek(base, { locale: ptBR })),
        }
        setCalendarRange(fallbackRange)
        await loadCalendarEvents(fallbackRange)
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao criar agendamento')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveEdit = async () => {
    if (!selectedEvent) return

    try {
      setSaving(true)
      const currentDurationMinutes = Math.max(
        5,
        Math.round((new Date(selectedEvent.end).getTime() - new Date(selectedEvent.start).getTime()) / 60000)
      )
      const res = await fetch(`/api/appointments/${selectedEvent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduledDate: new Date(editForm.scheduledDate).toISOString(),
          type: editForm.type,
          notes: editForm.notes || undefined,
          duration: currentDurationMinutes,
        }),
      })

      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(typeof json?.error === 'string' ? json.error : 'Erro ao salvar agendamento')

      toast.success('Agendamento atualizado')
      setEditOpen(false)
      setSelectedEvent(null)
      await loadConsultations()
      if (calendarRange) await loadCalendarEvents(calendarRange)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar agendamento')
    } finally {
      setSaving(false)
    }
  }

  const handleCancelFromCalendar = async () => {
    if (!selectedEvent) return
    if (!confirm('Cancelar esta consulta?')) return

    try {
      setSaving(true)
      const res = await fetch('/api/appointments/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consultationId: selectedEvent.id }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(typeof json?.error === 'string' ? json.error : 'Erro ao cancelar consulta')

      toast.success('Consulta cancelada')
      setEditOpen(false)
      setSelectedEvent(null)
      await loadConsultations()
      if (calendarRange) await loadCalendarEvents(calendarRange)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao cancelar consulta')
    } finally {
      setSaving(false)
    }
  }

  const handleRescheduleDrop = async (args: { event: any; start: Date; end: Date }) => {
    const event = args.event as { id: string; resource?: { status?: string } }
    if (!event?.id) return
    if (event.resource?.status === 'CANCELLED' || event.resource?.status === 'COMPLETED') return

    try {
      const durationMinutes = Math.max(5, Math.round((args.end.getTime() - args.start.getTime()) / 60000))
      const res = await fetch(`/api/appointments/${event.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledDate: args.start.toISOString(), duration: durationMinutes }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(typeof json?.error === 'string' ? json.error : 'Erro ao reagendar')
      toast.success('Reagendado')
      await loadConsultations()
      if (calendarRange) await loadCalendarEvents(calendarRange)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao reagendar')
      if (calendarRange) await loadCalendarEvents(calendarRange)
    }
  }

  const handleResizeEvent = async (args: { event: any; start: Date; end: Date }) => {
    const event = args.event as { id: string; resource?: { status?: string } }
    if (!event?.id) return
    if (event.resource?.status === 'CANCELLED' || event.resource?.status === 'COMPLETED') return

    try {
      const durationMinutes = Math.max(5, Math.round((args.end.getTime() - args.start.getTime()) / 60000))
      const res = await fetch(`/api/appointments/${event.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledDate: args.start.toISOString(), duration: durationMinutes }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(typeof json?.error === 'string' ? json.error : 'Erro ao alterar duração')
      toast.success('Duração atualizada')
      await loadConsultations()
      if (calendarRange) await loadCalendarEvents(calendarRange)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao alterar duração')
      if (calendarRange) await loadCalendarEvents(calendarRange)
    }
  }

  const handleStartConsultation = async (consultationId: string, type?: string) => {
    try {
      setProcessing(consultationId)

      const res = await fetch(`/api/appointments/${consultationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'IN_PROGRESS' }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(typeof json?.error === 'string' ? json.error : 'Erro ao iniciar consulta')
      }

      toast.success('Consulta iniciada')
      await loadConsultations()
      if (calendarRange) await loadCalendarEvents(calendarRange)

      router.push(`/consultations/${consultationId}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao iniciar consulta')
    } finally {
      setProcessing(null)
    }
  }

  const handleCancelConsultationFromList = async (consultationId: string) => {
    if (!confirm('Cancelar esta consulta?')) return

    try {
      setProcessing(consultationId)
      const res = await fetch('/api/appointments/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consultationId }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(typeof json?.error === 'string' ? json.error : 'Erro ao cancelar consulta')

      toast.success('Consulta cancelada')
      await loadConsultations()
      if (calendarRange) await loadCalendarEvents(calendarRange)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao cancelar consulta')
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

            {/* Statistics + Actions */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Resumo de Consultas</h2>
                <Button
                  onClick={() => {
                    const now = new Date()
                    setSelectedSlot({ start: now, end: new Date(now.getTime() + 30 * 60000) })
                    setCreateOpen(true)
                  }}
                  className="gap-2"
                >
                  <Clock className="h-4 w-4" />
                  Consulta Rápida
                </Button>
              </div>
              <div className="grid grid-cols-5 gap-4">
                <Card className="cursor-pointer hover:shadow-md transition">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Total</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.total}</div>
                  </CardContent>
                </Card>

                <Card
                  className="border-blue-200 bg-blue-50 cursor-pointer hover:shadow-md transition"
                  onClick={async () => {
                    await loadAllConsultations()
                    setSelectedStatusFilter('SCHEDULED')
                    setStatusDrawerOpen(true)
                  }}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Clock className="h-4 w-4" /> Agendadas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.scheduled}</div>
                  </CardContent>
                </Card>

                <Card
                  className="border-green-200 bg-green-50 cursor-pointer hover:shadow-md transition"
                  onClick={async () => {
                    await loadAllConsultations()
                    setSelectedStatusFilter('IN_PROGRESS')
                    setStatusDrawerOpen(true)
                  }}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" /> Em andamento
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.inProgress}</div>
                  </CardContent>
                </Card>

                <Card
                  className="border-gray-200 bg-gray-50 cursor-pointer hover:shadow-md transition"
                  onClick={async () => {
                    await loadAllConsultations()
                    setSelectedStatusFilter('COMPLETED')
                    setStatusDrawerOpen(true)
                  }}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Concluídas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.completed}</div>
                  </CardContent>
                </Card>

                <Card
                  className="border-red-200 bg-red-50 cursor-pointer hover:shadow-md transition"
                  onClick={async () => {
                    await loadAllConsultations()
                    setSelectedStatusFilter('CANCELLED')
                    setStatusDrawerOpen(true)
                  }}
                >
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
            </div>

            {/* Professional Calendar */}
            <ProfessionalCalendar
              events={calendarEvents.map((e) => ({
                id: e.id,
                title: e.title,
                start: new Date(e.start),
                end: new Date(e.end),
                resource: {
                  type: 'consultation' as const,
                  status: e.status,
                  patientName: e.patient?.name,
                },
              }))}
              onRangeChange={(range) => {
                let start: Date
                let end: Date
                if (Array.isArray(range)) {
                  start = range[0]
                  end = range[range.length - 1]
                } else {
                  start = range.start
                  end = range.end
                }
                const next = { start: startOfDay(start), end: endOfDay(end) }
                setCalendarRange(next)
                loadCalendarEvents(next)
              }}
              onSelectSlot={(slotInfo: SlotInfo) => {
                const start = slotInfo.start as Date
                const end = slotInfo.end as Date
                setSelectedSlot({ start, end })
                setCreateOpen(true)
              }}
              onSelectEvent={(event) => {
                const found = calendarEvents.find((e) => e.id === event.id)
                if (!found) return

                // Para consultas em andamento, abra direto o workspace (tele quando aplicável).
                if (found.status === 'IN_PROGRESS') {
                  openConsultationWorkspace(found.id, found.type, { preferTele: true })
                  return
                }

                // Para consultas concluídas/canceladas, faz sentido visualizar a consulta (não editar agendamento).
                if (found.status === 'COMPLETED' || found.status === 'CANCELLED') {
                  openConsultationWorkspace(found.id, found.type, { preferTele: false })
                  return
                }

                setSelectedEvent(found)
                setSelectedConsultation(null)
                setDetailsError(null)
                setEditForm({
                  scheduledDate: toDateTimeLocalValue(new Date(found.start)),
                  type: found.type || 'ROUTINE',
                  notes: '',
                })
                setEditOpen(true)
              }}
              onEventDrop={handleRescheduleDrop}
              onEventResize={handleResizeEvent}
            />

            {/* Dialog: Create */}
            <Dialog open={createOpen} onOpenChange={(open) => {
              setCreateOpen(open)
              if (!open) setSelectedSlot(null)
            }}>
              <DialogContent className="sm:max-w-[520px]">
                <DialogHeader>
                  <DialogTitle>Novo agendamento</DialogTitle>
                  <DialogDescription>
                    {selectedSlot
                      ? format(selectedSlot.start, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                      : 'Selecione um horário no calendário'}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Paciente</Label>
                    <Select value={createForm.patientId} onValueChange={(v) => setCreateForm((p) => ({ ...p, patientId: v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o paciente" />
                      </SelectTrigger>
                      <SelectContent>
                        {patients.length === 0 && (
                          <SelectItem value="__empty" disabled>
                            Nenhum paciente disponível
                          </SelectItem>
                        )}
                        {patients.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}{p.cpf ? ` • ${p.cpf}` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select value={createForm.type} onValueChange={(v) => setCreateForm((p) => ({ ...p, type: v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.keys(CONSULTATION_TYPE_LABELS).map((k) => (
                          <SelectItem key={k} value={k}>
                            {CONSULTATION_TYPE_LABELS[k]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Notas</Label>
                    <Textarea
                      value={createForm.notes}
                      onChange={(e) => setCreateForm((p) => ({ ...p, notes: e.target.value }))}
                      placeholder="Opcional"
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={saving}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreateFromSlot} disabled={saving || !selectedSlot}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Agendar'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Dialog: Edit/Cancel */}
            <Dialog open={editOpen} onOpenChange={(open) => {
              setEditOpen(open)
              if (!open) {
                setSelectedEvent(null)
                setSelectedConsultation(null)
                setDetailsError(null)
                setDetailsLoading(false)
              }
            }}>
              <DialogContent className="sm:max-w-[560px]">
                <DialogHeader>
                  <DialogTitle>Editar agendamento</DialogTitle>
                  <DialogDescription>
                    {selectedEvent ? `${selectedEvent.title}` : ''}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  {/* Detalhes do paciente/consulta */}
                  {selectedEvent && (
                    <div className="rounded-md border p-3 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="font-medium leading-tight">
                            {selectedConsultation?.patient?.name || selectedEvent.patient?.name || selectedEvent.title}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {selectedConsultation?.patient?.cpf
                              ? `CPF: ${selectedConsultation.patient.cpf}`
                              : null}
                          </div>
                        </div>

                        {selectedConsultation?.patient?.id && (
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/patients/${selectedConsultation.patient.id}`}>Abrir prontuário</Link>
                          </Button>
                        )}
                      </div>

                      {detailsLoading && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" /> Carregando detalhes...
                        </div>
                      )}

                      {detailsError && (
                        <div className="text-sm text-destructive">{detailsError}</div>
                      )}

                      {!detailsLoading && !detailsError && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          {(selectedConsultation?.patient?.email || null) && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Mail className="h-4 w-4" />
                              <span className="text-foreground">{selectedConsultation?.patient?.email}</span>
                            </div>
                          )}
                          {(selectedConsultation?.patient?.phone || selectedEvent.patient?.phone || null) && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Phone className="h-4 w-4" />
                              <span className="text-foreground">
                                {selectedConsultation?.patient?.phone || selectedEvent.patient?.phone}
                              </span>
                            </div>
                          )}
                          {selectedEvent.status && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <span>Status:</span>
                              <Badge variant="secondary">{selectedEvent.status}</Badge>
                            </div>
                          )}
                          {selectedConsultation?.doctor?.name && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <User className="h-4 w-4" />
                              <span className="text-foreground">{selectedConsultation.doctor.name}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Data e hora</Label>
                      <Input
                        type="datetime-local"
                        value={editForm.scheduledDate}
                        onChange={(e) => setEditForm((p) => ({ ...p, scheduledDate: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tipo</Label>
                      <Select value={editForm.type} onValueChange={(v) => setEditForm((p) => ({ ...p, type: v }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.keys(CONSULTATION_TYPE_LABELS).map((k) => (
                            <SelectItem key={k} value={k}>
                              {CONSULTATION_TYPE_LABELS[k]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Notas</Label>
                    <Textarea
                      value={editForm.notes}
                      onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))}
                      placeholder="Opcional"
                    />
                  </div>

                  {selectedEvent?.status && (
                    <div className="text-sm text-muted-foreground">
                      Status atual: <span className="font-medium">{selectedEvent.status}</span>
                    </div>
                  )}
                </div>

                <DialogFooter>
                  <Button
                    variant="destructive"
                    onClick={handleCancelFromCalendar}
                    disabled={saving || selectedEvent?.status === 'CANCELLED' || selectedEvent?.status === 'COMPLETED'}
                  >
                    Cancelar consulta
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>
                      Fechar
                    </Button>
                    <Button onClick={handleSaveEdit} disabled={saving || !editForm.scheduledDate}>
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
                    </Button>
                  </div>
                </DialogFooter>
              </DialogContent>
            </Dialog>

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
                                          className="bg-yellow-600 hover:bg-yellow-700 text-white"
                                          onClick={() => handleStartConsultation(consultation.id, consultation.type)}
                                          disabled={processing === consultation.id}
                                        >
                                          {processing === consultation.id ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                          ) : (
                                            consultation.type === 'TELEMEDICINE' ? 'Chamar paciente' : 'Iniciar consulta'
                                          )}
                                        </Button>

                                        {consultation.patientId && (
                                          <Button asChild size="sm" variant="outline">
                                            <Link href={`/patients/${consultation.patientId}`}>Abrir prontuário</Link>
                                          </Button>
                                        )}

                                        <Button
                                          size="sm"
                                          variant="destructive"
                                          onClick={() => handleCancelConsultationFromList(consultation.id)}
                                          disabled={processing === consultation.id}
                                        >
                                          Cancelar
                                        </Button>
                                      </div>
                                    )}

                                    {status === 'IN_PROGRESS' && (
                                      <div className="flex flex-col gap-2 ml-4">
                                        <Button
                                          size="sm"
                                          onClick={() => openConsultationWorkspace(consultation.id, consultation.type, { preferTele: true })}
                                          disabled={processing === consultation.id}
                                        >
                                          {consultation.type === 'TELEMEDICINE' ? 'Abrir teleconsulta' : 'Abrir consulta'}
                                        </Button>

                                        {consultation.patientId && (
                                          <Button asChild size="sm" variant="outline">
                                            <Link href={`/patients/${consultation.patientId}`}>Abrir prontuário</Link>
                                          </Button>
                                        )}
                                      </div>
                                    )}

                                    {status === 'COMPLETED' && (
                                      <div className="flex flex-col gap-2 ml-4">
                                        <Button
                                          size="sm"
                                          onClick={() => openConsultationWorkspace(consultation.id, consultation.type, { preferTele: false })}
                                        >
                                          Abrir consulta
                                        </Button>

                                        {consultation.patientId && (
                                          <Button asChild size="sm" variant="outline">
                                            <Link href={`/patients/${consultation.patientId}`}>Abrir prontuário</Link>
                                          </Button>
                                        )}
                                      </div>
                                    )}

                                    {status === 'CANCELLED' && (
                                      <div className="flex flex-col gap-2 ml-4">
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => openConsultationWorkspace(consultation.id, consultation.type, { preferTele: false })}
                                        >
                                          Ver detalhes
                                        </Button>

                                        {consultation.patientId && (
                                          <Button asChild size="sm" variant="outline">
                                            <Link href={`/patients/${consultation.patientId}`}>Abrir prontuário</Link>
                                          </Button>
                                        )}
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

        {/* Status Filter Drawer */}
        <Drawer open={statusDrawerOpen} onOpenChange={setStatusDrawerOpen}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>
                {selectedStatusFilter && STATUS_CONFIG[selectedStatusFilter]?.label}
              </DrawerTitle>
            </DrawerHeader>
            <div className="max-h-96 overflow-y-auto px-4 pb-4">
              {allConsultations.filter((c) => c.status === selectedStatusFilter).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma consulta neste status</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {allConsultations
                    .filter((c) => c.status === selectedStatusFilter)
                    .map((consultation) => (
                      <Card
                        key={consultation.id}
                        className="cursor-pointer hover:shadow-md transition"
                        onClick={() => {
                          // If the user is viewing the "Em andamento" drawer (or the item is in progress), always open the live consultation instead of the edit modal.
                          const isInProgressDrawer = selectedStatusFilter === 'IN_PROGRESS'
                          const isInProgressItem = consultation.status === 'IN_PROGRESS'
                          const isCancelledItem = consultation.status === 'CANCELLED'
                          const isCompletedItem = consultation.status === 'COMPLETED'

                          if (isInProgressDrawer || isInProgressItem) {
                            openConsultationWorkspace(consultation.id, consultation.type, { preferTele: true })
                            setStatusDrawerOpen(false)
                            return
                          }

                          // Itens cancelados/concluídos devem abrir a consulta (read-only) ao invés do modal de edição.
                          if (isCancelledItem || isCompletedItem) {
                            openConsultationWorkspace(consultation.id, consultation.type, { preferTele: false })
                            setStatusDrawerOpen(false)
                            return
                          }

                          setSelectedConsultation({
                            id: consultation.id,
                            scheduledDate: consultation.scheduledDate,
                            status: consultation.status,
                            type: consultation.type,
                            notes: consultation.notes || undefined,
                            patient: {
                              id: consultation.patientId || '',
                              name: consultation.patientName,
                              email: consultation.patientEmail,
                              phone: consultation.patientPhone,
                            },
                          })
                          setEditForm({
                            scheduledDate: toDateTimeLocalValue(new Date(consultation.scheduledDate)),
                            type: consultation.type,
                            notes: consultation.notes || '',
                          })
                          setEditOpen(true)
                          setStatusDrawerOpen(false)
                        }}
                      >
                        <CardContent className="pt-4">
                          <div className="space-y-2">
                            <h4 className="font-semibold">{consultation.patientName}</h4>
                            <div className="text-sm text-muted-foreground">
                              {format(
                                new Date(consultation.scheduledDate),
                                "dd 'de' MMMM 'às' HH:mm",
                                { locale: ptBR }
                              )}
                            </div>
                            <div className="text-sm">{consultation.reason || '—'}</div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              )}
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    </div>
  )
}
