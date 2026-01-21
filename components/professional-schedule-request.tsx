'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Calendar, Loader2, AlertCircle, Send, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { CalendarDatePicker } from '@/components/calendar-date-picker'
import { ShiftTemplates } from '@/components/schedule-shift-templates'
import { logger } from '@/lib/logger'

interface ShiftTemplate {
  id: string
  name: string
  startTime: string
  endTime: string
  color: string
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Segunda-feira' },
  { value: 2, label: 'Terça-feira' },
  { value: 3, label: 'Quarta-feira' },
  { value: 4, label: 'Quinta-feira' },
  { value: 5, label: 'Sexta-feira' },
  { value: 6, label: 'Sábado' },
]

export function ProfessionalScheduleRequest() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [requestType, setRequestType] = useState<'ADD_HOURS' | 'BLOCK_DATES'>('ADD_HOURS')
  const [submitting, setSubmitting] = useState(false)

  // ADD_HOURS state
  const [dayOfWeek, setDayOfWeek] = useState<number>(1)
  const [serviceType, setServiceType] = useState<'IN_PERSON' | 'REMOTE' | 'BOTH'>('BOTH')
  const [selectedShift, setSelectedShift] = useState<ShiftTemplate | undefined>()

  // BLOCK_DATES state
  const [selectedDates, setSelectedDates] = useState<string[]>([])
  const [blockShift, setBlockShift] = useState<ShiftTemplate | undefined>()

  // Common
  const [reason, setReason] = useState('')

  const handleSubmitAddHours = async () => {
    if (!selectedShift) {
      toast.error('Selecione um turno')
      return
    }

    try {
      setSubmitting(true)
      const response = await fetch('/api/schedules/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestType: 'ADD_HOURS',
          requestData: {
            dayOfWeek,
            startTime: selectedShift.startTime,
            endTime: selectedShift.endTime,
            serviceType,
          },
          reason: reason || undefined,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erro ao enviar solicitação')
      }

      toast.success('Solicitação enviada! Aguardando aprovação do administrador.')
      setDialogOpen(false)
      resetForm()
    } catch (error) {
      logger.error('Error submitting request:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao enviar solicitação')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmitBlockDates = async () => {
    if (selectedDates.length === 0) {
      toast.error('Selecione pelo menos uma data')
      return
    }

    if (!blockShift) {
      toast.error('Selecione um turno')
      return
    }

    try {
      setSubmitting(true)
      const response = await fetch('/api/schedules/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestType: 'BLOCK_DATES',
          requestData: {
            dates: selectedDates,
            blockType: 'ON_CALL',
            startTime: blockShift.startTime,
            endTime: blockShift.endTime,
            reason: `Plantão ${blockShift.name}`,
          },
          reason: reason || undefined,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erro ao enviar solicitação')
      }

      toast.success(`Solicitação de bloqueio de ${selectedDates.length} data(s) enviada!`)
      setDialogOpen(false)
      resetForm()
    } catch (error) {
      logger.error('Error submitting block request:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao enviar solicitação')
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setSelectedShift(undefined)
    setBlockShift(undefined)
    setSelectedDates([])
    setReason('')
    setDayOfWeek(1)
    setServiceType('BOTH')
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Send className="mr-2 h-4 w-4" />
          Solicitar Mudança de Agenda
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Solicitar Mudança de Agenda</DialogTitle>
          <DialogDescription>
            Sua solicitação será enviada para aprovação do administrador ou secretária
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Importante:</strong> Mudanças na agenda precisam ser aprovadas pela administração da clínica para garantir a coordenação de recursos.
            </AlertDescription>
          </Alert>

          {/* Tipo de Solicitação */}
          <div className="space-y-2">
            <Label>Tipo de Solicitação</Label>
            <Select
              value={requestType}
              onValueChange={(v: any) => setRequestType(v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ADD_HOURS">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Adicionar Horários de Atendimento
                  </div>
                </SelectItem>
                <SelectItem value="BLOCK_DATES">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Bloquear Datas (Plantão/Férias)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Formulário ADD_HOURS */}
          {requestType === 'ADD_HOURS' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Dia da Semana</Label>
                <Select
                  value={dayOfWeek.toString()}
                  onValueChange={(v) => setDayOfWeek(parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS_OF_WEEK.map((day) => (
                      <SelectItem key={day.value} value={day.value.toString()}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tipo de Atendimento</Label>
                <Select
                  value={serviceType}
                  onValueChange={(v: any) => setServiceType(v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IN_PERSON">Presencial</SelectItem>
                    <SelectItem value="REMOTE">Remoto (Teleconsulta)</SelectItem>
                    <SelectItem value="BOTH">Ambos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <ShiftTemplates
                selectedShift={selectedShift}
                onSelectShift={setSelectedShift}
              />
            </div>
          )}

          {/* Formulário BLOCK_DATES */}
          {requestType === 'BLOCK_DATES' && (
            <div className="space-y-4">
              <CalendarDatePicker
                selectedDates={selectedDates}
                onDatesChange={setSelectedDates}
                onClear={() => setSelectedDates([])}
              />

              <ShiftTemplates
                selectedShift={blockShift}
                onSelectShift={setBlockShift}
              />
            </div>
          )}

          {/* Motivo */}
          <div className="space-y-2">
            <Label htmlFor="reason">Motivo da Solicitação (opcional)</Label>
            <Textarea
              id="reason"
              placeholder="Ex: Plantão em outro hospital, Treinamento, etc."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>

          {/* Botões */}
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={submitting}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={requestType === 'ADD_HOURS' ? handleSubmitAddHours : handleSubmitBlockDates}
              disabled={submitting}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Enviar Solicitação
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
