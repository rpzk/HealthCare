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
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import {
  Plus,
  Watch,
  Heart,
  Stethoscope,
  Thermometer,
  Scale,
  Activity,
  Smartphone,
} from 'lucide-react'

const deviceSchema = z.object({
  deviceType: z.string().min(1, 'Selecione o tipo'),
  deviceName: z.string().min(2, 'Nome é obrigatório'),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  dataSource: z.string().min(1, 'Selecione a fonte de dados'),
  autoSync: z.boolean().default(true),
  notifyOnAbnormal: z.boolean().default(true),
})

type DeviceFormData = z.infer<typeof deviceSchema>

interface AddDeviceDialogProps {
  patientId: string
  onDeviceAdded: () => void
}

const DEVICE_TYPES = [
  { value: 'SMARTWATCH', label: 'Smartwatch', icon: Watch },
  { value: 'FITNESS_BAND', label: 'Pulseira Fitness', icon: Activity },
  { value: 'BLOOD_PRESSURE', label: 'Medidor de Pressão', icon: Heart },
  { value: 'GLUCOMETER', label: 'Glicosímetro', icon: Activity },
  { value: 'PULSE_OXIMETER', label: 'Oxímetro', icon: Activity },
  { value: 'STETHOSCOPE', label: 'Estetoscópio Digital', icon: Stethoscope },
  { value: 'OTOSCOPE', label: 'Otoscópio Digital', icon: Activity },
  { value: 'THERMOMETER', label: 'Termômetro', icon: Thermometer },
  { value: 'SCALE', label: 'Balança', icon: Scale },
  { value: 'ECG', label: 'Monitor ECG', icon: Heart },
  { value: 'CGM', label: 'Monitor Contínuo de Glicose', icon: Activity },
  { value: 'SLEEP_TRACKER', label: 'Monitor de Sono', icon: Activity },
  { value: 'OTHER', label: 'Outro', icon: Smartphone },
]

const DATA_SOURCES = [
  { value: 'APPLE_HEALTHKIT', label: 'Apple Health (iOS)' },
  { value: 'GOOGLE_FIT', label: 'Google Fit' },
  { value: 'HEALTH_CONNECT', label: 'Health Connect (Android 14+)' },
  { value: 'DIRECT_BLUETOOTH', label: 'Bluetooth Direto' },
  { value: 'DIRECT_WIFI', label: 'WiFi Direto' },
  { value: 'MANUAL_ENTRY', label: 'Entrada Manual' },
  { value: 'API_INTEGRATION', label: 'API do Fabricante' },
]

export function AddDeviceDialog({ patientId, onDeviceAdded }: AddDeviceDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const form = useForm<DeviceFormData>({
    resolver: zodResolver(deviceSchema),
    defaultValues: {
      autoSync: true,
      notifyOnAbnormal: true,
    },
  })

  const onSubmit = async (data: DeviceFormData) => {
    setLoading(true)
    try {
      const res = await fetch('/api/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, patientId }),
      })

      if (!res.ok) throw new Error('Erro ao adicionar dispositivo')

      toast({
        title: 'Dispositivo adicionado',
        description: 'O dispositivo foi registrado com sucesso.',
      })

      setOpen(false)
      form.reset()
      onDeviceAdded()
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível adicionar o dispositivo.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Dispositivo
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar Dispositivo de Saúde</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo de Dispositivo *</Label>
            <Select
              onValueChange={(v) => form.setValue('deviceType', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {DEVICE_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center gap-2">
                      <type.icon className="h-4 w-4" />
                      {type.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.deviceType && (
              <p className="text-sm text-red-500">
                {form.formState.errors.deviceType.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Nome do Dispositivo *</Label>
            <Input
              placeholder="Ex: Apple Watch Series 9"
              {...form.register('deviceName')}
            />
            {form.formState.errors.deviceName && (
              <p className="text-sm text-red-500">
                {form.formState.errors.deviceName.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fabricante</Label>
              <Input
                placeholder="Ex: Apple"
                {...form.register('manufacturer')}
              />
            </div>
            <div className="space-y-2">
              <Label>Modelo</Label>
              <Input
                placeholder="Ex: A2860"
                {...form.register('model')}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Número de Série</Label>
            <Input
              placeholder="Opcional"
              {...form.register('serialNumber')}
            />
          </div>

          <div className="space-y-2">
            <Label>Fonte de Dados *</Label>
            <Select
              onValueChange={(v) => form.setValue('dataSource', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Como os dados serão obtidos" />
              </SelectTrigger>
              <SelectContent>
                {DATA_SOURCES.map(source => (
                  <SelectItem key={source.value} value={source.value}>
                    {source.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.dataSource && (
              <p className="text-sm text-red-500">
                {form.formState.errors.dataSource.message}
              </p>
            )}
          </div>

          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Sincronização Automática</Label>
                <p className="text-sm text-gray-500">
                  Buscar dados automaticamente
                </p>
              </div>
              <Switch
                checked={form.watch('autoSync')}
                onCheckedChange={(v) => form.setValue('autoSync', v)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Alertas de Valores Anormais</Label>
                <p className="text-sm text-gray-500">
                  Notificar quando valores estiverem fora do normal
                </p>
              </div>
              <Switch
                checked={form.watch('notifyOnAbnormal')}
                onCheckedChange={(v) => form.setValue('notifyOnAbnormal', v)}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? 'Adicionando...' : 'Adicionar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
