"use client"

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Send } from 'lucide-react'

interface ReferralEditorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  referral?: {
    id?: string
    specialty: string
    description: string
    priority: 'NORMAL' | 'HIGH'
  }
  onSave: (referral: {
    id?: string
    specialty: string
    description: string
    priority: 'NORMAL' | 'HIGH'
  }) => void
}

const SPECIALTIES = [
  'Cardiologia',
  'Dermatologia',
  'Endocrinologia',
  'Gastroenterologia',
  'Ginecologia',
  'Neurologia',
  'Oftalmologia',
  'Ortopedia',
  'Otorrinolaringologia',
  'Pediatria',
  'Psiquiatria',
  'Urologia',
  'Cirurgia Geral',
  'Clínica Geral',
  'Fisioterapia',
  'Nutrição',
  'Psicologia',
  'Fonoaudiologia',
]

export function ReferralEditorDialog({ 
  open, 
  onOpenChange, 
  referral, 
  onSave 
}: ReferralEditorDialogProps) {
  const [formData, setFormData] = useState({
    specialty: '',
    description: '',
    priority: 'NORMAL' as 'NORMAL' | 'HIGH',
  })

  useEffect(() => {
    if (referral) {
      setFormData({
        specialty: referral.specialty || '',
        description: referral.description || '',
        priority: referral.priority || 'NORMAL',
      })
    } else {
      setFormData({
        specialty: '',
        description: '',
        priority: 'NORMAL',
      })
    }
  }, [referral, open])

  const handleSave = () => {
    if (!formData.specialty || !formData.description) {
      return
    }
    
    onSave({
      id: referral?.id,
      ...formData
    })
    
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            {referral?.id ? 'Editar Encaminhamento' : 'Novo Encaminhamento'}
          </DialogTitle>
          <DialogDescription>
            Encaminhe o paciente para outro profissional ou especialidade
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Especialidade */}
          <div className="space-y-2">
            <Label htmlFor="specialty">
              Especialidade <span className="text-destructive">*</span>
            </Label>
            <Input
              id="specialty"
              value={formData.specialty}
              onChange={(e) => setFormData(prev => ({ ...prev, specialty: e.target.value }))}
              placeholder="Digite a especialidade"
              required
              list="specialties"
            />
            <datalist id="specialties">
              {SPECIALTIES.map((spec) => (
                <option key={spec} value={spec} />
              ))}
            </datalist>
            
            {/* Botões de sugestão */}
            <div className="flex flex-wrap gap-1 mt-2">
              {SPECIALTIES.slice(0, 8).map((spec) => (
                <Button
                  key={spec}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => setFormData(prev => ({ ...prev, specialty: spec }))}
                >
                  {spec}
                </Button>
              ))}
            </div>
          </div>

          {/* Motivo */}
          <div className="space-y-2">
            <Label htmlFor="description">
              Motivo do Encaminhamento <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Descreva o motivo do encaminhamento, achados relevantes, conduta já realizada..."
              className="min-h-[100px]"
              required
            />
          </div>

          {/* Prioridade */}
          <div className="space-y-2">
            <Label htmlFor="priority">Prioridade</Label>
            <Select
              value={formData.priority}
              onValueChange={(value: string) => setFormData(prev => ({ ...prev, priority: value as 'NORMAL' | 'HIGH' }))}
            >
              <SelectTrigger id="priority">
                <SelectValue placeholder="Selecione a prioridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NORMAL">Normal</SelectItem>
                <SelectItem value="HIGH">Urgente</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!formData.specialty || !formData.description}
          >
            {referral?.id ? 'Salvar Alterações' : 'Adicionar Encaminhamento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
