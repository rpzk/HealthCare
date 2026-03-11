'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, AlertTriangle, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface ScheduleSlot {
  start: string
  end: string
  type: string
}

interface ScheduleSummary {
  dayOfWeek: number
  dayLabel: string
  slots: ScheduleSlot[]
}

interface ExceptionSummary {
  id: string
  date: string
  blockType: string
  blockLabel: string
  reason: string | null
}

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
  'ADMIN',
]

export function ScheduleSummaryCard() {
  const { data: session } = useSession()
  const [schedules, setSchedules] = useState<ScheduleSummary[]>([])
  const [exceptions, setExceptions] = useState<ExceptionSummary[]>([])
  const [loading, setLoading] = useState(true)

  const isProfessional = session?.user?.role && PROFESSIONAL_ROLES.includes(session.user.role)

  useEffect(() => {
    if (isProfessional) {
      loadSummary()
    } else {
      setLoading(false)
    }
  }, [isProfessional])

  const loadSummary = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/schedules/summary')
      if (res.ok) {
        const data = await res.json()
        setSchedules(data.schedules || [])
        setExceptions(data.exceptions || [])
      }
    } catch {
      setSchedules([])
      setExceptions([])
    } finally {
      setLoading(false)
    }
  }

  if (!isProfessional) return null

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  const hasSchedules = schedules.length > 0
  const hasExceptions = exceptions.length > 0

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Resumo da Minha Agenda
            </CardTitle>
            <CardDescription>
              Horários de atendimento e bloqueios configurados
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/appointments/dashboard">
              <Calendar className="mr-2 h-4 w-4" />
              Ver Calendário
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Horários de atendimento */}
        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Horários de Atendimento
          </h4>
          {hasSchedules ? (
            <div className="space-y-1.5 text-sm">
              {schedules.map((s) => (
                <div
                  key={s.dayOfWeek}
                  className="flex items-center justify-between py-1.5 px-3 rounded-md bg-muted/50"
                >
                  <span className="font-medium">{s.dayLabel}</span>
                  <span className="text-muted-foreground">
                    {s.slots.map((sl) => `${sl.start}–${sl.end}`).join(' • ')}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-2">
              Nenhum horário de atendimento aprovado. Use o botão abaixo para solicitar.
            </p>
          )}
        </div>

        {/* Bloqueios e férias */}
        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Bloqueios e Férias (próximos 60 dias)
          </h4>
          {hasExceptions ? (
            <div className="space-y-1.5 text-sm max-h-40 overflow-y-auto">
              {exceptions.slice(0, 15).map((e) => (
                <div
                  key={e.id}
                  className="flex items-center justify-between py-1.5 px-3 rounded-md bg-amber-50 dark:bg-amber-950/30"
                >
                  <span>{format(new Date(e.date), "dd/MM/yyyy", { locale: ptBR })}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {e.blockLabel}
                    </Badge>
                    {e.reason && (
                      <span className="text-muted-foreground truncate max-w-[120px]" title={e.reason}>
                        {e.reason}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {exceptions.length > 15 && (
                <p className="text-xs text-muted-foreground py-1">
                  + {exceptions.length - 15} blocos
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-2">
              Nenhum bloqueio ou férias configurados.
            </p>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          Para alterar horários, solicite mudanças pela administração. Para adicionar bloqueios ou
          férias, use os formulários abaixo.
        </p>
      </CardContent>
    </Card>
  )
}

