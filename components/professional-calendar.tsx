'use client'

import { useMemo, useState } from 'react'
import { useTheme } from 'next-themes'
import { Calendar as BigCalendar, dateFnsLocalizer, View, SlotInfo } from 'react-big-calendar'
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css'
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
  onRangeChange?: (range: Date[] | { start: Date; end: Date }, view: View) => void
  onEventDrop?: (args: { event: CalendarEvent; start: Date; end: Date; isAllDay: boolean }) => void
  onEventResize?: (args: { event: CalendarEvent; start: Date; end: Date; isAllDay: boolean }) => void
}

const DnDCalendar = withDragAndDrop(BigCalendar)

function createEventStyleGetter(isDark: boolean) {
  return (event: CalendarEvent) => {
    const title = (event.title || '').toLowerCase()
    const looksLikeBlockByTitle =
      title.includes('férias') ||
      title.includes('ferias') ||
      title.includes('bloqueio') ||
      title.includes('indispon')
    const isBlocked = event.resource.type === 'blocked' || looksLikeBlockByTitle

    let backgroundColor = isDark ? '#3f4b63' : '#cbd5e1'
    let borderColor = isDark ? '#55607a' : '#b6c2d1'
    let color = isDark ? '#e2e8f0' : '#334155'

    if (isBlocked) {
      return {
        style: {
          backgroundColor: isDark ? '#3b4456' : '#d9e1ea',
          borderRadius: '4px',
          opacity: isDark ? 0.5 : 0.65,
          color: isDark ? '#cbd5e1' : '#475569',
          border: `1px solid ${isDark ? '#556176' : '#c2ccd8'}`,
          display: 'block',
          boxShadow: 'none',
        },
      }
    }

    if (event.resource.status === 'SCHEDULED') {
      backgroundColor = isDark ? '#b69245' : '#ddb45c'
      borderColor = isDark ? '#9f7f3b' : '#c89d45'
      color = isDark ? '#111827' : '#1f2937'
    } else if (event.resource.status === 'IN_PROGRESS') {
      backgroundColor = isDark ? '#2f8a69' : '#339874'
      borderColor = isDark ? '#2a7a5d' : '#2b8868'
    } else if (event.resource.status === 'CANCELLED') {
      backgroundColor = isDark ? '#ad5b62' : '#c86870'
      borderColor = isDark ? '#9a4f56' : '#b95a62'
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '6px',
        opacity: 0.95,
        color,
        border: `1px solid ${borderColor}`,
        display: 'block',
        boxShadow: isDark ? '0 0 0 1px rgba(15,23,42,0.25)' : 'none',
      },
    }
  }
}

function CalendarEventContent({ event }: { event: CalendarEvent }) {
  const label = event.resource?.patientName || event.title
  const startLabel = format(event.start, 'HH:mm')
  const endLabel = format(event.end, 'HH:mm')
  return (
    <div className="flex flex-col">
      <div className="text-[11px] font-medium leading-tight truncate">
        {startLabel}–{endLabel} • {label}
      </div>
    </div>
  )
}

export function ProfessionalCalendar({
  events,
  onSelectSlot,
  onSelectEvent,
  onRangeChange,
  onEventDrop,
  onEventResize,
}: ProfessionalCalendarProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  const eventStyleGetter = useMemo(() => createEventStyleGetter(isDark), [isDark])

  const [view, setView] = useState<View>('week')
  const [date, setDate] = useState(new Date())

  const processedEvents = useMemo(() => {
    return events.map((event) => ({
      ...event,
      start: new Date(event.start),
      end: new Date(event.end),
    }))
  }, [events])

  const consultationEvents = useMemo(
    () => processedEvents.filter((event) => event.resource?.type !== 'blocked'),
    [processedEvents]
  )

  const blockedBackgroundEvents = useMemo(
    () => processedEvents.filter((event) => event.resource?.type === 'blocked'),
    [processedEvents]
  )

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
              className={view !== 'month' ? 'bg-muted/50 border-border hover:bg-muted' : ''}
              onClick={() => setView('month')}
            >
              Mês
            </Button>
            <Button
              size="sm"
              variant={view === 'week' ? 'default' : 'outline'}
              className={view !== 'week' ? 'bg-muted/50 border-border hover:bg-muted' : ''}
              onClick={() => setView('week')}
            >
              Semana
            </Button>
            <Button
              size="sm"
              variant={view === 'day' ? 'default' : 'outline'}
              className={view !== 'day' ? 'bg-muted/50 border-border hover:bg-muted' : ''}
              onClick={() => setView('day')}
            >
              Dia
            </Button>
            <Button
              size="sm"
              variant={view === 'agenda' ? 'default' : 'outline'}
              className={view !== 'agenda' ? 'bg-muted/50 border-border hover:bg-muted' : ''}
              onClick={() => setView('agenda')}
            >
              Agenda
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
              <div
                className="w-4 h-4 rounded border border-border"
                style={{ backgroundColor: isDark ? '#4b5563' : '#e5e7eb' }}
              />
              <span>Bloqueio</span>
            </div>
          </div>

          {/* Calendar */}
          <div className="border rounded-lg overflow-hidden" style={{ height: '600px' }}>
            <DnDCalendar
              localizer={localizer}
              events={consultationEvents}
              backgroundEvents={blockedBackgroundEvents}
              startAccessor={(event) => (event as CalendarEvent).start}
              endAccessor={(event) => (event as CalendarEvent).end}
              style={{ height: '100%' }}
              view={view}
              onView={setView}
              date={date}
              onNavigate={setDate}
              onSelectSlot={onSelectSlot}
              onSelectEvent={(event) => onSelectEvent?.(event as CalendarEvent)}
              selectable
              popup
              eventPropGetter={(event) => eventStyleGetter(event as CalendarEvent)}
              components={{
                event: ({ event }: any) => <CalendarEventContent event={event as CalendarEvent} />,
              }}
              formats={{
                eventTimeRangeFormat: () => '',
              }}
              onRangeChange={onRangeChange as any}
              draggableAccessor={(event: any) => {
                const e = event as CalendarEvent
                if (e.resource?.type !== 'consultation') return false
                const status = e.resource?.status
                return status !== 'CANCELLED' && status !== 'COMPLETED'
              }}
              resizable
              onEventDrop={(args: any) => {
                if (!onEventDrop) return
                onEventDrop({
                  event: args.event as CalendarEvent,
                  start: args.start as Date,
                  end: args.end as Date,
                  isAllDay: !!args.isAllDay,
                })
              }}
              onEventResize={(args: any) => {
                if (!onEventResize) return
                onEventResize({
                  event: args.event as CalendarEvent,
                  start: args.start as Date,
                  end: args.end as Date,
                  isAllDay: !!args.isAllDay,
                })
              }}
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
