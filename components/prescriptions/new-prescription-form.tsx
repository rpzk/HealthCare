'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { MedicationAutocomplete } from '@/components/consultations/medication-autocomplete'
import { PatientAutocomplete } from '@/components/prescriptions/patient-autocomplete'
import { FormulaAutocomplete } from '@/components/prescriptions/formula-autocomplete'
import { Pill, FlaskConical, Plus, Trash2, AlertCircle } from 'lucide-react'

// Tipo que vem do MedicationAutocomplete
type MedicationSuggestion = {
  id: string
  name: string
  displayName: string
  form: string
  defaultDosage: string
  defaultFrequency: string
  defaultDuration: number
  unit: string
}

// Tipo que vem do PatientAutocomplete
type PatientSuggestion = {
  id: string
  name: string
  email: string
  phone?: string
  birthDate?: string
  age?: number
  riskLevel?: string
}

type MedicationItem = {
  id?: string
  name: string
  dosage: string
  frequency: string
  duration: string
  instructions?: string
  type: 'medication' | 'formula' | 'custom'
  sourceId?: string // ID do medicamento ou fórmula original
  category?: string
  form?: string
  contraindications?: string
}

export default function NewPrescriptionForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [certPassword, setCertPassword] = useState('')
  const [pendingPrescriptionId, setPendingPrescriptionId] = useState<string | null>(null)
  const [signing, setSigning] = useState(false)
  const [patientId, setPatientId] = useState('')
  const [patientSearchText, setPatientSearchText] = useState('')
  const [notes, setNotes] = useState('')
  const [medications, setMedications] = useState<MedicationItem[]>([])
  const [activeTab, setActiveTab] = useState<'medication' | 'formula' | 'custom'>('medication')
  
  // Estado para o autocomplete de medicamentos
  const [medicationSearch, setMedicationSearch] = useState('')

  // Quando paciente é selecionado
  const handlePatientSelect = (patient: PatientSuggestion) => {
    setPatientId(patient.id)
    setPatientSearchText(`${patient.name} (${patient.email})`)
  }

  // Adiciona medicamento do catálogo com valores DEFAULT
  const addFromMedication = (med: MedicationSuggestion) => {
    // Preparar valores defaults melhorados
    let frequency = med.defaultFrequency || ''
    let duration = med.defaultDuration ? `${med.defaultDuration} dias` : ''
    
    // Se não houver frequência padrão, usar 1x ao dia
    if (!frequency) {
      frequency = '1x ao dia'
    }
    // Se a frequência for um número, converter para "Nx ao dia"
    if (/^\d+$/.test(frequency)) {
      frequency = `${frequency}x ao dia`
    }
    
    // Se não houver duração padrão, usar 7 dias
    if (!duration) {
      duration = '7 dias'
    }

    setMedications(prev => [...prev, {
      name: med.displayName || med.name,
      dosage: med.defaultDosage || '',
      frequency: frequency,
      duration: duration,
      instructions: '',
      type: 'medication',
      sourceId: med.id,
      form: med.form || undefined,
    }])
    setMedicationSearch('')
  }

  // Adiciona fórmula magistral
  const addFromFormula = (formula: {
    id: string
    name: string
    category: string
    ingredients: string
    form: string
    dosage: string
    contraindications: string | null
  }) => {
    setMedications(prev => [...prev, {
      name: formula.name,
      dosage: formula.ingredients,
      frequency: formula.dosage, // A posologia vem como "frequência"
      duration: '',
      instructions: `Fórmula magistral - ${formula.form}`,
      type: 'formula',
      sourceId: formula.id,
      category: formula.category,
      form: formula.form,
      contraindications: formula.contraindications || undefined,
    }])
  }

  // Adiciona item personalizado
  const addCustomItem = () => {
    setMedications(prev => [...prev, {
      name: '',
      dosage: '',
      frequency: '',
      duration: '',
      type: 'custom',
    }])
  }

  // Atualiza um item
  const updateMedication = (idx: number, patch: Partial<MedicationItem>) => {
    setMedications(prev => prev.map((m, i) => i === idx ? { ...m, ...patch } : m))
  }

  // Remove um item
  const removeMedication = (idx: number) => {
    setMedications(prev => prev.filter((_, i) => i !== idx))
  }

  // Submete o formulário
  // Checa se usuário tem certificado digital ativo
  const checkUserCertificate = async () => {
    const res = await fetch('/api/user/certificate')
    if (!res.ok) return false
    const json = await res.json()
    return !!json?.hasCertificate
  }

  const signPrescription = async (prescriptionId: string, password: string) => {
    setSigning(true)
    try {
      const res = await fetch(`/api/prescriptions/${prescriptionId}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Falha ao assinar prescrição')
      setShowPasswordDialog(false)
      setCertPassword('')
      setPendingPrescriptionId(null)
      router.push('/prescriptions')
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setSigning(false)
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (medications.length === 0) {
      alert('Adicione pelo menos um medicamento à prescrição')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/prescriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          patientId, 
          medications: medications.map(m => ({
            name: m.name,
            dosage: m.dosage,
            frequency: m.frequency,
            duration: m.duration,
            instructions: m.instructions,
            medicationId: m.type === 'medication' ? m.sourceId : undefined,
          })),
          notes 
        })
      })
      if (!res.ok) throw new Error('Falha ao criar prescrição')
      const created = await res.json()
      // Checa se usuário tem certificado digital
      const hasCert = await checkUserCertificate()
      if (hasCert && created?.id) {
        setPendingPrescriptionId(created.id)
        setShowPasswordDialog(true)
      } else {
        router.push('/prescriptions')
      }
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  // Badge de tipo
  const getTypeBadge = (type: MedicationItem['type']) => {
    switch (type) {
      case 'medication':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700"><Pill className="h-3 w-3 mr-1" />Medicamento</Badge>
      case 'formula':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700"><FlaskConical className="h-3 w-3 mr-1" />Fórmula</Badge>
      default:
        return <Badge variant="outline">Personalizado</Badge>
    }
  }

  return (
    <>
    <form onSubmit={submit} className="space-y-6">
      {/* Dados do Paciente */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Paciente *</label>
          <PatientAutocomplete 
            value={patientSearchText} 
            onChange={setPatientSearchText}
            onSelect={handlePatientSelect}
            placeholder="Buscar paciente por nome ou email..."
            required
          />
          {patientId && (
            <p className="text-xs text-muted-foreground mt-1">ID: {patientId}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Observações Gerais</label>
          <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observações sobre a prescrição" />
        </div>
      </div>

      {/* Adicionar Itens */}
      <div className="border rounded-lg p-4 bg-muted/30">
        <h4 className="font-medium mb-3">Adicionar à Prescrição</h4>
        
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="medication" className="flex items-center gap-1">
              <Pill className="h-4 w-4" />
              Medicamento
            </TabsTrigger>
            <TabsTrigger value="formula" className="flex items-center gap-1">
              <FlaskConical className="h-4 w-4" />
              Fórmula Magistral
            </TabsTrigger>
            <TabsTrigger value="custom" className="flex items-center gap-1">
              <Plus className="h-4 w-4" />
              Personalizado
            </TabsTrigger>
          </TabsList>

          <TabsContent value="medication" className="mt-3">
            <MedicationAutocomplete
              value={medicationSearch}
              onChange={setMedicationSearch}
              onSelect={addFromMedication}
              placeholder="Buscar medicamento por nome..."
            />
            <p className="text-xs text-muted-foreground mt-2">
              Busque medicamentos do catálogo por nome, princípio ativo ou código SUS
            </p>
          </TabsContent>

          <TabsContent value="formula" className="mt-3">
            <FormulaAutocomplete onSelect={addFromFormula} />
            <p className="text-xs text-muted-foreground mt-2">
              Busque fórmulas magistrais por nome, ingrediente ou categoria
            </p>
          </TabsContent>

          <TabsContent value="custom" className="mt-3">
            <Button type="button" variant="outline" onClick={addCustomItem} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Item Personalizado
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              Para medicamentos ou fórmulas não cadastrados no sistema
            </p>
          </TabsContent>
        </Tabs>
      </div>

      {/* Lista de Itens */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-medium">Itens da Prescrição ({medications.length})</h4>
        </div>

        {medications.length === 0 ? (
          <div className="border rounded-lg p-8 text-center text-muted-foreground">
            <Pill className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Nenhum item adicionado</p>
            <p className="text-sm">Use as abas acima para adicionar medicamentos ou fórmulas</p>
          </div>
        ) : (
          <div className="space-y-3">
            {medications.map((m, idx) => (
              <div key={idx} className="border rounded-lg p-4 bg-background">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    {getTypeBadge(m.type)}
                    {m.category && (
                      <Badge variant="secondary" className="text-xs">{m.category}</Badge>
                    )}
                  </div>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm"
                    onClick={() => removeMedication(idx)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* Alerta de contraindicações */}
                {m.contraindications && (
                  <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700 flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span><strong>Contraindicações:</strong> {m.contraindications}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Nome *</label>
                    <Input 
                      value={m.name} 
                      onChange={e => updateMedication(idx, { name: e.target.value })} 
                      required 
                      disabled={m.type !== 'custom'}
                      className={m.type !== 'custom' ? 'bg-muted' : ''}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Dosagem *</label>
                    <Input 
                      value={m.dosage} 
                      onChange={e => updateMedication(idx, { dosage: e.target.value })} 
                      required 
                      placeholder="Ex: 500mg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Frequência *</label>
                    <Input 
                      value={m.frequency} 
                      onChange={e => updateMedication(idx, { frequency: e.target.value })} 
                      required 
                      placeholder="Ex: 8/8h"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Duração *</label>
                    <Input 
                      value={m.duration} 
                      onChange={e => updateMedication(idx, { duration: e.target.value })} 
                      required 
                      placeholder="Ex: 7 dias"
                    />
                  </div>
                </div>

                <div className="mt-3">
                  <label className="block text-xs text-muted-foreground mb-1">Instruções</label>
                  <Textarea 
                    value={m.instructions || ''} 
                    onChange={e => updateMedication(idx, { instructions: e.target.value })}
                    placeholder="Instruções especiais de uso..."
                    rows={2}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ações */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading || medications.length === 0}>
          {loading ? 'Salvando...' : 'Salvar Prescrição'}
        </Button>
      </div>
    </form>
    {/* Modal de senha para assinatura automática */}
    <Dialog open={showPasswordDialog} onOpenChange={v => { if (!v) setShowPasswordDialog(false) }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assinar Prescrição</DialogTitle>
          <DialogDescription>Digite a senha do seu certificado digital para assinar a prescrição automaticamente.</DialogDescription>
        </DialogHeader>
        <Input
          type="password"
          placeholder="Senha do certificado"
          value={certPassword}
          onChange={e => setCertPassword(e.target.value)}
          disabled={signing}
        />
        <Button onClick={() => pendingPrescriptionId && signPrescription(pendingPrescriptionId, certPassword)} disabled={signing || !certPassword}>
          {signing ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Assinando...</>) : 'Assinar e Finalizar'}
        </Button>
      </DialogContent>
    </Dialog>
    </>
  )
}
