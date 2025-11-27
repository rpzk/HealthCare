"use client"

import { useEffect, useState, useRef, useCallback } from 'react'
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
  BookMarked
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

// Componentes de autocomplete e IA
import { MedicationAutocomplete } from './medication-autocomplete'
import { CIDAutocomplete } from './cid-autocomplete'
import { ExamAutocomplete } from './exam-autocomplete'
import { ProtocolSelector } from './protocol-selector'
import { ProtocolCreator } from './protocol-creator'
import { AISuggestions } from './ai-suggestions'
import { ConsultationBICheckboxes, defaultBIData } from './consultation-bi-checkboxes'

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
      setConsultation(data.consultation || data)
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

  // ============ SALVAR ============
  const saveAll = async () => {
    setSaving(true)
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
    <div className="p-4 space-y-4 max-w-[1600px] mx-auto">
      {/* HEADER */}
      <Card>
        <CardContent className="py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <User className="h-8 w-8 text-primary" />
              <div>
                <h2 className="text-lg font-semibold">{consultation?.patient?.name || 'Paciente'}</h2>
                <p className="text-sm text-muted-foreground">
                  {consultation?.patient?.age && `${consultation.patient.age} anos`}
                  {consultation?.patient?.sex && ` • ${consultation.patient.sex === 'M' ? 'Masc' : 'Fem'}`}
                  {consultation?.patient?.cpf && ` • ${consultation.patient.cpf}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Gravação */}
              <Button
                variant={recording ? "destructive" : "outline"}
                size="sm"
                onClick={recording ? stopRecording : startRecording}
                disabled={processing}
              >
                {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : 
                 recording ? <><MicOff className="h-4 w-4 mr-1" /> Parar</> : 
                 <><Mic className="h-4 w-4 mr-1" /> Gravar</>}
              </Button>
              
              {/* Ações rápidas */}
              <ProtocolSelector onApply={handleProtocolApply} />
              <AISuggestions 
                soap={soap}
                patientAge={consultation?.patient?.age}
                patientSex={consultation?.patient?.sex}
                onApply={handleAISuggestions}
              />
              <ProtocolCreator 
                prescriptions={prescriptions.map(rx => ({ 
                  medication: rx.medication, 
                  dosage: rx.dosage, 
                  frequency: rx.frequency, 
                  duration: rx.duration, 
                  instructions: rx.instructions 
                }))}
                exams={exams.map(ex => ({ 
                  examType: ex.examType, 
                  description: ex.description, 
                  priority: ex.priority 
                }))}
                referrals={referrals.map(ref => ({ 
                  specialty: ref.specialty, 
                  description: ref.description, 
                  priority: ref.priority 
                }))}
                diagnoses={diagnoses.map(d => ({ 
                  code: d.code, 
                  description: d.description 
                }))}
                onSuccess={() => toast({ title: "Protocolo salvo!" })}
              />
              
              <Badge variant="outline">{consultation?.status || 'EM_ANDAMENTO'}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* GRID PRINCIPAL - 3 COLUNAS */}
      <div className="grid lg:grid-cols-3 gap-4">
        
        {/* COLUNA 1: SOAP + Vitais + CID */}
        <div className="space-y-4">
          {/* Sinais Vitais */}
          <Card>
            <CardHeader className="py-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="h-4 w-4" /> Sinais Vitais
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: 'weight', label: 'Peso', placeholder: 'kg' },
                  { key: 'height', label: 'Altura', placeholder: 'cm' },
                  { key: 'bloodPressure', label: 'PA', placeholder: 'mmHg' },
                  { key: 'heartRate', label: 'FC', placeholder: 'bpm' },
                  { key: 'temperature', label: 'Temp', placeholder: '°C' },
                  { key: 'saturation', label: 'SpO2', placeholder: '%' },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <Label className="text-xs">{label}</Label>
                    <Input
                      value={(vitals as any)[key]}
                      onChange={(e) => setVitals({ ...vitals, [key]: e.target.value })}
                      placeholder={placeholder}
                      className="h-8 text-sm"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* SOAP */}
          <Card>
            <CardHeader className="py-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Stethoscope className="h-4 w-4" /> SOAP
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              {[
                { key: 'subjective', label: 'Subjetivo', placeholder: 'Queixa, HDA...' },
                { key: 'objective', label: 'Objetivo', placeholder: 'Exame físico...' },
                { key: 'assessment', label: 'Avaliação', placeholder: 'Diagnóstico...' },
                { key: 'plan', label: 'Plano', placeholder: 'Conduta...' },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <Label className="text-xs font-medium">{label}</Label>
                  <Textarea
                    value={(soap as any)[key]}
                    onChange={(e) => setSoap({ ...soap, [key]: e.target.value })}
                    placeholder={placeholder}
                    className="min-h-[60px] text-sm resize-none"
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Diagnósticos CID-10 */}
          <Card>
            <CardHeader className="py-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="h-4 w-4" /> CID-10 ({diagnoses.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              {diagnoses.map((d) => (
                <div key={d.id} className="flex items-center justify-between p-2 bg-muted rounded text-sm">
                  <div>
                    <span className="font-mono font-medium">{d.code}</span>
                    <span className="text-muted-foreground ml-2 text-xs">{d.description}</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setDiagnoses(diagnoses.filter(x => x.id !== d.id))}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              <CIDAutocomplete 
                value={cidSearch} 
                onChange={setCidSearch} 
                onSelect={handleCIDSelect} 
                placeholder="Buscar CID..." 
              />
            </CardContent>
          </Card>

          {/* BI Checkboxes */}
          <ConsultationBICheckboxes data={biData} onChange={setBIData} />
        </div>

        {/* COLUNA 2: Prescrições */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="py-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="h-4 w-4" /> Prescrições ({prescriptions.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              <div className="max-h-[400px] overflow-auto space-y-2">
                {prescriptions.map((rx) => (
                  <div key={rx.id} className="p-2 bg-muted rounded text-sm">
                    <div className="flex justify-between">
                      <div>
                        <p className="font-medium">{rx.medication}</p>
                        <p className="text-xs text-muted-foreground">
                          {rx.dosage} • {rx.frequency} • {rx.duration}
                        </p>
                        {rx.instructions && <p className="text-xs">{rx.instructions}</p>}
                        {rx.controlled && <Badge variant="destructive" className="text-xs mt-1">Controlado</Badge>}
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setPrescriptions(prescriptions.filter(p => p.id !== rx.id))}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <Separator />
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
            <CardHeader className="py-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <FlaskConical className="h-4 w-4" /> Exames ({exams.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              <div className="max-h-[200px] overflow-auto space-y-2">
                {exams.map((ex) => (
                  <div key={ex.id} className="p-2 bg-muted rounded text-sm flex justify-between">
                    <div>
                      <p className="font-medium">{ex.description}</p>
                      <Badge variant="outline" className="text-xs">{ex.examType}</Badge>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setExams(exams.filter(e => e.id !== ex.id))}>
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
        </div>

        {/* COLUNA 3: Encaminhamentos e Atestados */}
        <div className="space-y-4">
          {/* Encaminhamentos */}
          <Card>
            <CardHeader className="py-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Send className="h-4 w-4" /> Encaminhamentos ({referrals.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              <div className="max-h-[150px] overflow-auto space-y-2">
                {referrals.map((ref) => (
                  <div key={ref.id} className="p-2 bg-muted rounded text-sm flex justify-between">
                    <div>
                      <p className="font-medium">{ref.specialty}</p>
                      <p className="text-xs text-muted-foreground">{ref.description}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setReferrals(referrals.filter(r => r.id !== ref.id))}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
              <Separator />
              <div className="space-y-2">
                <Input
                  placeholder="Especialidade"
                  value={newReferral.specialty}
                  onChange={(e) => setNewReferral({ ...newReferral, specialty: e.target.value })}
                  className="h-8 text-sm"
                />
                <Textarea
                  placeholder="Motivo"
                  value={newReferral.description}
                  onChange={(e) => setNewReferral({ ...newReferral, description: e.target.value })}
                  className="min-h-[50px] text-sm"
                />
                <Button onClick={addReferral} size="sm" className="w-full">
                  <Plus className="h-4 w-4 mr-1" /> Encaminhar
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Atestados */}
          <Card>
            <CardHeader className="py-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="h-4 w-4" /> Atestados ({certificates.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              <div className="space-y-2">
                {certificates.map((cert) => (
                  <div key={cert.id} className="p-2 bg-muted rounded text-sm flex justify-between">
                    <div>
                      <Badge variant="outline" className="text-xs">{cert.type}</Badge>
                      <p className="text-xs mt-1">{cert.description}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setCertificates(certificates.filter(c => c.id !== cert.id))}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
              <Separator />
              <Select value={newCertificate.type} onValueChange={(v) => setNewCertificate({ ...newCertificate, type: v })}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="COMPARECIMENTO">Comparecimento</SelectItem>
                  <SelectItem value="AFASTAMENTO">Afastamento</SelectItem>
                  <SelectItem value="ACOMPANHANTE">Acompanhante</SelectItem>
                </SelectContent>
              </Select>
              <Textarea
                placeholder="Descrição"
                value={newCertificate.description}
                onChange={(e) => setNewCertificate({ ...newCertificate, description: e.target.value })}
                className="min-h-[50px] text-sm"
              />
              {newCertificate.type === 'AFASTAMENTO' && (
                <Input
                  type="number"
                  placeholder="Dias"
                  value={newCertificate.days}
                  onChange={(e) => setNewCertificate({ ...newCertificate, days: parseInt(e.target.value) || 1 })}
                  className="h-8 text-sm"
                />
              )}
              <Button onClick={addCertificate} size="sm" className="w-full">
                <Plus className="h-4 w-4 mr-1" /> Atestado
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* FOOTER - SALVAR */}
      <div className="sticky bottom-4 flex justify-center">
        <Button onClick={saveAll} disabled={saving} size="lg" className="shadow-lg px-8">
          {saving ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Save className="h-5 w-5 mr-2" />}
          {saving ? 'Salvando...' : 'Salvar Consulta'}
        </Button>
      </div>
    </div>
  )
}
