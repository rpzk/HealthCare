"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { 
  Calendar, 
  CheckCircle, 
  FileText, 
  FlaskConical, 
  Send, 
  User, 
  XCircle, 
  UserX,
  Stethoscope,
  Plus,
  Trash2,
  Save,
  Clock,
  Activity
} from 'lucide-react'
import { toast } from '@/hooks/use-toast-simple'
import { useRef } from 'react'

type Patient = {
  id: string
  name: string
  age?: number
  phone?: string
  address?: string
  family?: string
}

type Consultation = {
  id: string
  scheduledDate?: string
  status?: string
  type?: string
  duration?: number
  description?: string
  notes?: string
  patient?: Patient
  doctor?: { id: string; name: string }
}

type Prescription = {
  id?: string
  medication: string
  dosage: string
  frequency: string
  duration: string
  instructions: string
  controlledMedication?: boolean
}

type ExamRequest = {
  id?: string
  examType: string
  description: string
  priority: 'NORMAL' | 'HIGH'
  notes?: string
  scheduledDate?: string
}

type Referral = {
  id?: string
  specialty: string
  description: string
  priority: 'NORMAL' | 'HIGH'
  notes?: string
  unitOrDoctor?: string
}

type Certificate = {
  id?: string
  type: string
  description: string
  days?: number
}

