"use client"

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Pill, AlertCircle } from 'lucide-react'

interface PrescriptionEditorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  prescription?: {
    id?: string
    medication: string
    dosage: string
    frequency: string
    duration: string
    instructions: string
    form?: string
    route?: string
    quantity?: string
    controlled?: boolean
  }
  onSave: (prescription: {
    id?: string
    medication: string
    dosage: string
    frequency: string
    duration: string
    instructions: string
    form?: string
    route?: string
    quantity?: string
    controlled?: boolean
  }) => void
}

const PHARMACEUTICAL_FORMS = [
  { value: 'COMPRIMIDO', label: 'Comprimido' },
  { value: 'CAPSULA', label: 'Cápsula' },
  { value: 'SOLUCAO_ORAL', label: 'Solução oral' },
  { value: 'SUSPENSAO', label: 'Suspensão' },
  { value: 'XAROPE', label: 'Xarope' },
  { value: 'GOTAS', label: 'Gotas' },
  { value: 'AMPOLA', label: 'Ampola' },
  { value: 'POMADA', label: 'Pomada' },
  { value: 'CREME', label: 'Creme' },
  { value: 'GEL', label: 'Gel' },
  { value: 'SPRAY', label: 'Spray' },
  { value: 'INALACAO', label: 'Inalação' },
  { value: 'ADESIVO', label: 'Adesivo' },
  { value: 'SUPOSITORIO', label: 'Supositório' },
  { value: 'OUTRO', label: 'Outro' },
]

const ROUTES = [
  { value: 'ORAL', label: 'Oral' },
  { value: 'SUBLINGUAL', label: 'Sublingual' },
  { value: 'TOPICA', label: 'Tópica' },
  { value: 'INTRAVENOSA', label: 'Intravenosa (IV)' },
  { value: 'INTRAMUSCULAR', label: 'Intramuscular (IM)' },
  { value: 'SUBCUTANEA', label: 'Subcutânea (SC)' },
  { value: 'INALATORIA', label: 'Inalatória' },
  { value: 'OCULAR', label: 'Ocular' },
  { value: 'NASAL', label: 'Nasal' },
  { value: 'RETAL', label: 'Retal' },
  { value: 'VAGINAL', label: 'Vaginal' },
  { value: 'OUTRA', label: 'Outra' },
]

const FREQUENCY_PRESETS = [
  '1x ao dia (24/24h)',
  '2x ao dia (12/12h)',
  '3x ao dia (8/8h)',
  '4x ao dia (6/6h)',
  'A cada 4 horas',
  'Se necessário (SOS)',
  'Ao deitar',
  'Pela manhã',
  'Antes das refeições',
  'Após as refeições',
  'Em jejum',
]

const DURATION_PRESETS = [
  '3 dias',
  '5 dias',
  '7 dias',
  '10 dias',
  '14 dias',
  '21 dias',
  '30 dias',
  'Uso contínuo',
]

