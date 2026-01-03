'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Calendar, Clock, AlertCircle, Save, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface ScheduleConfig {
  dayOfWeek: number
  allowPatientBooking: boolean
  maxBookingDaysAhead: number
  minBookingHoursAhead: number
  autoConfirmBooking: boolean
  startTime: string
  endTime: string
}

const DAY_LABELS: Record<number, string> = {
  0: 'Domingo',
  1: 'Segunda',
  2: 'Terça',
  3: 'Quarta',
  4: 'Quinta',
  5: 'Sexta',
  6: 'Sábado',
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
  'ADMIN'
]

export function PatientBookingConfig() {
  const { data: session } = useSession()
  const [schedules, setSchedules] = useState<ScheduleConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const isProfessional = session?.user?.role && PROFESSIONAL_ROLES.includes(session.user.role)

  useEffect(() => {
    if (isProfessional) {
      loadSchedules()
    }
  }, [isProfessional])

  const loadSchedules = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/schedules/my-schedules')
      if (response.ok) {
        const data = await response.json()
        setSchedules(data.schedules || [])
      }
    } catch (error) {
      console.error('Error loading schedules:', error)
      toast.error('Erro ao carregar horários')
    } finally {
      setLoading(false)
    }
  }

  const handleScheduleChange = (
    dayOfWeek: number,
    field: keyof ScheduleConfig,
    value: any
  ) => {
    setSchedules((prev) =>
      prev.map((s) =>
        s.dayOfWeek === dayOfWeek ? { ...s, [field]: value } : s
      )
    )
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const response = await fetch('/api/schedules/my-schedules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedules }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erro ao salvar')
      }

      toast.success('Configurações de agendamento salvas com sucesso!')
      await loadSchedules()
    } catch (error) {
      console.error('Error saving schedules:', error)
      toast.error(
        error instanceof Error ? error.message : 'Erro ao salvar configurações'
      )
    } finally {
      setSaving(false)
    }
  }

  if (!isProfessional) {
    return null
  }

  if (loading) {
    return <Loader2 className="h-6 w-6 animate-spin" />
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Agendamento de Pacientes
        </CardTitle>
        <CardDescription>
          Configure se e como seus pacientes podem agendar consultas automaticamente
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Quando habilitado, seus pacientes poderão auto-agendar consultas diretamente
            em seu horário de trabalho, respeitando seus critérios de antecedência e confirmação.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          {schedules.map((schedule) => (
            <div key={schedule.dayOfWeek} className="space-y-4 p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">{DAY_LABELS[schedule.dayOfWeek]}</h4>
                <div className="text-sm text-muted-foreground">
                  {schedule.startTime} - {schedule.endTime}
                </div>
              </div>

              <Separator />

              {/* Enable Patient Booking */}
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor={`booking-${schedule.dayOfWeek}`} className="cursor-pointer">
                    Permitir auto-agendamento de pacientes
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Seus pacientes poderão agendar consultas neste dia
                  </p>
                </div>
                <Switch
                  id={`booking-${schedule.dayOfWeek}`}
                  checked={schedule.allowPatientBooking}
                  onCheckedChange={(checked) =>
                    handleScheduleChange(schedule.dayOfWeek, 'allowPatientBooking', checked)
                  }
                />
              </div>

              {schedule.allowPatientBooking && (
                <>
                  {/* Max Booking Days Ahead */}
                  <div className="space-y-2">
                    <Label htmlFor={`max-days-${schedule.dayOfWeek}`}>
                      Máximo de dias antecipados
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id={`max-days-${schedule.dayOfWeek}`}
                        type="number"
                        min="1"
                        max="365"
                        value={schedule.maxBookingDaysAhead}
                        onChange={(e) =>
                          handleScheduleChange(
                            schedule.dayOfWeek,
                            'maxBookingDaysAhead',
                            parseInt(e.target.value) || 30
                          )
                        }
                        className="w-24"
                      />
                      <span className="text-sm text-muted-foreground">dias</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Pacientes só podem agendar até {schedule.maxBookingDaysAhead} dias no futuro
                    </p>
                  </div>

                  {/* Min Booking Hours Ahead */}
                  <div className="space-y-2">
                    <Label htmlFor={`min-hours-${schedule.dayOfWeek}`}>
                      Mínimo de horas de antecedência
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id={`min-hours-${schedule.dayOfWeek}`}
                        type="number"
                        min="0"
                        max="168"
                        value={schedule.minBookingHoursAhead}
                        onChange={(e) =>
                          handleScheduleChange(
                            schedule.dayOfWeek,
                            'minBookingHoursAhead',
                            parseInt(e.target.value) || 24
                          )
                        }
                        className="w-24"
                      />
                      <span className="text-sm text-muted-foreground">horas</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Pacientes precisam agendar com mínimo de {schedule.minBookingHoursAhead}h de antecedência
                    </p>
                  </div>

                  {/* Auto Confirm */}
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor={`auto-confirm-${schedule.dayOfWeek}`} className="cursor-pointer">
                        Confirmar automaticamente
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Consultas serão confirmadas imediatamente sem sua análise
                      </p>
                    </div>
                    <Switch
                      id={`auto-confirm-${schedule.dayOfWeek}`}
                      checked={schedule.autoConfirmBooking}
                      onCheckedChange={(checked) =>
                        handleScheduleChange(
                          schedule.dayOfWeek,
                          'autoConfirmBooking',
                          checked
                        )
                      }
                    />
                  </div>

                  {!schedule.autoConfirmBooking && (
                    <Alert>
                      <Clock className="h-4 w-4" />
                      <AlertDescription>
                        Agendamentos pendentes de confirmação aparecerão em suas consultas
                        para você revisar e aprovar
                      </AlertDescription>
                    </Alert>
                  )}
                </>
              )}
            </div>
          ))}
        </div>

        <Separator />

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Salvar Configurações
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
