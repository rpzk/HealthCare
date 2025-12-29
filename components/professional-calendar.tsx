'use client'

import { useMemo, useState } from 'react'
import { Calendar as BigCalendar, dateFnsLocalizer, View, SlotInfo } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'

const locales = { 'pt-BR': ptBR }
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
})

interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  resource: {
    type: 'consultation' | 'blocked'
    status?: string
    patientName?: string
    reason?: string
  }
}

interface ProfessionalCalendarProps {
  events: CalendarEvent[]
  onSelectSlot?: (slotInfo: SlotInfo) => void
  onSelectEvent?: (event: CalendarEvent) => void
}

const eventStyleGetter = (event: CalendarEvent) => {
  let backgroundColor = '#667eea'
  let borderColor = '#667eea'

  if (event.resource.type === 'blocked') {
    backgroundColor = '#e5e7eb'
    borderColor = '#d1d5db'
  } else if (event.resource.status === 'SCHEDULED') {
    backgroundColor = '#fbbf24'
    borderColor = '#f59e0b'
  } else if (event.resource.status === 'IN_PROGRESS') {
    backgroundColor = '#34d399'
    borderColor = '#10b981'
  } else if (event.resource.status === 'CANCELLED') {
    backgroundColor = '#f87171'
    borderColor = '#ef4444'
  }

  return {
    style: {
      backgroundColor,
      borderRadius: '5px',
      opacity: 0.8,
      color: '#fff',
      border: `1px solid ${borderColor}`,
      display: 'block',
    },
  }
}

export function ProfessionalCalendar({
  events,
  onSelectSlot,
  onSelectEvent,
}: ProfessionalCalendarProps) {
  const [view, setView] = useState<View>('week')
  const [date, setDate] = useState(new Date())

  const processedEvents = useMemo(() => {
    return events.map((event) => ({
      ...event,
      start: new Date(event.start),
      end: new Date(event.end),
    }))
  }, [events])

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Calendário Profissional
            </CardTitle>
            <CardDescription>
              Visualize seus agendamentos, bloqueios e disponibilidades
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={view === 'month' ? 'default' : 'outline'}
              onClick={() => setView('month')}
            >
              Mês
            </Button>
            <Button
              size="sm"
              variant={view === 'week' ? 'default' : 'outline'}
              onClick={() => setView('week')}
            >
              Semana
            </Button>
            <Button
              size="sm"
              variant={view === 'day' ? 'default' : 'outline'}
              onClick={() => setView('day')}
            >
              Dia
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Legend */}
          <div className="flex flex-wrap gap-4 p-3 bg-muted rounded-lg text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#34d399' }} />
              <span>Em andamento</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#fbbf24' }} />
              <span>Agendada</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#f87171' }} />
              <span>Cancelada</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#e5e7eb' }} />
              <span>Bloqueio</span>
            </div>
          </div>

          {/* Calendar */}
          <div className="border rounded-lg overflow-hidden" style={{ height: '600px' }}>
            <BigCalendar
              localizer={localizer}
              events={processedEvents}
              startAccessor="start"
              endAccessor="end"
              style={{ height: '100%' }}
              view={view}
              onView={setView}
              date={date}
              onNavigate={setDate}
              onSelectSlot={onSelectSlot}
              onSelectEvent={onSelectEvent}
              selectable
              popup
              eventPropGetter={eventStyleGetter}
              messages={{
                next: 'Próximo',
                previous: 'Anterior',
                today: 'Hoje',
                month: 'Mês',
                week: 'Semana',
                day: 'Dia',
                agenda: 'Agenda',
                date: 'Data',
                time: 'Hora',
                event: 'Evento',
                allDay: 'O dia todo',
                noEventsInRange: 'Nenhum evento neste período.',
                showMore: (total) => `+ ${total} mais`,
              }}
              culture="pt-BR"
              views={['month', 'week', 'day', 'agenda']}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
