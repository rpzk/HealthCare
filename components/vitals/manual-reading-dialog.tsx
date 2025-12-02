'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { Plus, Heart, Droplets, Thermometer, Scale, Activity, Wind } from 'lucide-react'

const readingSchema = z.object({
  readingType: z.string().min(1, 'Selecione o tipo'),
  primaryValue: z.number({ required_error: 'Valor é obrigatório' }),
  secondaryValue: z.number().optional(),
  unit: z.string().min(1, 'Unidade é obrigatória'),
  measuredAt: z.string().min(1, 'Data/hora é obrigatória'),
  context: z.string().optional(),
  notes: z.string().optional(),
})

type ReadingFormData = z.infer<typeof readingSchema>

interface ManualReadingDialogProps {
  patientId: string
  onReadingAdded: () => void
}

const READING_TYPES = [
  { value: 'BLOOD_PRESSURE', label: 'Pressão Arterial', icon: Heart, unit: 'mmHg', hasSecondary: true },
  { value: 'HEART_RATE', label: 'Frequência Cardíaca', icon: Heart, unit: 'bpm' },
  { value: 'OXYGEN_SATURATION', label: 'Saturação O₂', icon: Wind, unit: '%' },
  { value: 'BLOOD_GLUCOSE', label: 'Glicemia', icon: Droplets, unit: 'mg/dL' },
  { value: 'BODY_TEMPERATURE', label: 'Temperatura', icon: Thermometer, unit: '°C' },
  { value: 'WEIGHT', label: 'Peso', icon: Scale, unit: 'kg' },
  { value: 'RESPIRATORY_RATE', label: 'Freq. Respiratória', icon: Wind, unit: 'rpm' },
  { value: 'STEPS', label: 'Passos', icon: Activity, unit: 'passos' },
]

const CONTEXTS = [
  { value: 'FASTING', label: 'Em jejum' },
  { value: 'BEFORE_MEAL', label: 'Antes da refeição' },
  { value: 'AFTER_MEAL', label: 'Após refeição' },
  { value: 'RESTING', label: 'Em repouso' },
  { value: 'AFTER_EXERCISE', label: 'Após exercício' },
  { value: 'WAKING', label: 'Ao acordar' },
  { value: 'BEDTIME', label: 'Ao deitar' },
]

export function ManualReadingDialog({ patientId, onReadingAdded }: ManualReadingDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedType, setSelectedType] = useState<typeof READING_TYPES[0] | null>(null)
  const { toast } = useToast()

  const form = useForm<ReadingFormData>({
    resolver: zodResolver(readingSchema),
    defaultValues: {
      measuredAt: new Date().toISOString().slice(0, 16),
    },
  })

  const handleTypeChange = (value: string) => {
    const type = READING_TYPES.find(t => t.value === value)
    setSelectedType(type || null)
    form.setValue('readingType', value)
    if (type) {
      form.setValue('unit', type.unit)
    }
  }

  const onSubmit = async (data: ReadingFormData) => {
    setLoading(true)
    try {
      // Para pressão arterial, criar duas leituras
      const readings = []
      
      if (data.readingType === 'BLOOD_PRESSURE' && data.secondaryValue) {
        readings.push({
          readingType: 'BLOOD_PRESSURE_SYSTOLIC',
          primaryValue: data.primaryValue,
          unit: 'mmHg',
          measuredAt: data.measuredAt,
          context: data.context,
          notes: data.notes,
          isManual: true,
        })
        readings.push({
          readingType: 'BLOOD_PRESSURE_DIASTOLIC',
          primaryValue: data.secondaryValue,
          unit: 'mmHg',
          measuredAt: data.measuredAt,
          context: data.context,
          isManual: true,
        })
      } else {
        readings.push({
          readingType: data.readingType,
          primaryValue: data.primaryValue,
          unit: data.unit,
          measuredAt: data.measuredAt,
          context: data.context,
          notes: data.notes,
          isManual: true,
        })
      }

      const res = await fetch('/api/devices/readings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId, readings }),
      })

      if (!res.ok) throw new Error('Erro ao registrar leitura')

      toast({
        title: 'Leitura registrada',
        description: 'A medição foi salva com sucesso.',
      })

      setOpen(false)
      form.reset()
      setSelectedType(null)
      onReadingAdded()
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível registrar a leitura.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          Registrar Medição Manual
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Medição Manual</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo de Medição *</Label>
            <Select onValueChange={handleTypeChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {READING_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center gap-2">
                      <type.icon className="h-4 w-4" />
                      {type.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedType && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>
                    {selectedType.hasSecondary ? 'Sistólica *' : 'Valor *'}
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      step={selectedType.value === 'BODY_TEMPERATURE' ? '0.1' : '1'}
                      placeholder={selectedType.hasSecondary ? '120' : 'Valor'}
                      onChange={(e) => form.setValue('primaryValue', parseFloat(e.target.value))}
                    />
                    <span className="flex items-center text-gray-500 text-sm">
                      {selectedType.unit}
                    </span>
                  </div>
                </div>

                {selectedType.hasSecondary && (
                  <div className="space-y-2">
                    <Label>Diastólica *</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="80"
                        onChange={(e) => form.setValue('secondaryValue', parseFloat(e.target.value))}
                      />
                      <span className="flex items-center text-gray-500 text-sm">
                        {selectedType.unit}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Data e Hora *</Label>
                <Input
                  type="datetime-local"
                  {...form.register('measuredAt')}
                />
              </div>

              <div className="space-y-2">
                <Label>Contexto</Label>
                <Select onValueChange={(v) => form.setValue('context', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o contexto (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTEXTS.map(ctx => (
                      <SelectItem key={ctx.value} value={ctx.value}>
                        {ctx.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea
                  placeholder="Observações adicionais (opcional)"
                  {...form.register('notes')}
                />
              </div>
            </>
          )}

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={loading || !selectedType}
            >
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