export function PrescriptionEditorDialog({ 
  open, 
  onOpenChange, 
  prescription, 
  onSave 
}: PrescriptionEditorDialogProps) {
  const [formData, setFormData] = useState({
    medication: '',
    dosage: '',
    frequency: '',
    duration: '',
    instructions: '',
    form: '',
    route: 'ORAL',
    quantity: '',
    controlled: false,
  })

  useEffect(() => {
    if (prescription) {
      setFormData({
        medication: prescription.medication || '',
        dosage: prescription.dosage || '',
        frequency: prescription.frequency || '',
        duration: prescription.duration || '',
        instructions: prescription.instructions || '',
        form: prescription.form || '',
        route: prescription.route || 'ORAL',
        quantity: prescription.quantity || '',
        controlled: prescription.controlled || false,
      })
    } else {
      setFormData({
        medication: '',
        dosage: '',
        frequency: '',
        duration: '',
        instructions: '',
        form: '',
        route: 'ORAL',
        quantity: '',
        controlled: false,
      })
    }
  }, [prescription, open])

  const handleSave = () => {
    if (!formData.medication || !formData.dosage || !formData.frequency || !formData.duration) {
      return
    }
    
    onSave({
      id: prescription?.id,
      ...formData
    })
    
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pill className="h-5 w-5" />
            {prescription?.id ? 'Editar Prescrição' : 'Nova Prescrição'}
          </DialogTitle>
          <DialogDescription>
            Preencha os detalhes completos da prescrição médica
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Medicamento */}
          <div className="space-y-2">
            <Label htmlFor="medication">
              Medicamento <span className="text-destructive">*</span>
            </Label>
            <Input
              id="medication"
              value={formData.medication}
              onChange={(e) => setFormData(prev => ({ ...prev, medication: e.target.value }))}
              placeholder="Nome do medicamento"
              required
            />
          </div>

          {/* Forma Farmacêutica e Via */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="form">Forma Farmacêutica</Label>
              <Select
                value={formData.form}
                onValueChange={(value) => setFormData(prev => ({ ...prev, form: value }))}
              >
                <SelectTrigger id="form">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {PHARMACEUTICAL_FORMS.map((form) => (
                    <SelectItem key={form.value} value={form.value}>
                      {form.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="route">Via de Administração</Label>
              <Select
                value={formData.route}
                onValueChange={(value) => setFormData(prev => ({ ...prev, route: value }))}
              >
                <SelectTrigger id="route">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {ROUTES.map((route) => (
                    <SelectItem key={route.value} value={route.value}>
                      {route.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Dosagem e Quantidade */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dosage">
                Dosagem <span className="text-destructive">*</span>
              </Label>
              <Input
                id="dosage"
                value={formData.dosage}
                onChange={(e) => setFormData(prev => ({ ...prev, dosage: e.target.value }))}
                placeholder="Ex: 500mg, 10ml, 1 comprimido"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">Quantidade Total</Label>
              <Input
                id="quantity"
                value={formData.quantity}
                onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                placeholder="Ex: 30 comprimidos, 100ml"
              />
            </div>
          </div>

          {/* Frequência */}
          <div className="space-y-2">
            <Label htmlFor="frequency">
              Frequência <span className="text-destructive">*</span>
            </Label>
            <Input
              id="frequency"
              value={formData.frequency}
              onChange={(e) => setFormData(prev => ({ ...prev, frequency: e.target.value }))}
              placeholder="Ex: 2x ao dia, 8/8h"
              required
            />
            <div className="flex flex-wrap gap-1 mt-2">
              {FREQUENCY_PRESETS.map((preset) => (
                <Button
                  key={preset}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => setFormData(prev => ({ ...prev, frequency: preset }))}
                >
                  {preset}
                </Button>
              ))}
            </div>
          </div>

          {/* Duração */}
          <div className="space-y-2">
            <Label htmlFor="duration">
              Duração do Tratamento <span className="text-destructive">*</span>
            </Label>
            <Input
              id="duration"
              value={formData.duration}
              onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
              placeholder="Ex: 7 dias, 1 mês"
              required
            />
            <div className="flex flex-wrap gap-1 mt-2">
              {DURATION_PRESETS.map((preset) => (
                <Button
                  key={preset}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => setFormData(prev => ({ ...prev, duration: preset }))}
                >
                  {preset}
                </Button>
              ))}
            </div>
          </div>

          {/* Instruções */}
          <div className="space-y-2">
            <Label htmlFor="instructions">Instruções Adicionais</Label>
            <Textarea
              id="instructions"
              value={formData.instructions}
              onChange={(e) => setFormData(prev => ({ ...prev, instructions: e.target.value }))}
              placeholder="Instruções especiais: tomar com alimentos, evitar álcool, etc."
              className="min-h-[80px]"
            />
          </div>

          {/* Alertas */}
          {formData.controlled && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-amber-800 dark:text-amber-200">
                <p className="font-medium">Medicamento controlado</p>
                <p className="text-muted-foreground">
                  Receituário especial obrigatório conforme legislação vigente
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!formData.medication || !formData.dosage || !formData.frequency || !formData.duration}
          >
            {prescription?.id ? 'Salvar Alterações' : 'Adicionar Prescrição'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
