"use client"

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Calendar, dateFnsLocalizer, Views, View } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Clock,
  User,
  Stethoscope,
  Video,
  MapPin,
  RefreshCw,
  ExternalLink
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

// Configuração do localizador para português brasileiro
const locales = { 'pt-BR': ptBR }
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
  getDay,
  locales,
})

// Tipos
interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'
  type: 'IN_PERSON' | 'TELEMEDICINE' | 'HOME_VISIT'
  patient: {
    id: string
    name: string
    phone?: string
  }
  doctor?: {
    id: string
    name: string
  }
  allDay?: boolean
}

// Cores por status
const statusColors: Record<string, { bg: string; border: string; text: string }> = {
  SCHEDULED: { bg: 'bg-blue-100', border: 'border-blue-400', text: 'text-blue-800' },
  IN_PROGRESS: { bg: 'bg-yellow-100', border: 'border-yellow-400', text: 'text-yellow-800' },
  COMPLETED: { bg: 'bg-green-100', border: 'border-green-400', text: 'text-green-800' },
  CANCELLED: { bg: 'bg-red-100', border: 'border-red-400', text: 'text-red-800' },
  NO_SHOW: { bg: 'bg-gray-100', border: 'border-gray-400', text: 'text-gray-800' },
}

const statusLabels: Record<string, string> = {
  SCHEDULED: 'Agendada',
  IN_PROGRESS: 'Em Andamento',
  COMPLETED: 'Concluída',
  CANCELLED: 'Cancelada',
  NO_SHOW: 'Não Compareceu',
}

const typeLabels: Record<string, string> = {
  IN_PERSON: 'Presencial',
  TELEMEDICINE: 'Teleconsulta',
  HOME_VISIT: 'Visita Domiciliar',
}

const typeIcons: Record<string, React.ReactNode> = {
  IN_PERSON: <MapPin className="h-4 w-4" />,
  TELEMEDICINE: <Video className="h-4 w-4" />,
  HOME_VISIT: <Stethoscope className="h-4 w-4" />,
}

// Mensagens em português
const messages = {
  allDay: 'Dia inteiro',
  previous: 'Anterior',
  next: 'Próximo',
  today: 'Hoje',
  month: 'Mês',
  week: 'Semana',
  day: 'Dia',
  agenda: 'Agenda',
  date: 'Data',
  time: 'Hora',
  event: 'Consulta',
  noEventsInRange: 'Nenhuma consulta neste período.',
  showMore: (total: number) => `+${total} mais`,
}

// Componente de evento customizado
function EventComponent({ event }: { event: CalendarEvent }) {
  const colors = statusColors[event.status] || statusColors.SCHEDULED
  
  return (
    <div className={cn(
      'px-1 py-0.5 rounded text-xs truncate border-l-2',
      colors.bg,
      colors.border,
      colors.text
    )}>
      <span className="font-medium">{format(event.start, 'HH:mm')}</span>
      {' - '}
      <span>{event.patient?.name || event.title}</span>
    </div>
  )
}

