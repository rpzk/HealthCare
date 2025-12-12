"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Save, Loader2 } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface ProtocolCreatorProps {
  prescriptions: Array<{
    medication: string
    dosage: string
    frequency: string
    duration: string
    instructions?: string
  }>
  exams: Array<{
    examType: string
    description: string
    priority: string
    notes?: string
  }>
  referrals: Array<{
    specialty: string
    description: string
    priority: string
    notes?: string
  }>
  diagnoses?: Array<{
    code: string
    description: string
  }>
  onSuccess?: () => void
  triggerClassName?: string
}

const CATEGORIES = [
  { value: 'HYPERTENSION', label: 'Hipertensão' },
  { value: 'DIABETES', label: 'Diabetes' },
  { value: 'PRENATAL', label: 'Pré-natal' },
  { value: 'CHILDCARE', label: 'Puericultura' },
  { value: 'MENTAL_HEALTH', label: 'Saúde Mental' },
  { value: 'RESPIRATORY', label: 'Doenças Respiratórias' },
  { value: 'INFECTIOUS', label: 'Doenças Infecciosas' },
  { value: 'CHRONIC', label: 'Doenças Crônicas' },
  { value: 'PREVENTIVE', label: 'Medicina Preventiva' },
  { value: 'EMERGENCY', label: 'Urgência/Emergência' },
  { value: 'CUSTOM', label: 'Personalizado' }
]

export function ProtocolCreator({
  prescriptions,
  exams,
  referrals,
  diagnoses = [],
  onSuccess,
  triggerClassName
}: ProtocolCreatorProps) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '',
    description: '',
    category: 'CUSTOM',
    isPublic: false,
    tags: ''
  })

  const hasContent = prescriptions.length > 0 || exams.length > 0 || referrals.length > 0

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Informe um nome para o protocolo",
        variant: "destructive"
      })
      return
    }

    if (!hasContent) {
      toast({
        title: "Conteúdo vazio",
        description: "Adicione pelo menos uma prescrição, exame ou encaminhamento",
        variant: "destructive"
      })
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/protocols', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          category: form.category,
          isPublic: form.isPublic,
          tags: form.tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean),
          prescriptions: prescriptions.map(rx => ({
            medicationName: rx.medication,
            dosage: rx.dosage,
            frequency: rx.frequency,
            duration: rx.duration,
            instructions: rx.instructions
          })),
          exams: exams.map(exam => ({
            examName: exam.examType,
            description: exam.description,
            priority: exam.priority,
            notes: exam.notes
          })),
          referrals: referrals.map(ref => ({
            specialty: ref.specialty,
            description: ref.description,
            priority: ref.priority,
            notes: ref.notes
          })),
          diagnoses: diagnoses.map(diag => ({
            cidCode: diag.code,
            description: diag.description
          }))
        })
      })

      if (res.ok) {
        toast({
          title: "Protocolo salvo",
          description: `"${form.name}" foi salvo com sucesso`
        })
        setOpen(false)
        setForm({
          name: '',
          description: '',
          category: 'CUSTOM',
          isPublic: false,
          tags: ''
        })
        onSuccess?.()
      } else {
        const err = await res.json()
        throw new Error(err.error || 'Erro ao salvar protocolo')
      }
    } catch (error: unknown) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : String(error) || "Não foi possível salvar o protocolo",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          disabled={!hasContent}
          className={triggerClassName}
        >
          <Save className="h-4 w-4 mr-2" />
          Salvar como Protocolo
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Salvar Protocolo</DialogTitle>
          <DialogDescription>
            Salve a configuração atual como um protocolo para reutilizar em outras consultas
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Protocolo *</Label>
            <Input
              id="name"
              placeholder="Ex: Hipertensão - Tratamento Inicial"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              placeholder="Descreva quando usar este protocolo..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select
              value={form.category}
              onValueChange={(value) => setForm({ ...form, category: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags (separadas por vírgula)</Label>
            <Input
              id="tags"
              placeholder="Ex: adulto, inicial, leve"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="public"
              checked={form.isPublic}
              onCheckedChange={(checked) => setForm({ ...form, isPublic: checked })}
            />
            <Label htmlFor="public" className="cursor-pointer">
              Compartilhar com outros médicos
            </Label>
          </div>

          {/* Resumo do conteúdo */}
          <div className="bg-muted rounded-lg p-3 text-sm">
            <p className="font-medium mb-2">Conteúdo do protocolo:</p>
            <ul className="space-y-1 text-muted-foreground">
              {prescriptions.length > 0 && (
                <li>• {prescriptions.length} prescrição(ões)</li>
              )}
              {exams.length > 0 && (
                <li>• {exams.length} exame(s)</li>
              )}
              {referrals.length > 0 && (
                <li>• {referrals.length} encaminhamento(s)</li>
              )}
              {diagnoses.length > 0 && (
                <li>• {diagnoses.length} diagnóstico(s) CID</li>
              )}
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Salvar Protocolo
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
