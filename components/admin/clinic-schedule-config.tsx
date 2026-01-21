'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Clock, Save, Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'

interface DaySchedule {
  dayOfWeek: number
  openTime: string
  closeTime: string
  isOpen: boolean
  label: string
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Domingo', short: 'Dom' },
  { value: 1, label: 'Segunda-feira', short: 'Seg' },
  { value: 2, label: 'Terça-feira', short: 'Ter' },
  { value: 3, label: 'Quarta-feira', short: 'Qua' },
  { value: 4, label: 'Quinta-feira', short: 'Qui' },
  { value: 5, label: 'Sexta-feira', short: 'Sex' },
  { value: 6, label: 'Sábado', short: 'Sáb' },
]

export function ClinicScheduleConfig() {
  const [schedules, setSchedules] = useState<DaySchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    loadSchedules()
  }, [])

  const loadSchedules = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/schedules/clinic')
      if (response.ok) {
        const data = await response.json()
        setSchedules(data.schedules)
      }
    } catch (error) {
      logger.error('Error loading clinic schedules:', error)
      toast.error('Erro ao carregar horários da clínica')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleDay = (dayOfWeek: number) => {
    setSchedules((prev) =>
      prev.map((s) =>
        s.dayOfWeek === dayOfWeek ? { ...s, isOpen: !s.isOpen } : s
      )
    )
    setHasChanges(true)
  }

  const handleTimeChange = (dayOfWeek: number, field: 'openTime' | 'closeTime', value: string) => {
    setSchedules((prev) =>
      prev.map((s) =>
        s.dayOfWeek === dayOfWeek ? { ...s, [field]: value } : s
      )
    )
    setHasChanges(true)
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const response = await fetch('/api/schedules/clinic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedules }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erro ao salvar')
      }

      toast.success('Horários da clínica atualizados!')
      setHasChanges(false)
    } catch (error) {
      logger.error('Error saving clinic schedules:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar horários')
    } finally {
      setSaving(false)
    }
  }

  const applyToAllWeekdays = () => {
    const mondaySchedule = schedules.find((s) => s.dayOfWeek === 1)
    if (!mondaySchedule) return

    setSchedules((prev) =>
      prev.map((s) =>
        s.dayOfWeek >= 1 && s.dayOfWeek <= 5
          ? { ...s, openTime: mondaySchedule.openTime, closeTime: mondaySchedule.closeTime, isOpen: mondaySchedule.isOpen }
          : s
      )
    )
    setHasChanges(true)
    toast.success('Horários aplicados a todos os dias úteis')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Horários de Funcionamento da Clínica
        </CardTitle>
        <CardDescription>
          Configure os horários de abertura e fechamento para cada dia da semana.
          Estes serão os limites dentro dos quais os profissionais podem agendar atendimentos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Importante:</strong> Os profissionais só poderão configurar seus horários dentro do período em que a clínica está aberta.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          {schedules.map((schedule) => {
            const dayInfo = DAYS_OF_WEEK.find((d) => d.value === schedule.dayOfWeek)
            
            return (
              <div
                key={schedule.dayOfWeek}
                className={`p-4 border rounded-lg transition-colors ${
                  schedule.isOpen ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  {/* Dia da semana */}
                  <div className="flex items-center gap-3 min-w-[140px]">
                    <Switch
                      checked={schedule.isOpen}
                      onCheckedChange={() => handleToggleDay(schedule.dayOfWeek)}
                    />
                    <div>
                      <div className="font-semibold">{dayInfo?.label}</div>
                      {!schedule.isOpen && (
                        <div className="text-xs text-gray-500">Fechado</div>
                      )}
                    </div>
                  </div>

                  {/* Horários */}
                  {schedule.isOpen && (
                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-gray-500 min-w-[60px]">Abertura:</Label>
                        <Input
                          type="time"
                          value={schedule.openTime}
                          onChange={(e) => handleTimeChange(schedule.dayOfWeek, 'openTime', e.target.value)}
                          className="w-32"
                        />
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-gray-500 min-w-[70px]">Fechamento:</Label>
                        <Input
                          type="time"
                          value={schedule.closeTime}
                          onChange={(e) => handleTimeChange(schedule.dayOfWeek, 'closeTime', e.target.value)}
                          className="w-32"
                        />
                      </div>

                      <div className="text-sm text-gray-600 font-medium ml-2">
                        {schedule.openTime} - {schedule.closeTime}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Ações rápidas */}
        <div className="flex gap-2 pt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={applyToAllWeekdays}
            disabled={saving}
          >
            Aplicar Seg-Sex
          </Button>
        </div>

        {/* Botão Salvar */}
        {hasChanges && (
          <Alert className="bg-blue-50 border-blue-200">
            <CheckCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-900">
              Você tem alterações não salvas. Clique em salvar para aplicá-las.
            </AlertDescription>
          </Alert>
        )}

        <Button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className="w-full"
          size="lg"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Salvar Horários da Clínica
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
