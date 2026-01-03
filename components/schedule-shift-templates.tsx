'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Clock, Plus, Trash2, Save, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

interface ShiftTemplate {
  id: string
  name: string
  startTime: string
  endTime: string
  color: string
}

const DEFAULT_SHIFTS: ShiftTemplate[] = [
  { id: '1', name: '7-19 (Manhã/Tarde)', startTime: '07:00', endTime: '19:00', color: 'bg-blue-100' },
  { id: '2', name: '19-7 (Noite)', startTime: '19:00', endTime: '07:00', color: 'bg-indigo-100' },
  { id: '3', name: '10-22 (Tarde/Noite)', startTime: '10:00', endTime: '22:00', color: 'bg-purple-100' },
  { id: '4', name: '7-13 (Manhã)', startTime: '07:00', endTime: '13:00', color: 'bg-green-100' },
  { id: '5', name: '13-19 (Tarde)', startTime: '13:00', endTime: '19:00', color: 'bg-yellow-100' },
  { id: '6', name: '17-22 (Noite Curta)', startTime: '17:00', endTime: '22:00', color: 'bg-orange-100' },
  { id: '7', name: '8-16 (Comercial)', startTime: '08:00', endTime: '16:00', color: 'bg-cyan-100' },
  { id: '8', name: '6-14 (Madrugada)', startTime: '06:00', endTime: '14:00', color: 'bg-rose-100' },
]

interface ShiftTemplatesProps {
  selectedShift?: ShiftTemplate
  onSelectShift: (shift: ShiftTemplate) => void
}

export function ShiftTemplates({ selectedShift, onSelectShift }: ShiftTemplatesProps) {
  const [templates, setTemplates] = useState<ShiftTemplate[]>(DEFAULT_SHIFTS)
  const [newShiftName, setNewShiftName] = useState('')
  const [newStartTime, setNewStartTime] = useState('08:00')
  const [newEndTime, setNewEndTime] = useState('17:00')
  const [dialogOpen, setDialogOpen] = useState(false)

  const handleAddTemplate = () => {
    if (!newShiftName.trim()) {
      toast.error('Nome do turno é obrigatório')
      return
    }

    const newTemplate: ShiftTemplate = {
      id: Date.now().toString(),
      name: newShiftName,
      startTime: newStartTime,
      endTime: newEndTime,
      color: 'bg-gray-100',
    }

    setTemplates([...templates, newTemplate])
    toast.success('Turno personalizado criado!')
    setNewShiftName('')
    setNewStartTime('08:00')
    setNewEndTime('17:00')
    setDialogOpen(false)
  }

  const handleDeleteTemplate = (id: string) => {
    // Não permitir deletar templates padrão
    if (DEFAULT_SHIFTS.find((s) => s.id === id)) {
      toast.error('Não é possível deletar turnos padrão')
      return
    }

    setTemplates(templates.filter((t) => t.id !== id))
    toast.success('Turno removido')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Modelos de Turnos
        </CardTitle>
        <CardDescription>
          Clique em um turno para selecioná-lo. Você pode criar turnos personalizados.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Selecione um turno padrão ou crie um personalizado. Ele será aplicado aos dias que você escolher.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {templates.map((shift) => (
            <div key={shift.id} className="relative">
              <button
                onClick={() => onSelectShift(shift)}
                className={`w-full p-3 rounded-lg border-2 transition-all text-sm font-medium ${
                  selectedShift?.id === shift.id
                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                    : 'border-gray-200 hover:border-gray-300'
                } ${shift.color}`}
              >
                <div className="font-semibold text-xs">{shift.name}</div>
                <div className="text-xs text-gray-700 mt-1">
                  {shift.startTime} - {shift.endTime}
                </div>
              </button>

              {/* Delete button for custom templates */}
              {!DEFAULT_SHIFTS.find((s) => s.id === shift.id) && (
                <button
                  onClick={() => handleDeleteTemplate(shift.id)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  title="Remover turno"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}

          {/* Add new template button */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <button className="w-full p-3 rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400 transition-all flex flex-col items-center justify-center gap-1 text-sm text-gray-600 hover:text-gray-700">
                <Plus className="h-4 w-4" />
                Novo Turno
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Turno Personalizado</DialogTitle>
                <DialogDescription>
                  Defina um novo modelo de turno com seus horários padrão
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="shift-name">Nome do Turno</Label>
                  <Input
                    id="shift-name"
                    placeholder="Ex: 7-13 (Manhã)"
                    value={newShiftName}
                    onChange={(e) => setNewShiftName(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start-time">Início</Label>
                    <Input
                      id="start-time"
                      type="time"
                      value={newStartTime}
                      onChange={(e) => setNewStartTime(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end-time">Fim</Label>
                    <Input
                      id="end-time"
                      type="time"
                      value={newEndTime}
                      onChange={(e) => setNewEndTime(e.target.value)}
                    />
                  </div>
                </div>
                <Button onClick={handleAddTemplate} className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Turno
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {selectedShift && (
          <Alert className="bg-blue-50 border-blue-200">
            <Clock className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-900">
              <strong>Turno selecionado:</strong> {selectedShift.name} ({selectedShift.startTime} - {selectedShift.endTime})
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
