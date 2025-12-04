"use client"

import { useEffect, useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { 
  FileText, 
  FlaskConical, 
  Send, 
  User, 
  XCircle, 
  Stethoscope,
  Plus,
  Trash2,
  Save,
  Activity,
  Mic,
  MicOff,
  Loader2,
  Sparkles,
  BookMarked,
  Keyboard,
  History,
  Video,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { useKeyboardShortcuts, CONSULTATION_SHORTCUTS } from '@/hooks/use-keyboard-shortcuts'

// Componentes de autocomplete e IA
import { MedicationAutocomplete } from './medication-autocomplete'
import { CIDAutocomplete } from './cid-autocomplete'
import { ExamAutocomplete } from './exam-autocomplete'
import { ProtocolSelector } from './protocol-selector'
import { ProtocolCreator } from './protocol-creator'
import { AISuggestions } from './ai-suggestions'
import { ConsultationBICheckboxes, defaultBIData } from './consultation-bi-checkboxes'
import { PatientHistoryPanel } from './patient-history-panel'

// ============ TIPOS ============
interface Patient {
  id: string
  name: string
  age?: number
  sex?: 'M' | 'F'
  phone?: string
  cpf?: string
}

interface Consultation {
  id: string
  scheduledDate?: string
  status?: string
  patient?: Patient
  doctor?: { id: string; name: string }
}

interface Prescription {
  id?: string
  medicationId?: string
  medication: string
  dosage: string
  frequency: string
  duration: string
  instructions: string
  controlled?: boolean
}

interface ExamRequest {
  id?: string
  examCatalogId?: string
  examType: string
  description: string
  priority: 'NORMAL' | 'HIGH'
}

interface Referral {
  id?: string
  specialty: string
  description: string
  priority: 'NORMAL' | 'HIGH'
}

interface Diagnosis {
  id?: string
  code: string
  description: string
  type: 'PRINCIPAL' | 'SECONDARY'
}

interface Certificate {
  id?: string
  type: string
  description: string
  days?: number
}

// ============ COMPONENTE PRINCIPAL ============
export function ConsultationWorkspace({ consultationId }: { consultationId: string }) {
  // Estado principal
  const [consultation, setConsultation] = useState<Consultation | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [finalizing, setFinalizing] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  // SOAP
  const [soap, setSoap] = useState({
    subjective: '',
    objective: '',
    assessment: '',
    plan: ''
  })

  // Sinais vitais
  const [vitals, setVitals] = useState({
    weight: '', height: '', bloodPressure: '',
    heartRate: '', temperature: '', saturation: ''
  })

  // Listas
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [exams, setExams] = useState<ExamRequest[]>([])
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([])
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [biData, setBIData] = useState(defaultBIData)

  // Estados dos autocompletes
  const [medSearch, setMedSearch] = useState('')
  const [examSearch, setExamSearch] = useState('')
  const [cidSearch, setCidSearch] = useState('')

  // Gravação de áudio
  const [recording, setRecording] = useState(false)
  const [processing, setProcessing] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  // UI states
  const [showHistory, setShowHistory] = useState(true)
  const [showShortcuts, setShowShortcuts] = useState(false)

  // Refs para focus
  const medInputRef = useRef<HTMLInputElement>(null)
  const examInputRef = useRef<HTMLInputElement>(null)
  const cidInputRef = useRef<HTMLInputElement>(null)

  // ============ ATALHOS DE TECLADO ============
  useKeyboardShortcuts([
    { ...CONSULTATION_SHORTCUTS.SAVE, action: () => saveAll() },
    { ...CONSULTATION_SHORTCUTS.NEW_PRESCRIPTION, action: () => medInputRef.current?.focus() },
    { ...CONSULTATION_SHORTCUTS.NEW_EXAM, action: () => examInputRef.current?.focus() },
    { ...CONSULTATION_SHORTCUTS.NEW_DIAGNOSIS, action: () => cidInputRef.current?.focus() },
    { ...CONSULTATION_SHORTCUTS.TOGGLE_RECORD, action: () => recording ? stopRecording() : startRecording() },
    { ...CONSULTATION_SHORTCUTS.HELP, action: () => setShowShortcuts(prev => !prev) },
  ])

  // ============ CARREGAR CONSULTA ============
  useEffect(() => {
    loadConsultation()
  }, [consultationId])

  const loadConsultation = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/consultations/${consultationId}`)
      if (!res.ok) throw new Error('Falha ao carregar')
      const data = await res.json()
      const consultationData = data.consultation || data
      setConsultation(consultationData)
      
      // Carregar dados SOAP salvos
      if (consultationData.notes) {
        try {
          const savedData = JSON.parse(consultationData.notes)
          if (savedData.soap) {
            setSoap({
              subjective: savedData.soap.subjective || '',
              objective: savedData.soap.objective || '',
              assessment: savedData.soap.assessment || '',
              plan: savedData.soap.plan || ''
            })
          }
          if (savedData.vitals) {
            setVitals({
              weight: savedData.vitals.weight || '',
              height: savedData.vitals.height || '',
              bloodPressure: savedData.vitals.bloodPressure || '',
              heartRate: savedData.vitals.heartRate || '',
              temperature: savedData.vitals.temperature || '',
              saturation: savedData.vitals.saturation || ''
            })
          }
          if (savedData.biData) {
            setBIData(savedData.biData)
          }
          // Carregar diagnósticos do notes JSON
          if (savedData.diagnoses && savedData.diagnoses.length > 0) {
            setDiagnoses(savedData.diagnoses.map((d: any) => ({
              id: d.id || Date.now().toString(),
              code: d.code,
              description: d.description,
              type: d.type || 'PRINCIPAL'
            })))
          }
        } catch {
          // Se não for JSON, usar campos individuais
          setSoap({
            subjective: consultationData.chiefComplaint || consultationData.history || '',
            objective: consultationData.physicalExam || '',
            assessment: consultationData.assessment || '',
            plan: consultationData.plan || ''
          })
        }
      } else {
        // Carregar dos campos individuais se notes estiver vazio
        setSoap({
          subjective: consultationData.chiefComplaint || consultationData.history || '',
          objective: consultationData.physicalExam || '',
          assessment: consultationData.assessment || '',
          plan: consultationData.plan || ''
        })
      }
      
      // Carregar diagnósticos existentes (do relacionamento, se existir)
      if (consultationData.diagnoses && consultationData.diagnoses.length > 0) {
        setDiagnoses(consultationData.diagnoses.map((d: any) => ({
          id: d.id,
          code: d.code,
          description: d.description,
          type: d.type
        })))
      }
      
      // Carregar prescrições existentes
      if (consultationData.prescriptions && consultationData.prescriptions.length > 0) {
        const loadedPrescriptions: Prescription[] = []
        for (const p of consultationData.prescriptions) {
          try {
            const meds = JSON.parse(p.medications)
            if (Array.isArray(meds)) {
              for (const med of meds) {
                loadedPrescriptions.push({
                  id: p.id + '-' + med.name,
                  medication: med.name,
                  dosage: med.dosage || '',
                  frequency: med.frequency || '',
                  duration: med.duration || '',
                  instructions: med.instructions || ''
                })
              }
            }
          } catch {
            // Se não for JSON, ignorar
          }
        }
        if (loadedPrescriptions.length > 0) {
          setPrescriptions(loadedPrescriptions)
        }
      }
      
      // Carregar exames existentes
      if (consultationData.examRequests && consultationData.examRequests.length > 0) {
        setExams(consultationData.examRequests.map((e: any) => ({
          id: e.id,
          examType: e.examType,
          description: e.description,
          priority: e.priority
        })))
      }
      
      // Carregar encaminhamentos existentes
      if (consultationData.referrals && consultationData.referrals.length > 0) {
        setReferrals(consultationData.referrals.map((r: any) => ({
          id: r.id,
          specialty: r.specialty,
          description: r.reason || r.description,
          priority: r.priority
        })))
      }
      
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  // ============ GRAVAÇÃO DE ÁUDIO ============
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      chunksRef.current = []
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = () => stream.getTracks().forEach(t => t.stop())
      mediaRecorderRef.current = mr
      mr.start()
      setRecording(true)
    } catch (e: any) {
      toast({ title: 'Erro', description: 'Não foi possível acessar o microfone', variant: 'destructive' })
    }
  }

  const stopRecording = async () => {
    const mr = mediaRecorderRef.current
    if (!mr) return
    
    setRecording(false)
    setProcessing(true)
    mr.stop()
    
    await new Promise(r => setTimeout(r, 300))
    const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
    
    try {
      const form = new FormData()
      form.append('audio', blob, `consulta-${consultationId}.webm`)
      
      const res = await fetch('/api/ai/transcribe', { method: 'POST', body: form })
      const data = await res.json()
      
      if (data.soap) {
        setSoap({
          subjective: data.soap.subjective || soap.subjective,
          objective: data.soap.objective || soap.objective,
          assessment: data.soap.assessment || soap.assessment,
          plan: data.soap.plan || soap.plan
        })
        toast({ title: 'Transcrição concluída', description: 'SOAP preenchido automaticamente' })
      }
    } catch (e: any) {
      toast({ title: 'Erro', description: 'Falha na transcrição', variant: 'destructive' })
    } finally {
      setProcessing(false)
    }
  }

  // ============ HANDLERS DE SELEÇÃO ============
  const handleMedicationSelect = (med: any) => {
    const rx: Prescription = {
      id: Date.now().toString(),
      medicationId: med.id,
      medication: med.name || med.displayName,
      dosage: med.defaultDosage || '',
      frequency: med.defaultFrequency || '',
      duration: '',
      instructions: '',
      controlled: med.prescriptionType === 'CONTROLLED'
    }
    setPrescriptions([...prescriptions, rx])
    setMedSearch('')
    toast({ title: 'Medicamento adicionado', description: med.name || med.displayName })
  }

  const handleExamSelect = (exam: any) => {
    const ex: ExamRequest = {
      id: Date.now().toString(),
      examCatalogId: exam.id,
      examType: exam.category || 'LABORATORY',
      description: exam.name,
      priority: 'NORMAL'
    }
    setExams([...exams, ex])
    setExamSearch('')
    toast({ title: 'Exame solicitado', description: exam.name })
  }

  const handleCIDSelect = (cid: any) => {
    if (diagnoses.some(d => d.code === cid.code)) return
    const diag: Diagnosis = {
      id: Date.now().toString(),
      code: cid.code,
      description: cid.description || cid.shortDescription,
      type: diagnoses.length === 0 ? 'PRINCIPAL' : 'SECONDARY'
    }
    setDiagnoses([...diagnoses, diag])
    setCidSearch('')
    setValidationErrors([]) // Clear validation errors when adding diagnosis
    toast({ title: 'Diagnóstico adicionado', description: `${cid.code} - ${diag.description}` })
  }

  // ============ PROTOCOLO E IA ============
  const handleProtocolApply = (protocol: any) => {
    if (protocol.prescriptions) {
      setPrescriptions(prev => [...prev, ...protocol.prescriptions.map((rx: any) => ({
        id: Date.now().toString() + Math.random(),
        medication: rx.medicationName || rx.medication,
        dosage: rx.dosage,
        frequency: rx.frequency,
        duration: rx.duration,
        instructions: rx.instructions
      }))])
    }
    if (protocol.exams) {
      setExams(prev => [...prev, ...protocol.exams.map((ex: any) => ({
        id: Date.now().toString() + Math.random(),
        examType: ex.category || 'LABORATORY',
        description: ex.examName || ex.description,
        priority: ex.priority || 'NORMAL'
      }))])
    }
    if (protocol.referrals) {
      setReferrals(prev => [...prev, ...protocol.referrals.map((ref: any) => ({
        id: Date.now().toString() + Math.random(),
        specialty: ref.specialty,
        description: ref.description,
        priority: ref.priority || 'NORMAL'
      }))])
    }
  }

  const handleAISuggestions = (suggestions: any) => {
    if (suggestions.prescriptions) {
      setPrescriptions(prev => [...prev, ...suggestions.prescriptions.map((rx: any) => ({
        id: Date.now().toString() + Math.random(),
        medication: rx.medication,
        dosage: rx.dosage,
        frequency: rx.frequency,
        duration: rx.duration,
        instructions: rx.instructions
      }))])
    }
    if (suggestions.exams) {
      setExams(prev => [...prev, ...suggestions.exams.map((ex: any) => ({
        id: Date.now().toString() + Math.random(),
        examType: ex.examType,
        description: ex.description,
        priority: ex.priority || 'NORMAL'
      }))])
    }
    if (suggestions.referrals) {
      setReferrals(prev => [...prev, ...suggestions.referrals.map((ref: any) => ({
        id: Date.now().toString() + Math.random(),
        specialty: ref.specialty,
        description: ref.description,
        priority: ref.priority || 'NORMAL'
      }))])
    }
  }

  // ============ ADICIONAR ENCAMINHAMENTO MANUAL ============
  const [newReferral, setNewReferral] = useState({ specialty: '', description: '', priority: 'NORMAL' as const })
  
  const addReferral = () => {
    if (!newReferral.specialty || !newReferral.description) return
    setReferrals([...referrals, { ...newReferral, id: Date.now().toString() }])
    setNewReferral({ specialty: '', description: '', priority: 'NORMAL' })
  }

  // ============ ADICIONAR ATESTADO ============
  const [newCertificate, setNewCertificate] = useState({ type: 'COMPARECIMENTO', description: '', days: 1 })
  
  const addCertificate = () => {
    if (!newCertificate.description) return
    setCertificates([...certificates, { ...newCertificate, id: Date.now().toString() }])
    setNewCertificate({ type: 'COMPARECIMENTO', description: '', days: 1 })
  }

  // ============ REPETIR PRESCRIÇÃO DO HISTÓRICO ============
  const handleRepeatPrescription = (pastPrescription: {
    medication: string
    dosage: string
    frequency: string
    duration: string
    instructions?: string
  }) => {
    const rx: Prescription = {
      id: Date.now().toString(),
      medication: pastPrescription.medication,
      dosage: pastPrescription.dosage,
      frequency: pastPrescription.frequency,
      duration: pastPrescription.duration,
      instructions: pastPrescription.instructions || ''
    }
    setPrescriptions(prev => [...prev, rx])
  }

  // ============ VALIDAR CAMPOS OBRIGATÓRIOS ============
  const validateForFinalization = (): string[] => {
    const errors: string[] = []
    
    // SOAP - pelo menos Subjetivo e Avaliação são importantes
    if (!soap.subjective.trim()) {
      errors.push('Subjetivo (S) - Queixa principal do paciente')
    }
    if (!soap.assessment.trim()) {
      errors.push('Avaliação (A) - Impressão diagnóstica')
    }
    
    // Diagnósticos - pelo menos um é esperado
    if (diagnoses.length === 0) {
      errors.push('Diagnóstico - Pelo menos um CID/CIAP')
    }
    
    return errors
  }

  // ============ SALVAR ============
  const saveAll = async () => {
    setSaving(true)
    setValidationErrors([])
    try {
      const res = await fetch(`/api/consultations/${consultationId}/complete`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: soap,
          vitals,
          prescriptions,
          examRequests: exams,
          referrals,
          diagnoses,
          certificates,
          biData
        })
      })
      if (!res.ok) throw new Error('Erro ao salvar')
      toast({ title: 'Consulta salva', description: 'Dados salvos com sucesso' })
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  // ============ FINALIZAR CONSULTA ============
  const finalizeConsultation = async () => {
    // Validar campos obrigatórios
    const errors = validateForFinalization()
    if (errors.length > 0) {
      setValidationErrors(errors)
      toast({ 
        title: 'Campos obrigatórios', 
        description: `Preencha: ${errors.join(', ')}`, 
        variant: 'destructive' 
      })
      return
    }
    
    setFinalizing(true)
    setValidationErrors([])
    
    try {
      // Primeiro salvar todos os dados
      const saveRes = await fetch(`/api/consultations/${consultationId}/complete`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: soap,
          vitals,
          prescriptions,
          examRequests: exams,
          referrals,
          diagnoses,
          certificates,
          biData
        })
      })
      if (!saveRes.ok) throw new Error('Erro ao salvar dados')
      
      // Depois finalizar a consulta mudando status
      const finalizeRes = await fetch(`/api/consultations/${consultationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'complete',
          notes: JSON.stringify(soap)
        })
      })
      
      if (!finalizeRes.ok) {
        const errorData = await finalizeRes.json()
        throw new Error(errorData.error || 'Erro ao finalizar')
      }
      
      toast({ title: 'Consulta finalizada', description: 'A consulta foi concluída com sucesso' })
      
      // Recarregar para atualizar status
      await loadConsultation()
      
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' })
    } finally {
      setFinalizing(false)
    }
  }

  // ============ CANCELAR CONSULTA ============
  const cancelConsultation = async () => {
    if (!cancelReason || cancelReason.trim().length < 3) {
      toast({ 
        title: 'Motivo obrigatório', 
        description: 'Informe o motivo do cancelamento (mínimo 3 caracteres)', 
        variant: 'destructive' 
      })
      return
    }
    
    setCancelling(true)
    
    try {
      const res = await fetch(`/api/consultations/${consultationId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason.trim() })
      })
      
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Erro ao cancelar')
      }
      
      toast({ 
        title: 'Consulta cancelada', 
        description: 'A consulta foi cancelada com sucesso' 
      })
      
      setShowCancelDialog(false)
      setCancelReason('')
      
      // Redirecionar para a lista de consultas ou recarregar
      window.location.href = '/consultations'
      
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' })
    } finally {
      setCancelling(false)
    }
  }

  // ============ LOADING/ERROR ============
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-destructive">
        <XCircle className="h-12 w-12 mb-4" />
        <p>{error}</p>
      </div>
    )
  }

  // ============ RENDER ============
  return (
    <div className="p-4 space-y-4 max-w-[1800px] mx-auto">
      {/* Modal de Atalhos */}
      {showShortcuts && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setShowShortcuts(false)}>
          <Card className="w-96" onClick={e => e.stopPropagation()}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Keyboard className="h-5 w-5" />
                Atalhos de Teclado
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm"><span>Salvar consulta</span><kbd className="px-2 py-1 bg-muted rounded text-xs">Ctrl+S</kbd></div>
              <div className="flex justify-between text-sm"><span>Nova prescrição</span><kbd className="px-2 py-1 bg-muted rounded text-xs">Ctrl+P</kbd></div>
              <div className="flex justify-between text-sm"><span>Novo exame</span><kbd className="px-2 py-1 bg-muted rounded text-xs">Ctrl+E</kbd></div>
              <div className="flex justify-between text-sm"><span>Novo diagnóstico</span><kbd className="px-2 py-1 bg-muted rounded text-xs">Ctrl+D</kbd></div>
              <div className="flex justify-between text-sm"><span>Gravar/Parar</span><kbd className="px-2 py-1 bg-muted rounded text-xs">Ctrl+R</kbd></div>
              <div className="flex justify-between text-sm"><span>Fechar atalhos</span><kbd className="px-2 py-1 bg-muted rounded text-xs">Ctrl+/</kbd></div>
              <Separator className="my-2" />
              <p className="text-xs text-muted-foreground">Pressione Esc ou clique fora para fechar</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* HEADER - Compacto e responsivo */}
      <Card className="flex-shrink-0">
        <CardContent className="py-2 px-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            {/* Info do paciente */}
            <div className="flex items-center gap-3 min-w-0">
              <User className="h-6 w-6 text-primary flex-shrink-0" />
              <div className="min-w-0">
                <h2 className="text-base font-semibold truncate">{consultation?.patient?.name || 'Paciente'}</h2>
                <p className="text-xs text-muted-foreground truncate">
                  {consultation?.patient?.age && `${consultation.patient.age} anos`}
                  {consultation?.patient?.sex && ` • ${consultation.patient.sex === 'M' ? 'M' : 'F'}`}
                  {consultation?.patient?.cpf && ` • ${consultation.patient.cpf}`}
                </p>
              </div>
            </div>
            
            {/* Ações */}
            <div className="flex items-center gap-1 flex-wrap">
              <Button variant="default" size="sm" className="bg-green-600 hover:bg-green-700 h-7 text-xs" asChild>
                <Link href={`/consultations/${consultationId}/tele`}>
                  <Video className="h-3 w-3 mr-1" /> Tele
                </Link>
              </Button>
              <Button variant={showHistory ? "default" : "outline"} size="sm" className="h-7" onClick={() => setShowHistory(prev => !prev)}>
                <History className="h-3 w-3" />
              </Button>
              <Button
                variant={recording ? "destructive" : "outline"}
                size="sm"
                className="h-7 text-xs"
                onClick={recording ? stopRecording : startRecording}
                disabled={processing}
              >
                {processing ? <Loader2 className="h-3 w-3 animate-spin" /> : 
                 recording ? <MicOff className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
              </Button>
              <ProtocolSelector onApply={handleProtocolApply} />
              <AISuggestions 
                soap={soap}
                patientAge={consultation?.patient?.age}
                patientSex={consultation?.patient?.sex}
                onApply={handleAISuggestions}
              />
              <Badge variant="outline" className="text-xs h-7">{consultation?.status || 'IN_PROGRESS'}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* LAYOUT PRINCIPAL - SOAP em destaque */}
      <div className="flex gap-3 flex-1 min-h-0">
        
        {/* HISTÓRICO - Lateral esquerda (opcional) */}
        {showHistory && consultation?.patient?.id && (
          <div className="w-64 flex-shrink-0 overflow-auto">
            <PatientHistoryPanel 
              patientId={consultation.patient.id}
              onRepeatPrescription={handleRepeatPrescription}
            />
          </div>
        )}

        {/* ÁREA CENTRAL - SOAP ocupa ~60% */}
        <div className="flex-1 min-w-0 space-y-3 overflow-auto">
          
          {/* Sinais Vitais - Inline compacto */}
          <Card>
            <CardContent className="py-2 px-3">
              <div className="flex items-center gap-4 flex-wrap">
                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Activity className="h-3 w-3" /> Vitais:
                </span>
                {[
                  { key: 'weight', label: 'Peso', placeholder: 'kg', w: 'w-16' },
                  { key: 'height', label: 'Alt', placeholder: 'cm', w: 'w-14' },
                  { key: 'bloodPressure', label: 'PA', placeholder: 'mmHg', w: 'w-20' },
                  { key: 'heartRate', label: 'FC', placeholder: 'bpm', w: 'w-14' },
                  { key: 'temperature', label: 'T°', placeholder: '°C', w: 'w-14' },
                  { key: 'saturation', label: 'SpO2', placeholder: '%', w: 'w-14' },
                ].map(({ key, label, placeholder, w }) => (
                  <div key={key} className="flex items-center gap-1">
                    <Label className="text-xs text-muted-foreground">{label}</Label>
                    <Input
                      value={(vitals as any)[key]}
                      onChange={(e) => setVitals({ ...vitals, [key]: e.target.value })}
                      placeholder={placeholder}
                      className={`h-6 text-xs ${w}`}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* SOAP - DESTAQUE PRINCIPAL */}
          <Card className="border-primary/30 shadow-md flex-1">
            <CardHeader className="py-2 px-4 bg-gradient-to-r from-primary/10 to-primary/5 border-b">
              <CardTitle className="text-sm flex items-center gap-2">
                <Stethoscope className="h-4 w-4 text-primary" />
                Prontuário SOAP
                {recording && (
                  <Badge variant="destructive" className="ml-2 text-xs animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-white mr-1" /> REC
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold flex items-center gap-1 mb-1">
                    <span className="w-5 h-5 rounded bg-blue-500 text-white flex items-center justify-center text-xs font-bold">S</span>
                    Subjetivo
                    <span className="text-destructive ml-1" title="Campo obrigatório para finalizar">*</span>
                  </Label>
                  <Textarea
                    value={soap.subjective}
                    onChange={(e) => { setSoap({ ...soap, subjective: e.target.value }); setValidationErrors([]) }}
                    placeholder="Queixa principal, história da doença atual, sintomas..."
                    className={`min-h-[140px] text-sm resize-y ${validationErrors.some(e => e.includes('Subjetivo')) ? 'border-destructive' : ''}`}
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold flex items-center gap-1 mb-1">
                    <span className="w-5 h-5 rounded bg-green-500 text-white flex items-center justify-center text-xs font-bold">O</span>
                    Objetivo
                  </Label>
                  <Textarea
                    value={soap.objective}
                    onChange={(e) => setSoap({ ...soap, objective: e.target.value })}
                    placeholder="Exame físico, observações clínicas, sinais..."
                    className="min-h-[140px] text-sm resize-y"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold flex items-center gap-1 mb-1">
                    <span className="w-5 h-5 rounded bg-amber-500 text-white flex items-center justify-center text-xs font-bold">A</span>
                    Avaliação
                    <span className="text-destructive ml-1" title="Campo obrigatório para finalizar">*</span>
                  </Label>
                  <Textarea
                    value={soap.assessment}
                    onChange={(e) => { setSoap({ ...soap, assessment: e.target.value }); setValidationErrors([]) }}
                    placeholder="Diagnóstico, hipóteses diagnósticas, impressão..."
                    className={`min-h-[140px] text-sm resize-y ${validationErrors.some(e => e.includes('Avaliação')) ? 'border-destructive' : ''}`}
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold flex items-center gap-1 mb-1">
                    <span className="w-5 h-5 rounded bg-purple-500 text-white flex items-center justify-center text-xs font-bold">P</span>
                    Plano
                  </Label>
                  <Textarea
                    value={soap.plan}
                    onChange={(e) => setSoap({ ...soap, plan: e.target.value })}
                    placeholder="Conduta, tratamento, prescrições, orientações..."
                    className="min-h-[140px] text-sm resize-y"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* CID-10 */}
          <Card className={validationErrors.some(e => e.includes('Diagnóstico')) ? 'border-destructive' : ''}>
            <CardHeader className="py-2 px-3">
              <CardTitle className="text-xs flex items-center gap-2">
                <FileText className="h-3 w-3" /> CID-10 ({diagnoses.length})
                <span className="text-destructive" title="Campo obrigatório para finalizar">*</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="py-2 px-3">
              <div className="flex flex-wrap gap-1 mb-2">
                {diagnoses.map((d) => (
                  <Badge key={d.id} variant="secondary" className="text-xs">
                    <span className="font-mono">{d.code}</span>
                    <button onClick={() => { setDiagnoses(diagnoses.filter(x => x.id !== d.id)); setValidationErrors([]) }} className="ml-1 hover:text-destructive">×</button>
                  </Badge>
                ))}
              </div>
              <CIDAutocomplete 
                value={cidSearch} 
                onChange={setCidSearch} 
                onSelect={handleCIDSelect} 
                placeholder="Buscar CID..." 
              />
            </CardContent>
          </Card>
        </div>

        {/* LATERAL DIREITA - Prescrições, Exames, Encaminhamentos, Atestados */}
        <div className="w-72 flex-shrink-0 space-y-2 overflow-auto">
          
          {/* Prescrições */}
          <Card>
            <CardHeader className="py-1.5 px-3">
              <CardTitle className="text-xs flex items-center gap-1">
                <FileText className="h-3 w-3" /> Prescrições ({prescriptions.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="py-2 px-3">
              <div className="max-h-[100px] overflow-auto space-y-1 mb-2">
                {prescriptions.map((rx) => (
                  <div key={rx.id} className="p-1.5 bg-muted rounded text-xs flex justify-between items-start">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{rx.medication}</p>
                      <p className="text-muted-foreground truncate">{rx.dosage} • {rx.frequency}</p>
                    </div>
                    <Button variant="ghost" size="sm" className="h-5 w-5 p-0 flex-shrink-0" onClick={() => setPrescriptions(prescriptions.filter(p => p.id !== rx.id))}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
              <MedicationAutocomplete 
                value={medSearch}
                onChange={setMedSearch}
                onSelect={handleMedicationSelect}
                patientAge={consultation?.patient?.age}
                patientSex={consultation?.patient?.sex}
              />
            </CardContent>
          </Card>

          {/* Exames */}
          <Card>
            <CardHeader className="py-1.5 px-3">
              <CardTitle className="text-xs flex items-center gap-1">
                <FlaskConical className="h-3 w-3" /> Exames ({exams.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="py-2 px-3">
              <div className="max-h-[80px] overflow-auto space-y-1 mb-2">
                {exams.map((ex) => (
                  <div key={ex.id} className="p-1.5 bg-muted rounded text-xs flex justify-between">
                    <span className="truncate flex-1">{ex.description}</span>
                    <Button variant="ghost" size="sm" className="h-5 w-5 p-0 flex-shrink-0" onClick={() => setExams(exams.filter(e => e.id !== ex.id))}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
              <ExamAutocomplete 
                value={examSearch}
                onChange={setExamSearch}
                onSelect={handleExamSelect}
                patientAge={consultation?.patient?.age}
                patientSex={consultation?.patient?.sex}
              />
            </CardContent>
          </Card>

          {/* Encaminhamentos */}
          <Card>
            <CardHeader className="py-1.5 px-3">
              <CardTitle className="text-xs flex items-center gap-1">
                <Send className="h-3 w-3" /> Encaminhamentos ({referrals.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="py-2 px-3 space-y-1">
              {referrals.map((ref) => (
                <div key={ref.id} className="p-1.5 bg-muted rounded text-xs flex justify-between">
                  <span className="truncate flex-1">{ref.specialty}</span>
                  <Button variant="ghost" size="sm" className="h-5 w-5 p-0 flex-shrink-0" onClick={() => setReferrals(referrals.filter(r => r.id !== ref.id))}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              <Input placeholder="Especialidade" value={newReferral.specialty} onChange={(e) => setNewReferral({ ...newReferral, specialty: e.target.value })} className="h-6 text-xs" />
              <Input placeholder="Motivo" value={newReferral.description} onChange={(e) => setNewReferral({ ...newReferral, description: e.target.value })} className="h-6 text-xs" />
              <Button onClick={addReferral} size="sm" className="w-full h-6 text-xs">
                <Plus className="h-3 w-3 mr-1" /> Encaminhar
              </Button>
            </CardContent>
          </Card>

          {/* Atestados */}
          <Card>
            <CardHeader className="py-1.5 px-3">
              <CardTitle className="text-xs flex items-center gap-1">
                <FileText className="h-3 w-3" /> Atestados ({certificates.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="py-2 px-3 space-y-1">
              {certificates.map((cert) => (
                <div key={cert.id} className="p-1.5 bg-muted rounded text-xs flex justify-between">
                  <Badge variant="outline" className="text-xs h-5">{cert.type}</Badge>
                  <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => setCertificates(certificates.filter(c => c.id !== cert.id))}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              <Select value={newCertificate.type} onValueChange={(v) => setNewCertificate({ ...newCertificate, type: v })}>
                <SelectTrigger className="h-6 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="COMPARECIMENTO">Comparecimento</SelectItem>
                  <SelectItem value="AFASTAMENTO">Afastamento</SelectItem>
                  <SelectItem value="ACOMPANHANTE">Acompanhante</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder="Descrição" value={newCertificate.description} onChange={(e) => setNewCertificate({ ...newCertificate, description: e.target.value })} className="h-6 text-xs" />
              {newCertificate.type === 'AFASTAMENTO' && (
                <Input type="number" placeholder="Dias" value={newCertificate.days} onChange={(e) => setNewCertificate({ ...newCertificate, days: parseInt(e.target.value) || 1 })} className="h-6 text-xs" />
              )}
              <Button onClick={addCertificate} size="sm" className="w-full h-6 text-xs">
                <Plus className="h-3 w-3 mr-1" /> Atestado
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* FOOTER - SALVAR E FINALIZAR */}
      <div className="sticky bottom-2 pt-2 space-y-2">
        {/* Mostrar erros de validação se houver */}
        {validationErrors.length > 0 && (
          <div className="flex justify-center">
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg px-4 py-2 max-w-xl">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-destructive">Campos obrigatórios para finalizar:</p>
                  <ul className="list-disc list-inside text-destructive/80 mt-1">
                    {validationErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div className="flex justify-center gap-3">
          {/* Botão Cancelar - só aparece se não finalizada */}
          {consultation?.status !== 'COMPLETED' && consultation?.status !== 'CANCELLED' && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    onClick={() => setShowCancelDialog(true)} 
                    disabled={saving || finalizing || cancelling} 
                    variant="outline"
                    size="default" 
                    className="shadow-lg px-4 text-red-600 border-red-300 hover:bg-red-50 hover:text-red-700"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Cancelar
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Cancela esta consulta (erro de paciente, teste, etc.)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Mantém registro para auditoria
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          
          {/* Botão Salvar */}
          <Button 
            onClick={saveAll} 
            disabled={saving || finalizing || consultation?.status === 'COMPLETED' || consultation?.status === 'CANCELLED'} 
            variant="outline"
            size="default" 
            className="shadow-lg px-6"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Salvar (Ctrl+S)
          </Button>
          
          {/* Botão Finalizar */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  onClick={finalizeConsultation} 
                  disabled={saving || finalizing || consultation?.status === 'COMPLETED' || consultation?.status === 'CANCELLED'} 
                  size="default" 
                  className="shadow-lg px-6 bg-green-600 hover:bg-green-700"
                >
                  {finalizing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                  )}
                  Finalizar Consulta
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Salva os dados e marca a consulta como concluída</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Requer: Subjetivo, Avaliação e Diagnóstico
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        {/* Status da consulta */}
        {consultation?.status === 'COMPLETED' && (
          <div className="flex justify-center">
            <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Consulta já finalizada
            </Badge>
          </div>
        )}
        
        {consultation?.status === 'CANCELLED' && (
          <div className="flex justify-center">
            <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">
              <XCircle className="h-3 w-3 mr-1" />
              Consulta cancelada
            </Badge>
          </div>
        )}
      </div>
      
      {/* Diálogo de confirmação de cancelamento */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Cancelar Consulta</DialogTitle>
            <DialogDescription>
              Esta ação cancelará a consulta. Os dados serão mantidos para auditoria, 
              mas a consulta não poderá mais ser editada ou finalizada.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Label htmlFor="cancelReason" className="text-sm font-medium">
              Motivo do cancelamento <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="cancelReason"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Ex: Paciente selecionado incorretamente, consulta de teste, etc."
              className="mt-2"
              rows={3}
            />
            <p className="text-xs text-muted-foreground mt-1">
              O motivo será registrado para fins de auditoria
            </p>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowCancelDialog(false)
                setCancelReason('')
              }}
              disabled={cancelling}
            >
              Voltar
            </Button>
            <Button 
              variant="destructive" 
              onClick={cancelConsultation}
              disabled={cancelling || cancelReason.trim().length < 3}
            >
              {cancelling ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              Confirmar Cancelamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