// Componente principal do calendário
export function CalendarView() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<View>(Views.MONTH)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [showEventDialog, setShowEventDialog] = useState(false)

  // Carregar eventos
  const loadEvents = useCallback(async () => {
    try {
      setLoading(true)
      const start = startOfMonth(subMonths(currentDate, 1))
      const end = endOfMonth(addMonths(currentDate, 1))
      
      const params = new URLSearchParams({
        start: start.toISOString(),
        end: end.toISOString(),
      })
      
      const res = await fetch(`/api/calendar/events?${params}`)
      if (!res.ok) throw new Error('Falha ao carregar eventos')
      
      const data = await res.json()
      
      // Converter strings de data para objetos Date
      const formattedEvents = data.events.map((event: any) => ({
        ...event,
        start: new Date(event.start),
        end: new Date(event.end),
      }))
      
      setEvents(formattedEvents)
    } catch (error) {
      console.error('Erro ao carregar eventos:', error)
    } finally {
      setLoading(false)
    }
  }, [currentDate])

  useEffect(() => {
    loadEvents()
  }, [loadEvents])

  // Handlers de navegação
  const handleNavigate = useCallback((date: Date) => {
    setCurrentDate(date)
  }, [])

  const handleViewChange = useCallback((newView: View) => {
    setView(newView)
  }, [])

  // Handler de clique em evento
  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    setSelectedEvent(event)
    setShowEventDialog(true)
  }, [])

  // Estilo customizado para eventos
  const eventStyleGetter = useCallback((event: CalendarEvent) => {
    const colors = statusColors[event.status] || statusColors.SCHEDULED
    return {
      style: {
        backgroundColor: 'transparent',
        border: 'none',
        padding: 0,
      },
    }
  }, [])

  // Toolbar customizada
  const CustomToolbar = useMemo(() => {
    return function Toolbar({ onNavigate, onView, label }: any) {
      return (
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate('TODAY')}
            >
              Hoje
            </Button>
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onNavigate('PREV')}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onNavigate('NEXT')}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <h2 className="text-lg font-semibold capitalize">{label}</h2>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={loadEvents}
              disabled={loading}
              title="Atualizar"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
            <div className="flex border rounded-md">
              <Button
                variant={view === Views.MONTH ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => onView(Views.MONTH)}
                className="rounded-r-none"
              >
                Mês
              </Button>
              <Button
                variant={view === Views.WEEK ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => onView(Views.WEEK)}
                className="rounded-none border-x"
              >
                Semana
              </Button>
              <Button
                variant={view === Views.DAY ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => onView(Views.DAY)}
                className="rounded-none border-r"
              >
                Dia
              </Button>
              <Button
                variant={view === Views.AGENDA ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => onView(Views.AGENDA)}
                className="rounded-l-none"
              >
                Lista
              </Button>
            </div>
          </div>
        </div>
      )
    }
  }, [view, loading, loadEvents])

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Agenda de Consultas
          </CardTitle>
          <div className="flex items-center gap-2 text-xs">
            {Object.entries(statusColors).slice(0, 4).map(([status, colors]) => (
              <div key={status} className="flex items-center gap-1">
                <div className={cn('w-3 h-3 rounded', colors.bg, 'border', colors.border)} />
                <span className="text-muted-foreground">{statusLabels[status]}</span>
              </div>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="h-[600px]">
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height: '100%' }}
            view={view}
            onView={handleViewChange}
            date={currentDate}
            onNavigate={handleNavigate}
            onSelectEvent={handleSelectEvent}
            eventPropGetter={eventStyleGetter}
            components={{
              event: EventComponent,
              toolbar: CustomToolbar,
            }}
            messages={messages}
            culture="pt-BR"
            popup
            selectable
            formats={{
              monthHeaderFormat: (date: Date) => format(date, 'MMMM yyyy', { locale: ptBR }),
              weekdayFormat: (date: Date) => format(date, 'EEE', { locale: ptBR }),
              dayHeaderFormat: (date: Date) => format(date, "EEEE, d 'de' MMMM", { locale: ptBR }),
              dayRangeHeaderFormat: ({ start, end }: { start: Date; end: Date }) =>
                `${format(start, 'd MMM', { locale: ptBR })} - ${format(end, 'd MMM yyyy', { locale: ptBR })}`,
              agendaDateFormat: (date: Date) => format(date, "EEE, d 'de' MMM", { locale: ptBR }),
              agendaTimeFormat: (date: Date) => format(date, 'HH:mm'),
              agendaTimeRangeFormat: ({ start, end }: { start: Date; end: Date }) =>
                `${format(start, 'HH:mm')} - ${format(end, 'HH:mm')}`,
            }}
          />
        </div>
      </CardContent>

      {/* Dialog de detalhes do evento */}
      <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedEvent && typeIcons[selectedEvent.type]}
              Detalhes da Consulta
            </DialogTitle>
            <DialogDescription>
              {selectedEvent && typeLabels[selectedEvent.type]}
            </DialogDescription>
          </DialogHeader>
          
          {selectedEvent && (
            <div className="space-y-4">
              {/* Status */}
              <div className="flex items-center gap-2">
                <Badge className={cn(
                  statusColors[selectedEvent.status]?.bg,
                  statusColors[selectedEvent.status]?.text,
                  'border',
                  statusColors[selectedEvent.status]?.border
                )}>
                  {statusLabels[selectedEvent.status]}
                </Badge>
              </div>
              
              {/* Paciente */}
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">{selectedEvent.patient.name}</p>
                  {selectedEvent.patient.phone && (
                    <p className="text-sm text-muted-foreground">{selectedEvent.patient.phone}</p>
                  )}
                </div>
              </div>
              
              {/* Data/Hora */}
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">
                    {format(selectedEvent.start, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {format(selectedEvent.start, 'HH:mm')} - {format(selectedEvent.end, 'HH:mm')}
                  </p>
                </div>
              </div>
              
              {/* Médico */}
              {selectedEvent.doctor && (
                <div className="flex items-start gap-3">
                  <Stethoscope className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">Dr(a). {selectedEvent.doctor.name}</p>
                  </div>
                </div>
              )}
              
              {/* Ações */}
              <div className="flex gap-2 pt-4 border-t">
                {selectedEvent.status === 'SCHEDULED' && (
                  <Link href={`/consultations/${selectedEvent.id}`} className="flex-1">
                    <Button className="w-full">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Iniciar Consulta
                    </Button>
                  </Link>
                )}
                {selectedEvent.status === 'IN_PROGRESS' && (
                  <Link href={`/consultations/${selectedEvent.id}`} className="flex-1">
                    <Button className="w-full">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Continuar Consulta
                    </Button>
                  </Link>
                )}
                {selectedEvent.status === 'COMPLETED' && (
                  <Link href={`/consultations/${selectedEvent.id}`} className="flex-1">
                    <Button variant="outline" className="w-full">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Ver Detalhes
                    </Button>
                  </Link>
                )}
                <Button 
                  variant="outline" 
                  onClick={() => setShowEventDialog(false)}
                >
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}