export function SSFConsultationWorkspace({ consultationId }: { consultationId: string }) {
  const [consultation, setConsultation] = useState<Consultation | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [recState, setRecState] = useState<'idle'|'recording'|'processing'|'done'|'error'>('idle')
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const [jobId, setJobId] = useState<string | null>(null)
  const [jobResult, setJobResult] = useState<{ recordId?: string } | null>(null)
  const [doctorId, setDoctorId] = useState<string | null>(null)
  const [draftSoap, setDraftSoap] = useState<any | null>(null)
  const [savingDraft, setSavingDraft] = useState(false)
  const [jobProgress, setJobProgress] = useState<{ step?: string; pct?: number } | null>(null)
  const sseRef = useRef<EventSource | null>(null)
  const [jobFailed, setJobFailed] = useState<string | null>(null)

  // Estado da consulta
  const [notes, setNotes] = useState({
    subjective: '',
    objective: '',
    assessment: '',
    plan: ''
  })

  // Estados para prescrições
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [newPrescription, setNewPrescription] = useState<Prescription>({
    medication: '',
    dosage: '',
    frequency: '',
    duration: '',
    instructions: '',
    controlledMedication: false
  })

  // Estados para exames
  const [examRequests, setExamRequests] = useState<ExamRequest[]>([])
  const [newExamRequest, setNewExamRequest] = useState<ExamRequest>({
    examType: '',
    description: '',
    priority: 'NORMAL',
    notes: '',
    scheduledDate: ''
  })

  // Estados para encaminhamentos
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [newReferral, setNewReferral] = useState<Referral>({
    specialty: '',
    description: '',
    priority: 'NORMAL',
    notes: '',
    unitOrDoctor: ''
  })

  // Estados para atestados
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [newCertificate, setNewCertificate] = useState<Certificate>({
    type: 'COMPARECIMENTO',
    description: '',
    days: 1
  })

  // Sinais vitais
  const [vitals, setVitals] = useState({
    weight: '',
    height: '',
    bloodPressure: '',
    heartRate: '',
    temperature: '',
    saturation: ''
  })

  useEffect(() => {
    fetchConsultation()
  }, [consultationId])

  const fetchConsultation = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`/api/consultations/${consultationId}`)
      if (!res.ok) throw new Error('Falha ao carregar consulta')
      const data = await res.json()
      const c = data.consultation || data
      setConsultation(c)
      // best effort: from consultation payload or session
      if (c?.doctor?.id) setDoctorId(c.doctor.id)
      try {
        const me = await fetch('/api/auth/session', { method: 'GET' })
        if (me.ok) {
          const json = await me.json()
          const uid = json?.user?.id || json?.user?.sub || null
          if (uid) setDoctorId(uid)
        }
      } catch {}
      
      // Carregar dados existentes se houver
      if (c?.notes) {
        setNotes({
          subjective: c.notes.subjective || '',
          objective: c.notes.objective || '',
          assessment: c.notes.assessment || '',
          plan: c.notes.plan || ''
        })
      }
    } catch (e: any) {
      console.error('Erro ao carregar consulta:', e)
      setError(e.message || 'Erro ao carregar consulta')
    } finally {
      setLoading(false)
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      chunksRef.current = []
      mr.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = () => { stream.getTracks().forEach(t => t.stop()) }
      mediaRecorderRef.current = mr
      mr.start()
      setRecState('recording')
    } catch (e: any) {
      setRecState('error')
      toast({ title: 'Microfone', description: e?.message || 'Falha ao iniciar gravação', variant: 'destructive' })
    }
  }

  const stopAndUpload = async () => {
    const mr = mediaRecorderRef.current
    if (!mr) return
    setRecState('processing')
    mr.stop()
    // pequena espera para garantir ondataavailable finalizou
    await new Promise(r => setTimeout(r, 200))
    const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
    const file = new File([blob], `consulta-${consultationId}-${Date.now()}.webm`, { type: 'audio/webm' })
    try {
      const form = new FormData()
      form.append('audio', file)
      if (consultation?.patient?.id) form.append('patientId', consultation.patient.id)
      if (doctorId) form.append('doctorId', doctorId)
  const res = await fetch('/api/ai/transcribe/upload?enqueue=true', { method: 'POST', body: form })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Falha no upload/transcrição')
      if (json.jobId) setJobId(json.jobId)
      setRecState('done')
      toast({ title: 'Áudio enviado', description: 'Processando transcrição e geração SOAP...' })
      pollJob(json.jobId)
    } catch (e: any) {
      setRecState('error')
      toast({ title: 'Upload STT', description: e?.message || 'Erro no envio', variant: 'destructive' })
    }
  }

  const stopAndUploadDraft = async () => {
    const mr = mediaRecorderRef.current
    if (!mr) return
    setRecState('processing')
    mr.stop()
    await new Promise(r => setTimeout(r, 200))
    const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
    const file = new File([blob], `consulta-${consultationId}-${Date.now()}.webm`, { type: 'audio/webm' })
    try {
      const form = new FormData()
      form.append('audio', file)
      const res = await fetch('/api/ai/transcribe/upload?enqueue=true&mode=draft', { method: 'POST', body: form })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Falha no upload/transcrição (rascunho)')
      if (json.jobId) setJobId(json.jobId)
      setRecState('done')
      toast({ title: 'Áudio enviado', description: 'Gerando SOAP (rascunho) para revisão...' })
      pollJobDraft(json.jobId)
    } catch (e: any) {
      setRecState('error')
      toast({ title: 'Upload STT (rascunho)', description: e?.message || 'Erro no envio', variant: 'destructive' })
    }
  }

  const pollJobDraft = async (id: string) => {
    if (!id) return
    // Try SSE first; if it fails, fallback to polling
    try {
      if (!sseRef.current) {
        const es = new EventSource(`/api/ai/jobs/${id}/events`)
        sseRef.current = es
        es.addEventListener('progress', (ev: any) => {
          try { setJobProgress(JSON.parse(ev.data)) } catch {}
        })
        es.addEventListener('completed', (ev: any) => {
          try {
            const data = JSON.parse(ev.data)
            if (data?.soap) {
              setDraftSoap(data.soap)
              toast({ title: 'Rascunho SOAP pronto', description: 'Revise e salve.' })
            }
          } catch {}
          try { es.close() } catch {}
          sseRef.current = null
        })
        es.addEventListener('failed', () => {
          setJobFailed(id)
          toast({ title: 'Job falhou', description: 'Você pode reprocessar.', variant: 'destructive' })
          try { es.close() } catch {}
          sseRef.current = null
        })
        es.onerror = () => {
          try { es.close() } catch {}
          sseRef.current = null
        }
        // give SSE a moment; if it closes immediately, we'll poll below
        await new Promise(r => setTimeout(r, 200))
        if (sseRef.current) return
      }
    } catch {}
    for (let i = 0; i < 60; i++) {
      await new Promise(r => setTimeout(r, 1000))
      try {
        const res = await fetch(`/api/ai/jobs/${id}`)
        const json = await res.json().catch(() => ({}))
        if (json?.progress) setJobProgress(json.progress)
        if (res.ok && (json.state === 'completed' || json.state === 'failed')) {
          if (json.state === 'completed' && json.result?.soap) {
            setDraftSoap(json.result.soap)
            toast({ title: 'Rascunho SOAP pronto', description: 'Revise e salve.' })
          } else if (json.state === 'failed') {
            toast({ title: 'Job falhou', description: 'Tente novamente.', variant: 'destructive' })
          }
          break
        }
      } catch {}
    }
  }

  const saveDraftSoap = async () => {
    if (!draftSoap) return
    if (!consultation?.patient?.id) {
      toast({ title: 'Paciente ausente', description: 'Não foi possível determinar o paciente', variant: 'destructive' })
      return
    }
    setSavingDraft(true)
    try {
      const res = await fetch('/api/ai/soap/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId: consultation.patient.id, doctorId, soap: draftSoap })
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Falha ao salvar SOAP')
      setDraftSoap(null)
      setJobResult({ recordId: json.recordId })
      toast({ title: 'Registro salvo', description: 'SOAP revisada e salva.' })
    } catch (e: any) {
      toast({ title: 'Salvar SOAP', description: e?.message || 'Erro ao salvar', variant: 'destructive' })
    } finally {
      setSavingDraft(false)
    }
  }

  const pollJob = async (id: string) => {
    if (!id) return
    // Try SSE first; if it fails, fallback to polling
    try {
      if (!sseRef.current) {
        const es = new EventSource(`/api/ai/jobs/${id}/events`)
        sseRef.current = es
        es.addEventListener('progress', (ev: any) => {
          try { setJobProgress(JSON.parse(ev.data)) } catch {}
        })
        es.addEventListener('completed', (ev: any) => {
          try {
            const data = JSON.parse(ev.data)
            if (data?.recordId) {
              setJobResult({ recordId: data.recordId })
              toast({ title: 'SOAP gerada', description: 'Registro médico criado.' })
            }
          } catch {}
          try { es.close() } catch {}
          sseRef.current = null
        })
        es.addEventListener('failed', () => {
          setJobFailed(id)
          toast({ title: 'Job falhou', description: 'Você pode reprocessar.', variant: 'destructive' })
          try { es.close() } catch {}
          sseRef.current = null
        })
        es.onerror = () => {
          try { es.close() } catch {}
          sseRef.current = null
        }
        await new Promise(r => setTimeout(r, 200))
        if (sseRef.current) return
      }
    } catch {}
    for (let i = 0; i < 60; i++) { // até ~60s
      await new Promise(r => setTimeout(r, 1000))
      try {
        const res = await fetch(`/api/ai/jobs/${id}`)
        const json = await res.json().catch(() => ({}))
        if (json?.progress) setJobProgress(json.progress)
        if (res.ok && (json.state === 'completed' || json.state === 'failed')) {
          setJobResult(json.result || null)
          if (json.state === 'completed' && json.result?.recordId) {
            toast({ title: 'SOAP gerada', description: 'Registro médico criado.' })
          } else if (json.state === 'failed') {
            setJobFailed(id)
            toast({ title: 'Job falhou', description: 'Você pode reprocessar.', variant: 'destructive' })
          }
          break
        }
      } catch {}
    }
  }

  const retryJob = async () => {
    if (!jobFailed) return
    try {
      const res = await fetch(`/api/ai/jobs/${jobFailed}/retry`, { method: 'POST' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Falha ao reprocessar job')
      setJobFailed(null)
      setJobProgress(null)
      setDraftSoap(null)
      setJobResult(null)
      setJobId(json.jobId)
      // Reinscreve SSE para novo job
      pollJob(json.jobId)
    } catch (e: any) {
      toast({ title: 'Reprocessar', description: e?.message || 'Erro ao reprocessar', variant: 'destructive' })
    }
  }

  const applyAiSuggestions = () => {
    if (!draftSoap?.plan) return

    let addedPrescriptions = 0
    let addedExams = 0

    // Processar Medicações Sugeridas
    if (Array.isArray(draftSoap.plan.medications)) {
      const newPrescriptions = draftSoap.plan.medications.map((medStr: string) => {
        // Tentativa simples de parse: "Nome Dosagem Frequência"
        // Ex: "Amoxicilina 500mg 8/8h"
        return {
          id: Date.now().toString() + Math.random().toString().slice(2),
          medication: medStr, // Por enquanto coloca tudo no nome para o médico editar
          dosage: '',
          frequency: '',
          duration: '',
          instructions: 'Sugerido via IA',
          controlledMedication: false
        }
      })
      setPrescriptions(prev => [...prev, ...newPrescriptions])
      addedPrescriptions = newPrescriptions.length
    }

    // Processar Exames Sugeridos
    if (Array.isArray(draftSoap.plan.tests)) {
      const newExams = draftSoap.plan.tests.map((testStr: string) => {
        return {
          id: Date.now().toString() + Math.random().toString().slice(2),
          examType: testStr,
          description: 'Sugerido via IA',
          priority: 'NORMAL' as const,
          notes: ''
        }
      })
      setExamRequests(prev => [...prev, ...newExams])
      addedExams = newExams.length
    }

    // Atualizar notas com o texto da IA
    setNotes(prev => ({
      ...prev,
      subjective: [
        prev.subjective, 
        draftSoap.subjective?.chiefComplaint, 
        draftSoap.subjective?.historyOfPresentIllness
      ].filter(Boolean).join('\n\n'),
      assessment: [
        prev.assessment,
        draftSoap.assessment?.impression
      ].filter(Boolean).join('\n\n'),
      plan: [
        prev.plan,
        draftSoap.plan?.carePlan
      ].filter(Boolean).join('\n\n')
    }))

    toast({
      title: "Sugestões Aplicadas",
      description: `Adicionados: ${addedPrescriptions} prescrições e ${addedExams} exames.`,
    })
  }

  const addPrescription = () => {
    if (!newPrescription.medication || !newPrescription.dosage) {
      toast({
        title: "Erro",
        description: "Medicação e dosagem são obrigatórios",
        variant: "destructive"
      })
      return
    }

    setPrescriptions([...prescriptions, { ...newPrescription, id: Date.now().toString() }])
    setNewPrescription({
      medication: '',
      dosage: '',
      frequency: '',
      duration: '',
      instructions: '',
      controlledMedication: false
    })
    
    toast({
      title: "Prescrição adicionada",
      description: "A prescrição foi adicionada com sucesso"
    })
  }

  const removePrescription = (id: string) => {
    setPrescriptions(prescriptions.filter(p => p.id !== id))
  }

  const addExamRequest = () => {
    if (!newExamRequest.examType || !newExamRequest.description) {
      toast({
        title: "Erro",
        description: "Tipo de exame e descrição são obrigatórios",
        variant: "destructive"
      })
      return
    }

    setExamRequests([...examRequests, { ...newExamRequest, id: Date.now().toString() }])
    setNewExamRequest({
      examType: '',
      description: '',
      priority: 'NORMAL',
      notes: '',
      scheduledDate: ''
    })
    
    toast({
      title: "Solicitação de exame adicionada",
      description: "A solicitação foi adicionada com sucesso"
    })
  }

  const removeExamRequest = (id: string) => {
    setExamRequests(examRequests.filter(e => e.id !== id))
  }

  const addReferral = () => {
    if (!newReferral.specialty || !newReferral.description) {
      toast({
        title: "Erro",
        description: "Especialidade e descrição são obrigatórios",
        variant: "destructive"
      })
      return
    }

    setReferrals([...referrals, { ...newReferral, id: Date.now().toString() }])
    setNewReferral({
      specialty: '',
      description: '',
      priority: 'NORMAL',
      notes: '',
      unitOrDoctor: ''
    })
    
    toast({
      title: "Encaminhamento adicionado",
      description: "O encaminhamento foi adicionado com sucesso"
    })
  }

  const removeReferral = (id: string) => {
    setReferrals(referrals.filter(r => r.id !== id))
  }

  const addCertificate = () => {
    if (!newCertificate.description) {
      toast({
        title: "Erro",
        description: "Descrição do atestado é obrigatória",
        variant: "destructive"
      })
      return
    }

    setCertificates([...certificates, { ...newCertificate, id: Date.now().toString() }])
    setNewCertificate({
      type: 'COMPARECIMENTO',
      description: '',
      days: 1
    })
    
    toast({
      title: "Atestado adicionado",
      description: "O atestado foi adicionado com sucesso"
    })
  }

  const removeCertificate = (id: string) => {
    setCertificates(certificates.filter(c => c.id !== id))
  }

  const saveAll = async () => {
    try {
      setSaving(true)
      
      // Aqui você salvaria todos os dados da consulta
      const consultationData = {
        notes,
        prescriptions,
        examRequests,
        referrals,
        certificates,
        vitals
      }

      const res = await fetch(`/api/consultations/${consultationId}/complete`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(consultationData)
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Erro ao salvar consulta')
      }

      toast({
        title: "Consulta salva",
        description: "Todos os dados da consulta foram salvos com sucesso"
      })

    } catch (e: any) {
      console.error('Erro ao salvar consulta:', e)
      toast({
        title: "Erro",
        description: e.message || 'Erro ao salvar consulta',
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen ssf-section p-8 text-white">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Activity className="h-8 w-8 animate-spin mx-auto mb-4 text-[#40e0d0]" />
            <p>Carregando consulta...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen ssf-section p-8 text-white">
        <div className="text-center text-red-400">
          <XCircle className="h-12 w-12 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Erro ao carregar consulta</h2>
          <p>{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6 space-y-6">
      {/* Header com informações do paciente */}
      <Card className="ssf-section text-white border-[#40e0d0]">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <User className="h-8 w-8 text-[#40e0d0]" />
              <div>
                <CardTitle className="text-2xl text-[#40e0d0]">{consultation?.patient?.name || 'Paciente'}</CardTitle>
                <p className="text-gray-300">
                  {consultation?.patient?.age && `${consultation.patient.age} anos`}
                  {consultation?.patient?.phone && ` • ${consultation.patient.phone}`}
                </p>
                {consultation?.patient?.address && (
                  <p className="text-sm text-gray-400">{consultation.patient.address}</p>
                )}
              </div>
            </div>
            <div className="text-right">
              <Badge variant="outline" className="text-[#40e0d0] border-[#40e0d0]">
                {consultation?.status || 'EM_ANDAMENTO'}
              </Badge>
              <p className="text-sm text-gray-400 mt-1">
                <Calendar className="h-4 w-4 inline mr-1" />
                {consultation?.scheduledDate && new Date(consultation.scheduledDate).toLocaleString('pt-BR')}
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Coluna Esquerda - Anamnese e Sinais Vitais */}
        <div className="space-y-6">
          {/* Captura de Áudio / IA SOAP */}
          <Card className="ssf-section text-white border-[#40e0d0]">
            <CardHeader>
              <CardTitle className="flex items-center text-[#40e0d0]">
                <Stethoscope className="h-5 w-5 mr-2" />
                Capturar Anamnese por Áudio (Local)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                {recState !== 'recording' && (
                  <Button variant="outline" onClick={startRecording} className="border-[#40e0d0] text-[#40e0d0]">
                    Iniciar Gravação
                  </Button>
                )}
                {recState === 'recording' && (
                  <>
                    <Button variant="destructive" onClick={stopAndUpload}>
                      Parar e Salvar direto
                    </Button>
                    <Button variant="secondary" onClick={stopAndUploadDraft} className="ml-2">
                      Parar e Revisar SOAP
                    </Button>
                  </>
                )}
                <span className="text-sm text-gray-300">
                  {recState === 'idle' && 'Pronto para gravar'}
                  {recState === 'recording' && 'Gravando...'}
                  {recState === 'processing' && 'Enviando/Processando...'}
                  {recState === 'done' && 'Enviado'}
                  {recState === 'error' && 'Erro'}
                </span>
              </div>
              {jobResult?.recordId && (
                <div className="text-sm">
                  Evolução criada. <a className="underline" href={`/medical-records/${jobResult.recordId}`} target="_blank">Abrir registro</a>
                </div>
              )}
              {jobId && jobProgress && !draftSoap && !jobResult?.recordId && (
                <div className="flex items-center gap-3 text-xs text-gray-300">
                  <span>
                    {jobProgress.step ? `Etapa: ${jobProgress.step}` : 'Processando...'}
                    {typeof jobProgress.pct === 'number' ? ` • ${jobProgress.pct}%` : ''}
                  </span>
                  {jobProgress.step !== 'completed' && jobProgress.step !== 'cancelled' && (
                    <Button variant="ghost" size="sm" onClick={async()=>{
                      if (!jobId) return
                      try {
                        const res = await fetch(`/api/ai/jobs/${jobId}/cancel`, { method: 'POST' })
                        const json = await res.json().catch(()=>({}))
                        if (!res.ok) throw new Error(json.error || 'Falha ao cancelar')
                        toast({ title: 'Job cancelado', description: 'Processamento interrompido.' })
                        setJobProgress(null)
                        setJobId(null)
                      } catch(e:any){
                        toast({ title: 'Cancelar', description: e?.message || 'Erro ao cancelar', variant: 'destructive' })
                      }
                    }} className="text-red-300">
                      Cancelar
                    </Button>
                  )}
                  {jobProgress.step === 'cancelled' && (
                    <span className="text-amber-300">Processamento cancelado.</span>
                  )}
                </div>
              )}
              {jobFailed && (
                <div className="flex items-center gap-2 text-sm text-red-400">
                  Falha no processamento.
                  <Button variant="outline" size="sm" onClick={retryJob} className="border-red-400 text-red-300">
                    Reprocessar
                  </Button>
                </div>
              )}
              {draftSoap && (
                <div className="space-y-2">
                  <div className="text-sm text-[#40e0d0]">Rascunho SOAP</div>
                  <Textarea value={JSON.stringify(draftSoap, null, 2)} onChange={e=>{
                    try { setDraftSoap(JSON.parse(e.target.value)) } catch {}
                  }} className="h-56 font-mono" />
                  {/* Editor Estruturado (opcional) */}
                  <div className="mt-2 border border-[#40e0d0]/40 rounded p-3 space-y-3">
                    <div className="text-sm text-[#40e0d0]">Editor Estruturado</div>
                    {/* Helpers */}
                    {/* Atualiza campo aninhado no draftSoap */}
                    {/* Note: funções inline para simplicidade */}
                    <div className="grid md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-300 mb-1">Queixa Principal</label>
                        <Input
                          value={draftSoap?.subjective?.chiefComplaint || ''}
                          onChange={(e)=>{
                            const v = e.target.value
                            setDraftSoap((prev:any)=>{
                              const next = {...(prev||{})}
                              next.subjective = {...(next.subjective||{}), chiefComplaint: v}
                              return next
                            })
                          }}
                          className="bg-black/30 text-white border-gray-600"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-300 mb-1">Resumo (Assessment)</label>
                        <Input
                          value={draftSoap?.assessment?.summary || ''}
                          onChange={(e)=>{
                            const v = e.target.value
                            setDraftSoap((prev:any)=>{
                              const next = {...(prev||{})}
                              next.assessment = {...(next.assessment||{}), summary: v}
                              return next
                            })
                          }}
                          className="bg-black/30 text-white border-gray-600"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-300 mb-1">Exame Físico</label>
                      <Textarea
                        value={draftSoap?.objective?.physicalExam || ''}
                        onChange={(e)=>{
                          const v = e.target.value
                          setDraftSoap((prev:any)=>{
                            const next = {...(prev||{})}
                            next.objective = {...(next.objective||{}), physicalExam: v}
                            return next
                          })
                        }}
                        className="bg-black/30 text-white border-gray-600 h-24"
                      />
                    </div>
                    {/* Diagnósticos estruturados */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs text-gray-300">Diagnósticos</label>
                        <Button size="sm" variant="outline" className="border-[#40e0d0] text-[#40e0d0]" onClick={()=>{
                          setDraftSoap((prev:any)=>{
                            const next = {...(prev||{})}
                            const cur = next.assessment?.diagnoses || []
                            next.assessment = {
                              ...(next.assessment||{}),
                              diagnoses: [...cur, { label: '', certainty: 0.5, rationale: '' }]
                            }
                            return next
                          })
                        }}>Adicionar</Button>
                      </div>
                      <div className="space-y-3">
                        {(draftSoap?.assessment?.diagnoses || []).map((d:any, idx:number)=> (
                          <div key={idx} className="border border-gray-700 rounded p-3 space-y-2">
                            <div className="grid md:grid-cols-3 gap-2">
                              <div>
                                <label className="block text-[11px] text-gray-400">Rótulo</label>
                                <Input value={d?.label || ''} onChange={(e)=>{
                                  const v = e.target.value
                                  setDraftSoap((prev:any)=>{
                                    const next = {...(prev||{})}
                                    const list = [...(next.assessment?.diagnoses || [])]
                                    list[idx] = { ...(list[idx]||{}), label: v }
                                    next.assessment = { ...(next.assessment||{}), diagnoses: list }
                                    return next
                                  })
                                }} className="bg-black/30 text-white border-gray-600" />
                              </div>
                              <div>
                                <label className="block text-[11px] text-gray-400">Certeza (0-1)</label>
                                <Input type="number" step="0.1" min={0} max={1} value={typeof d?.certainty==='number'? d.certainty: ''} onChange={(e)=>{
                                  const v = Math.max(0, Math.min(1, parseFloat(e.target.value)))
                                  setDraftSoap((prev:any)=>{
                                    const next = {...(prev||{})}
                                    const list = [...(next.assessment?.diagnoses || [])]
                                    list[idx] = { ...(list[idx]||{}), certainty: isNaN(v) ? undefined : v }
                                    next.assessment = { ...(next.assessment||{}), diagnoses: list }
                                    return next
                                  })
                                }} className="bg-black/30 text-white border-gray-600" />
                              </div>
                              <div className="flex items-end justify-end">
                                <Button size="sm" variant="ghost" className="text-red-300" onClick={()=>{
                                  setDraftSoap((prev:any)=>{
                                    const next = {...(prev||{})}
                                    const list = [...(next.assessment?.diagnoses || [])]
                                    list.splice(idx,1)
                                    next.assessment = { ...(next.assessment||{}), diagnoses: list }
                                    return next
                                  })
                                }}>Remover</Button>
                              </div>
                            </div>
                            <div>
                              <label className="block text-[11px] text-gray-400">Justificativa</label>
                              <Textarea value={d?.rationale || ''} onChange={(e)=>{
                                const v = e.target.value
                                setDraftSoap((prev:any)=>{
                                  const next = {...(prev||{})}
                                  const list = [...(next.assessment?.diagnoses || [])]
                                  list[idx] = { ...(list[idx]||{}), rationale: v }
                                  next.assessment = { ...(next.assessment||{}), diagnoses: list }
                                  return next
                                })
                              }} className="bg-black/30 text-white border-gray-600 h-16" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Alergias e Antecedentes */}
                    <div className="grid md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-300 mb-1">Alergias (1 por linha)</label>
                        <Textarea
                          value={(draftSoap?.subjective?.allergies || []).join('\n')}
                          onChange={(e)=>{
                            const arr = e.target.value.split('\n').map(s=>s.trim()).filter(Boolean)
                            setDraftSoap((prev:any)=>{
                              const next = {...(prev||{})}
                              next.subjective = { ...(next.subjective||{}), allergies: arr }
                              return next
                            })
                          }}
                          className="bg-black/30 text-white border-gray-600 h-24"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-300 mb-1">Antecedentes (1 por linha)</label>
                        <Textarea
                          value={(draftSoap?.subjective?.pastMedicalHistory || []).join('\n')}
                          onChange={(e)=>{
                            const arr = e.target.value.split('\n').map(s=>s.trim()).filter(Boolean)
                            setDraftSoap((prev:any)=>{
                              const next = {...(prev||{})}
                              next.subjective = { ...(next.subjective||{}), pastMedicalHistory: arr }
                              return next
                            })
                          }}
                          className="bg-black/30 text-white border-gray-600 h-24"
                        />
                      </div>
                    </div>
                    <div className="grid md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs text-gray-300 mb-1">Plano: Medicações (1 por linha)</label>
                        <Textarea
                          value={(draftSoap?.plan?.medications||[]).join('\n')}
                          onChange={(e)=>{
                            const arr = e.target.value.split('\n').map(s=>s.trim()).filter(Boolean)
                            setDraftSoap((prev:any)=>{
                              const next = {...(prev||{})}
                              next.plan = {...(next.plan||{}), medications: arr}
                              return next
                            })
                          }}
                          className="bg-black/30 text-white border-gray-600 h-24"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-300 mb-1">Plano: Exames (1 por linha)</label>
                        <Textarea
                          value={(draftSoap?.plan?.tests||[]).join('\n')}
                          onChange={(e)=>{
                            const arr = e.target.value.split('\n').map(s=>s.trim()).filter(Boolean)
                            setDraftSoap((prev:any)=>{
                              const next = {...(prev||{})}
                              next.plan = {...(next.plan||{}), tests: arr}
                              return next
                            })
                          }}
                          className="bg-black/30 text-white border-gray-600 h-24"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-300 mb-1">Plano: Condutas/Tratamentos (1 por linha)</label>
                        <Textarea
                          value={(draftSoap?.plan?.treatments||[]).join('\n')}
                          onChange={(e)=>{
                            const arr = e.target.value.split('\n').map(s=>s.trim()).filter(Boolean)
                            setDraftSoap((prev:any)=>{
                              const next = {...(prev||{})}
                              next.plan = {...(next.plan||{}), treatments: arr}
                              return next
                            })
                          }}
                          className="bg-black/30 text-white border-gray-600 h-24"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-300 mb-1">Plano: Follow-up</label>
                      <Input
                        value={draftSoap?.plan?.followUp || ''}
                        onChange={(e)=>{
                          const v = e.target.value
                          setDraftSoap((prev:any)=>{
                            const next = {...(prev||{})}
                            next.plan = {...(next.plan||{}), followUp: v}
                            return next
                          })
                        }}
                        className="bg-black/30 text-white border-gray-600"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={saveDraftSoap} disabled={savingDraft}>Salvar como Registro</Button>
                    <Button variant="secondary" onClick={applyAiSuggestions} className="bg-teal-600 hover:bg-teal-700 text-white">
                      <Plus className="w-4 h-4 mr-2" />
                      Aplicar Sugestões
                    </Button>
                    <Button variant="outline" onClick={()=>setDraftSoap(null)}>Descartar</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          {/* Sinais Vitais */}
          <Card className="ssf-section text-white border-[#40e0d0]">
            <CardHeader>
              <CardTitle className="flex items-center text-[#40e0d0]">
                <Activity className="h-5 w-5 mr-2" />
                Sinais Vitais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="weight" className="block text-sm font-medium text-gray-300 mb-1">Peso (kg)</label>
                  <Input
                    id="weight"
                    value={vitals.weight}
                    onChange={(e) => setVitals({...vitals, weight: e.target.value})}
                    placeholder="70.5"
                    className="bg-black/30 text-white border-gray-600"
                  />
                </div>
                <div>
                  <label htmlFor="height" className="block text-sm font-medium text-gray-300 mb-1">Altura (cm)</label>
                  <Input
                    id="height"
                    value={vitals.height}
                    onChange={(e) => setVitals({...vitals, height: e.target.value})}
                    placeholder="175"
                    className="bg-black/30 text-white border-gray-600"
                  />
                </div>
                <div>
                  <label htmlFor="bp" className="block text-sm font-medium text-gray-300 mb-1">PA (mmHg)</label>
                  <Input
                    id="bp"
                    value={vitals.bloodPressure}
                    onChange={(e) => setVitals({...vitals, bloodPressure: e.target.value})}
                    placeholder="120/80"
                    className="bg-black/30 text-white border-gray-600"
                  />
                </div>
                <div>
                  <label htmlFor="hr" className="block text-sm font-medium text-gray-300 mb-1">FC (bpm)</label>
                  <Input
                    id="hr"
                    value={vitals.heartRate}
                    onChange={(e) => setVitals({...vitals, heartRate: e.target.value})}
                    placeholder="72"
                    className="bg-black/30 text-white border-gray-600"
                  />
                </div>
                <div>
                  <label htmlFor="temp" className="block text-sm font-medium text-gray-300 mb-1">Temperatura (°C)</label>
                  <Input
                    id="temp"
                    value={vitals.temperature}
                    onChange={(e) => setVitals({...vitals, temperature: e.target.value})}
                    placeholder="36.5"
                    className="bg-black/30 text-white border-gray-600"
                  />
                </div>
                <div>
                  <label htmlFor="sat" className="block text-sm font-medium text-gray-300 mb-1">SpO2 (%)</label>
                  <Input
                    id="sat"
                    value={vitals.saturation}
                    onChange={(e) => setVitals({...vitals, saturation: e.target.value})}
                    placeholder="98"
                    className="bg-black/30 text-white border-gray-600"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Anamnese SOAP */}
          <Card className="ssf-section text-white border-[#40e0d0]">
            <CardHeader>
              <CardTitle className="flex items-center text-[#40e0d0]">
                <Stethoscope className="h-5 w-5 mr-2" />
                Anamnese (SOAP)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label htmlFor="subjective" className="block text-sm font-medium text-gray-300 mb-1">Subjetivo</label>
                <Textarea
                  id="subjective"
                  value={notes.subjective}
                  onChange={(e) => setNotes({...notes, subjective: e.target.value})}
                  placeholder="Queixa principal e história da doença atual..."
                  className="bg-black/30 text-white border-gray-600"
                  rows={3}
                />
              </div>
              <div>
                <label htmlFor="objective" className="block text-sm font-medium text-gray-300 mb-1">Objetivo</label>
                <Textarea
                  id="objective"
                  value={notes.objective}
                  onChange={(e) => setNotes({...notes, objective: e.target.value})}
                  placeholder="Exame físico e achados objetivos..."
                  className="bg-black/30 text-white border-gray-600"
                  rows={3}
                />
              </div>
              <div>
                <label htmlFor="assessment" className="block text-sm font-medium text-gray-300 mb-1">Avaliação/Impressão</label>
                <Textarea
                  id="assessment"
                  value={notes.assessment}
                  onChange={(e) => setNotes({...notes, assessment: e.target.value})}
                  placeholder="Diagnóstico e hipóteses diagnósticas..."
                  className="bg-black/30 text-white border-gray-600"
                  rows={2}
                />
              </div>
              <div>
                <label htmlFor="plan" className="block text-sm font-medium text-gray-300 mb-1">Plano/Conduta</label>
                <Textarea
                  id="plan"
                  value={notes.plan}
                  onChange={(e) => setNotes({...notes, plan: e.target.value})}
                  placeholder="Plano terapêutico e condutas..."
                  className="bg-black/30 text-white border-gray-600"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Coluna Direita - Prescrições, Exames, Encaminhamentos */}
        <div className="space-y-6">
          {/* Prescrições */}
          <Card className="ssf-section text-white border-[#40e0d0]">
            <CardHeader>
              <CardTitle className="flex items-center text-[#40e0d0]">
                <FileText className="h-5 w-5 mr-2" />
                Prescrições ({prescriptions.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Lista de prescrições */}
              {prescriptions.length > 0 && (
                <div className="space-y-3">
                  {prescriptions.map((rx) => (
                    <div key={rx.id} className="bg-black/30 p-3 rounded border border-gray-600 flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-[#40e0d0]">{rx.medication}</p>
                        <p className="text-sm text-gray-300">{rx.dosage} - {rx.frequency}</p>
                        <p className="text-sm text-gray-400">{rx.duration} • {rx.instructions}</p>
                        {rx.controlledMedication && (
                          <Badge variant="destructive" className="mt-1 text-xs">Controlado</Badge>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removePrescription(rx.id!)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <div className="border-t border-gray-600 pt-3" />
                </div>
              )}

              {/* Nova prescrição */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-300">Adicionar Prescrição</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Input
                      placeholder="Nome do medicamento"
                      value={newPrescription.medication}
                      onChange={(e) => setNewPrescription({...newPrescription, medication: e.target.value})}
                      className="bg-black/30 text-white border-gray-600"
                    />
                  </div>
                  <Input
                    placeholder="Dosagem"
                    value={newPrescription.dosage}
                    onChange={(e) => setNewPrescription({...newPrescription, dosage: e.target.value})}
                    className="bg-black/30 text-white border-gray-600"
                  />
                  <Input
                    placeholder="Frequência"
                    value={newPrescription.frequency}
                    onChange={(e) => setNewPrescription({...newPrescription, frequency: e.target.value})}
                    className="bg-black/30 text-white border-gray-600"
                  />
                  <Input
                    placeholder="Duração"
                    value={newPrescription.duration}
                    onChange={(e) => setNewPrescription({...newPrescription, duration: e.target.value})}
                    className="bg-black/30 text-white border-gray-600"
                  />
                  <Input
                    placeholder="Instruções"
                    value={newPrescription.instructions}
                    onChange={(e) => setNewPrescription({...newPrescription, instructions: e.target.value})}
                    className="bg-black/30 text-white border-gray-600"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="controlled"
                    checked={newPrescription.controlledMedication}
                    onChange={(e) => setNewPrescription({...newPrescription, controlledMedication: e.target.checked})}
                    className="rounded border-gray-600"
                  />
                  <label htmlFor="controlled" className="text-sm text-gray-300">Medicamento controlado</label>
                </div>
                <Button onClick={addPrescription} className="ssf-btn w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Prescrição
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Solicitação de Exames */}
          <Card className="ssf-section text-white border-[#40e0d0]">
            <CardHeader>
              <CardTitle className="flex items-center text-[#40e0d0]">
                <FlaskConical className="h-5 w-5 mr-2" />
                Solicitação de Exames ({examRequests.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Lista de exames */}
              {examRequests.length > 0 && (
                <div className="space-y-3">
                  {examRequests.map((exam) => (
                    <div key={exam.id} className="bg-black/30 p-3 rounded border border-gray-600 flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-[#40e0d0]">{exam.examType}</p>
                        <p className="text-sm text-gray-300">{exam.description}</p>
                        {exam.notes && <p className="text-sm text-gray-400">{exam.notes}</p>}
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant={exam.priority === 'HIGH' ? 'destructive' : 'secondary'} className="text-xs">
                            {exam.priority === 'HIGH' ? 'Alta' : 'Normal'}
                          </Badge>
                          {exam.scheduledDate && (
                            <span className="text-xs text-gray-400">
                              <Clock className="h-3 w-3 inline mr-1" />
                              {new Date(exam.scheduledDate).toLocaleDateString('pt-BR')}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeExamRequest(exam.id!)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <div className="border-t border-gray-600 pt-3" />
                </div>
              )}

              {/* Novo exame */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-300">Solicitar Exame</h4>
                <div className="space-y-3">
                  <Input
                    placeholder="Tipo de exame"
                    value={newExamRequest.examType}
                    onChange={(e) => setNewExamRequest({...newExamRequest, examType: e.target.value})}
                    className="bg-black/30 text-white border-gray-600"
                  />
                  <Textarea
                    placeholder="Descrição/Indicação"
                    value={newExamRequest.description}
                    onChange={(e) => setNewExamRequest({...newExamRequest, description: e.target.value})}
                    className="bg-black/30 text-white border-gray-600"
                    rows={2}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <select
                      value={newExamRequest.priority}
                      onChange={(e) => setNewExamRequest({...newExamRequest, priority: e.target.value as 'NORMAL' | 'HIGH'})}
                      className="bg-black/30 text-white border-gray-600 rounded-md px-3 py-2 text-sm border"
                    >
                      <option value="NORMAL">Prioridade Normal</option>
                      <option value="HIGH">Prioridade Alta</option>
                    </select>
                    <Input
                      type="date"
                      value={newExamRequest.scheduledDate}
                      onChange={(e) => setNewExamRequest({...newExamRequest, scheduledDate: e.target.value})}
                      className="bg-black/30 text-white border-gray-600"
                    />
                  </div>
                  <Input
                    placeholder="Observações (opcional)"
                    value={newExamRequest.notes}
                    onChange={(e) => setNewExamRequest({...newExamRequest, notes: e.target.value})}
                    className="bg-black/30 text-white border-gray-600"
                  />
                </div>
                <Button onClick={addExamRequest} className="ssf-btn w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Solicitar Exame
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Encaminhamentos */}
          <Card className="ssf-section text-white border-[#40e0d0]">
            <CardHeader>
              <CardTitle className="flex items-center text-[#40e0d0]">
                <Send className="h-5 w-5 mr-2" />
                Encaminhamentos ({referrals.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Lista de encaminhamentos */}
              {referrals.length > 0 && (
                <div className="space-y-3">
                  {referrals.map((referral) => (
                    <div key={referral.id} className="bg-black/30 p-3 rounded border border-gray-600 flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-[#40e0d0]">{referral.specialty}</p>
                        <p className="text-sm text-gray-300">{referral.description}</p>
                        {referral.unitOrDoctor && <p className="text-sm text-gray-400">Para: {referral.unitOrDoctor}</p>}
                        {referral.notes && <p className="text-sm text-gray-400">{referral.notes}</p>}
                        <Badge variant={referral.priority === 'HIGH' ? 'destructive' : 'secondary'} className="text-xs mt-1">
                          {referral.priority === 'HIGH' ? 'Alta' : 'Normal'}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeReferral(referral.id!)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <div className="border-t border-gray-600 pt-3" />
                </div>
              )}

              {/* Novo encaminhamento */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-300">Novo Encaminhamento</h4>
                <div className="space-y-3">
                  <Input
                    placeholder="Especialidade/Serviço"
                    value={newReferral.specialty}
                    onChange={(e) => setNewReferral({...newReferral, specialty: e.target.value})}
                    className="bg-black/30 text-white border-gray-600"
                  />
                  <Textarea
                    placeholder="Motivo/Indicação"
                    value={newReferral.description}
                    onChange={(e) => setNewReferral({...newReferral, description: e.target.value})}
                    className="bg-black/30 text-white border-gray-600"
                    rows={2}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <select
                      value={newReferral.priority}
                      onChange={(e) => setNewReferral({...newReferral, priority: e.target.value as 'NORMAL' | 'HIGH'})}
                      className="bg-black/30 text-white border-gray-600 rounded-md px-3 py-2 text-sm border"
                    >
                      <option value="NORMAL">Prioridade Normal</option>
                      <option value="HIGH">Prioridade Alta</option>
                    </select>
                    <Input
                      placeholder="Unidade/Médico"
                      value={newReferral.unitOrDoctor}
                      onChange={(e) => setNewReferral({...newReferral, unitOrDoctor: e.target.value})}
                      className="bg-black/30 text-white border-gray-600"
                    />
                  </div>
                  <Input
                    placeholder="Observações (opcional)"
                    value={newReferral.notes}
                    onChange={(e) => setNewReferral({...newReferral, notes: e.target.value})}
                    className="bg-black/30 text-white border-gray-600"
                  />
                </div>
                <Button onClick={addReferral} className="ssf-btn w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Encaminhamento
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Atestados */}
          <Card className="ssf-section text-white border-[#40e0d0]">
            <CardHeader>
              <CardTitle className="flex items-center text-[#40e0d0]">
                <FileText className="h-5 w-5 mr-2" />
                Atestados ({certificates.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Lista de atestados */}
              {certificates.length > 0 && (
                <div className="space-y-3">
                  {certificates.map((cert) => (
                    <div key={cert.id} className="bg-black/30 p-3 rounded border border-gray-600 flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-[#40e0d0]">{cert.type}</p>
                        <p className="text-sm text-gray-300">{cert.description}</p>
                        {cert.days && <p className="text-sm text-gray-400">{cert.days} dia(s)</p>}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCertificate(cert.id!)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <div className="border-t border-gray-600 pt-3" />
                </div>
              )}

              {/* Novo atestado */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-300">Novo Atestado</h4>
                <div className="space-y-3">
                  <select
                    value={newCertificate.type}
                    onChange={(e) => setNewCertificate({...newCertificate, type: e.target.value})}
                    className="w-full bg-black/30 text-white border-gray-600 rounded-md px-3 py-2 text-sm border"
                  >
                    <option value="COMPARECIMENTO">Comparecimento</option>
                    <option value="AFASTAMENTO">Afastamento</option>
                    <option value="ACOMPANHANTE">Acompanhante</option>
                    <option value="SAUDE">Atestado de Saúde</option>
                  </select>
                  <Textarea
                    placeholder="Descrição do atestado"
                    value={newCertificate.description}
                    onChange={(e) => setNewCertificate({...newCertificate, description: e.target.value})}
                    className="bg-black/30 text-white border-gray-600"
                    rows={2}
                  />
                  {(newCertificate.type === 'AFASTAMENTO' || newCertificate.type === 'ACOMPANHANTE') && (
                    <Input
                      type="number"
                      placeholder="Dias"
                      min="1"
                      value={newCertificate.days}
                      onChange={(e) => setNewCertificate({...newCertificate, days: parseInt(e.target.value) || 1})}
                      className="bg-black/30 text-white border-gray-600"
                    />
                  )}
                </div>
                <Button onClick={addCertificate} className="ssf-btn w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Atestado
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Botão de salvar */}
      <div className="flex justify-center pt-6">
        <Button
          onClick={saveAll}
          disabled={saving}
          size="lg"
          className="ssf-btn px-8 py-4 text-lg"
        >
          <Save className="h-5 w-5 mr-2" />
          {saving ? 'Salvando...' : 'Salvar Consulta Completa'}
        </Button>
      </div>
    </div>
  )
}