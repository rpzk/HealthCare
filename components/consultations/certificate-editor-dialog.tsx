"use client"

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FileCheck } from 'lucide-react'

interface CertificateEditorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  certificate?: {
    id?: string
    type: string
    description: string
    days?: number
  }
  onSave: (certificate: {
    id?: string
    type: string
    description: string
    days?: number
  }) => void
}

const CERTIFICATE_TYPES = [
  { value: 'COMPARECIMENTO', label: 'Atestado de Comparecimento' },
  { value: 'MEDICAL_LEAVE', label: 'Atestado Médico (Afastamento)' },
  { value: 'HEALTH_CERTIFICATE', label: 'Atestado de Saúde' },
  { value: 'FITNESS', label: 'Aptidão Física' },
  { value: 'OTHER', label: 'Outro' },
]

export function CertificateEditorDialog({ 
  open, 
  onOpenChange, 
  certificate, 
  onSave 
}: CertificateEditorDialogProps) {
  const [formData, setFormData] = useState({
    type: 'COMPARECIMENTO',
    description: '',
    days: 1,
  })

  useEffect(() => {
    if (certificate) {
      setFormData({
        type: certificate.type || 'COMPARECIMENTO',
        description: certificate.description || '',
        days: certificate.days || 1,
      })
    } else {
      setFormData({
        type: 'COMPARECIMENTO',
        description: '',
        days: 1,
      })
    }
  }, [certificate, open])

  const handleSave = () => {
    if (!formData.description) {
      return
    }
    
    onSave({
      id: certificate?.id,
      ...formData
    })
    
    onOpenChange(false)
  }

  const requiresDays = formData.type === 'MEDICAL_LEAVE'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5" />
            {certificate?.id ? 'Editar Atestado' : 'Novo Atestado'}
          </DialogTitle>
          <DialogDescription>
            Emita atestados médicos para o paciente
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Tipo de Atestado */}
          <div className="space-y-2">
            <Label htmlFor="type">
              Tipo de Atestado <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
            >
              <SelectTrigger id="type">
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {CERTIFICATE_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Dias de Afastamento (se aplicável) */}
          {requiresDays && (
            <div className="space-y-2">
              <Label htmlFor="days">
                Dias de Afastamento <span className="text-destructive">*</span>
              </Label>
              <Input
                id="days"
                type="number"
                min="1"
                max="90"
                value={formData.days}
                onChange={(e) => setFormData(prev => ({ ...prev, days: parseInt(e.target.value) || 1 }))}
                required
              />
              <p className="text-xs text-muted-foreground">
                Para afastamentos superiores a 15 dias, consultar legislação trabalhista
              </p>
            </div>
          )}

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="description">
              {requiresDays ? 'Observações' : 'Descrição'} <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder={
                requiresDays 
                  ? "Motivo do afastamento, recomendações médicas..." 
                  : "Descrição do atestado, finalidade..."
              }
              className="min-h-[100px]"
              required
            />
          </div>

          {/* Sugestões rápidas baseadas no tipo */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Sugestões:</Label>
            <div className="flex flex-wrap gap-1">
              {formData.type === 'COMPARECIMENTO' && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => setFormData(prev => ({ ...prev, description: 'Paciente compareceu à consulta médica nesta data.' }))}
                  >
                    Comparecimento padrão
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => setFormData(prev => ({ ...prev, description: 'Paciente esteve em consulta e realizou exames nesta unidade.' }))}
                  >
                    Consulta + exames
                  </Button>
                </>
              )}
              {formData.type === 'MEDICAL_LEAVE' && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => setFormData(prev => ({ ...prev, description: 'Necessário afastamento das atividades laborais para recuperação.' }))}
                  >
                    Afastamento para recuperação
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => setFormData(prev => ({ ...prev, description: 'Recomendado repouso domiciliar durante o período indicado.' }))}
                  >
                    Repouso domiciliar
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!formData.description}
          >
            {certificate?.id ? 'Salvar Alterações' : 'Adicionar Atestado'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
