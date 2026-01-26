"use client"

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FlaskConical, AlertCircle } from 'lucide-react'

interface ExamEditorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  exam?: {
    id?: string
    examType: string
    description: string
    priority: 'NORMAL' | 'HIGH'
    indication?: string
    notes?: string
    category?: string
  }
  onSave: (exam: {
    id?: string
    examType: string
    description: string
    priority: 'NORMAL' | 'HIGH'
    indication?: string
    notes?: string
    category?: string
  }) => void
}

const EXAM_CATEGORIES = [
  { value: 'LABORATORY', label: 'Laboratorial' },
  { value: 'IMAGE', label: 'Imagem' },
  { value: 'CARDIOLOGY', label: 'Cardiologia' },
  { value: 'NEUROLOGY', label: 'Neurologia' },
  { value: 'ENDOSCOPY', label: 'Endoscopia' },
  { value: 'PATHOLOGY', label: 'Anatomia Patológica' },
  { value: 'FUNCTIONAL', label: 'Funcional' },
  { value: 'OTHER', label: 'Outro' },
]

const LABORATORY_EXAMS = [
  'Hemograma completo',
  'Glicemia de jejum',
  'Hemoglobina glicada (HbA1c)',
  'Colesterol total e frações',
  'Triglicerídeos',
  'Creatinina',
  'Ureia',
  'TGO / TGP',
  'TSH',
  'T4 livre',
  'Vitamina D',
  'Vitamina B12',
  'Ácido úrico',
  'Ferritina',
  'PCR (Proteína C Reativa)',
  'VHS',
  'Sumário de urina (EAS)',
  'Urocultura',
]

const IMAGE_EXAMS = [
  'Raio-X de tórax',
  'Raio-X de abdome',
  'Ultrassonografia abdominal',
  'Ultrassonografia transvaginal',
  'Ultrassonografia de tireoide',
  'Tomografia computadorizada',
  'Ressonância magnética',
  'Mamografia',
  'Densitometria óssea',
  'Ecocardiograma',
]

const CARDIOLOGY_EXAMS = [
  'Eletrocardiograma (ECG)',
  'Teste ergométrico',
  'Holter 24h',
  'MAPA (Monitorização ambulatorial da pressão)',
  'Ecocardiograma',
  'Cintilografia miocárdica',
]

export function ExamEditorDialog({ 
  open, 
  onOpenChange, 
  exam, 
  onSave 
}: ExamEditorDialogProps) {
  const [formData, setFormData] = useState({
    examType: '',
    description: '',
    priority: 'NORMAL' as 'NORMAL' | 'HIGH',
    indication: '',
    notes: '',
    category: 'LABORATORY',
  })

  useEffect(() => {
    if (exam) {
      setFormData({
        examType: exam.examType || '',
        description: exam.description || '',
        priority: exam.priority || 'NORMAL',
        indication: exam.indication || '',
        notes: exam.notes || '',
        category: exam.category || 'LABORATORY',
      })
    } else {
      setFormData({
        examType: '',
        description: '',
        priority: 'NORMAL',
        indication: '',
        notes: '',
        category: 'LABORATORY',
      })
    }
  }, [exam, open])

  const handleSave = () => {
    if (!formData.description) {
      return
    }
    
    onSave({
      id: exam?.id,
      ...formData,
      examType: formData.category,
    })
    
    onOpenChange(false)
  }

  const getSuggestedExams = () => {
    switch (formData.category) {
      case 'LABORATORY':
        return LABORATORY_EXAMS
      case 'IMAGE':
        return IMAGE_EXAMS
      case 'CARDIOLOGY':
        return CARDIOLOGY_EXAMS
      default:
        return []
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5" />
            {exam?.id ? 'Editar Exame' : 'Novo Exame'}
          </DialogTitle>
          <DialogDescription>
            Solicite exames com detalhes completos para melhor acompanhamento
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Categoria */}
          <div className="space-y-2">
            <Label htmlFor="category">
              Categoria <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData(prev => ({ ...prev, category: value, description: '' }))}
            >
              <SelectTrigger id="category">
                <SelectValue placeholder="Selecione a categoria" />
              </SelectTrigger>
              <SelectContent>
                {EXAM_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Exame - com sugestões */}
          <div className="space-y-2">
            <Label htmlFor="description">
              Exame Solicitado <span className="text-destructive">*</span>
            </Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Digite o nome do exame"
              required
            />
            
            {/* Sugestões baseadas na categoria */}
            {getSuggestedExams().length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-muted-foreground mb-2">Sugestões:</p>
                <div className="grid grid-cols-2 gap-1 max-h-[200px] overflow-y-auto">
                  {getSuggestedExams().map((suggestedExam) => (
                    <Button
                      key={suggestedExam}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs h-auto py-2 justify-start"
                      onClick={() => setFormData(prev => ({ ...prev, description: suggestedExam }))}
                    >
                      {suggestedExam}
                    </Button>
                  ))}
                </div>
              </div>
            )}
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

          {/* Indicação Clínica */}
          <div className="space-y-2">
            <Label htmlFor="indication">Indicação Clínica</Label>
            <Textarea
              id="indication"
              value={formData.indication}
              onChange={(e) => setFormData(prev => ({ ...prev, indication: e.target.value }))}
              placeholder="Motivo da solicitação, hipótese diagnóstica..."
              className="min-h-[60px]"
            />
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label htmlFor="notes">Observações Adicionais</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Informações adicionais, preparo necessário..."
              className="min-h-[60px]"
            />
          </div>

          {/* Alerta de urgência */}
          {formData.priority === 'HIGH' && (
            <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-red-800 dark:text-red-200">
                <p className="font-medium">Exame urgente</p>
                <p className="text-muted-foreground">
                  Este exame foi marcado como prioritário e deve ser realizado com urgência
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
            disabled={!formData.description}
          >
            {exam?.id ? 'Salvar Alterações' : 'Adicionar Exame'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
