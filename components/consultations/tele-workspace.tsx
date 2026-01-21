"use client"

import { useCallback, useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/hooks/use-toast'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { logger } from '@/lib/logger'
import { 
  Stethoscope, Activity, Save, Mic, MicOff, Loader2, 
  Pill, FileText, TestTube, User, ChevronDown, ChevronUp,
  AlertCircle
} from 'lucide-react'

type Props = {
  consultationId: string
}

export function TeleWorkspace({ consultationId }: Props) {
  interface Patient { id?: string; name?: string; age?: number; sex?: 'M'|'F' }
  interface Consultation { id?: string; patient?: Patient }

  const [consultation, setConsultation] = useState<Consultation | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [recording, setRecording] = useState(false)
  const [processing, setProcessing] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  // SOAP state
  const [soap, setSoap] = useState({
    subjective: '',
    objective: '',
    assessment: '',
    plan: ''
  })

  // Vitals (collapsed by default)
  const [showVitals, setShowVitals] = useState(false)
  type Vitals = { weight: string; height: string; bloodPressure: string; heartRate: string; temperature: string; saturation: string }
  const [vitals, setVitals] = useState<Vitals>({ weight: '', height: '', bloodPressure: '', heartRate: '', temperature: '', saturation: '' })

  const vitalsFields: Array<{ key: keyof Vitals; label: string; placeholder: string }> = [
    { key: 'weight', label: 'Peso', placeholder: 'kg' },
    { key: 'height', label: 'Altura', placeholder: 'cm' },
    { key: 'bloodPressure', label: 'PA', placeholder: 'mmHg' },
    { key: 'heartRate', label: 'FC', placeholder: 'bpm' },
    { key: 'temperature', label: 'Temp', placeholder: '°C' },
    { key: 'saturation', label: 'SpO2', placeholder: '%' },
  ]

  // Quick lists
  const [prescriptions, setPrescriptions] = useState<Array<Record<string, unknown>>>([])
  const [exams, setExams] = useState<Array<Record<string, unknown>>>([])
  const [diagnoses, setDiagnoses] = useState<Array<Record<string, unknown>>>([])

  const loadConsultation = useCallback(async () => {
    try {
      const res = await fetch(`/api/consultations/${consultationId}`)
      if (!res.ok) throw new Error('Falha ao carregar')
      const data = await res.json()
      setConsultation(data.consultation || data)
    } catch (e: unknown) {
      if (e instanceof Error) toast({ title: 'Erro', description: e.message, variant: 'destructive' })
      else toast({ title: 'Erro', description: String(e), variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [consultationId])

  // Load consultation
  useEffect(() => {
    void loadConsultation()
  }, [loadConsultation])

  // Audio recording for transcription
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
    } catch (e: unknown) {
      logger.warn('Start recording failed', e)
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
    } catch (e: unknown) {
      logger.warn('Transcription error', e)
      toast({ title: 'Erro', description: 'Falha na transcrição', variant: 'destructive' })
    } finally {
      setProcessing(false)
    }
  }

  // Save
  const saveAll = async () => {
    setSaving(true)
    try {
      await fetch(`/api/consultations/${consultationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          soap,
          vitals,
          prescriptions,
          exams,
          diagnoses
        })
      })
      toast({ title: 'Salvo!', description: 'Consulta atualizada com sucesso' })
    } catch (e: unknown) {
      logger.warn('Save error', e)
      toast({ title: 'Erro', description: 'Falha ao salvar', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col p-4 max-w-5xl mx-auto">
      {/* Header compacto do paciente */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold">{consultation?.patient?.name || 'Paciente'}</h2>
            <p className="text-sm text-muted-foreground">
              {consultation?.patient?.age && `${consultation.patient.age} anos`}
              {consultation?.patient?.sex && ` • ${consultation.patient.sex === 'M' ? 'Masculino' : 'Feminino'}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
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
          <Button onClick={saveAll} disabled={saving} size="sm">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
            Salvar
          </Button>
        </div>
      </div>

      {/* Sinais Vitais - Colapsável */}
      <div className="mb-4">
        <button 
          onClick={() => setShowVitals(!showVitals)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
        >
          <Activity className="w-4 h-4" />
          <span>Sinais Vitais</span>
          {showVitals ? <ChevronUp className="w-4 h-4 ml-auto" /> : <ChevronDown className="w-4 h-4 ml-auto" />}
          {(vitals.weight || vitals.bloodPressure) && (
            <Badge variant="secondary" className="ml-2 text-xs">
              {vitals.weight && `${vitals.weight}kg`}
              {vitals.weight && vitals.bloodPressure && ' • '}
              {vitals.bloodPressure && `PA: ${vitals.bloodPressure}`}
            </Badge>
          )}
        </button>
        {showVitals && (
          <div className="mt-2 grid grid-cols-6 gap-2 p-3 bg-muted/50 rounded-lg">
            {vitalsFields.map(({ key, label, placeholder }) => (
              <div key={key}>
                <Label className="text-xs text-muted-foreground">{label}</Label>
                <Input
                    value={vitals[key as keyof Vitals]}
                    onChange={(e) => setVitals(prev => ({ ...prev, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="h-8 text-sm"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ÁREA PRINCIPAL DO SOAP - 50%+ da tela */}
      <div className="flex-1 min-h-0">
        <Card className="h-full flex flex-col">
          <CardHeader className="py-3 flex-shrink-0 border-b">
            <CardTitle className="text-base flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-primary" />
              Prontuário SOAP
              {recording && (
                <Badge variant="destructive" className="ml-2 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-white mr-1.5 animate-pulse" />
                  Gravando
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto py-4">
            <div className="grid grid-cols-2 gap-4 h-full">
              {/* Subjetivo */}
              <div className="flex flex-col">
                <Label className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 rounded bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">S</span>
                  Subjetivo
                </Label>
                <Textarea
                  value={soap.subjective}
                  onChange={(e) => setSoap({ ...soap, subjective: e.target.value })}
                  placeholder="Queixa principal, história da doença atual, sintomas relatados pelo paciente..."
                  className="flex-1 min-h-[120px] resize-none text-sm"
                />
              </div>

              {/* Objetivo */}
              <div className="flex flex-col">
                <Label className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 rounded bg-green-100 text-green-700 flex items-center justify-center text-xs font-bold">O</span>
                  Objetivo
                </Label>
                <Textarea
                  value={soap.objective}
                  onChange={(e) => setSoap({ ...soap, objective: e.target.value })}
                  placeholder="Exame físico, dados objetivos, observações clínicas..."
                  className="flex-1 min-h-[120px] resize-none text-sm"
                />
              </div>

              {/* Avaliação */}
              <div className="flex flex-col">
                <Label className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 rounded bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold">A</span>
                  Avaliação
                </Label>
                <Textarea
                  value={soap.assessment}
                  onChange={(e) => setSoap({ ...soap, assessment: e.target.value })}
                  placeholder="Diagnóstico, hipóteses diagnósticas, impressão clínica..."
                  className="flex-1 min-h-[120px] resize-none text-sm"
                />
              </div>

              {/* Plano */}
              <div className="flex flex-col">
                <Label className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 rounded bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-bold">P</span>
                  Plano
                </Label>
                <Textarea
                  value={soap.plan}
                  onChange={(e) => setSoap({ ...soap, plan: e.target.value })}
                  placeholder="Conduta, tratamento, prescrições, encaminhamentos, orientações..."
                  className="flex-1 min-h-[120px] resize-none text-sm"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs para Prescrições, Exames, CID - Footer compacto */}
      <div className="mt-4 flex-shrink-0">
        <Tabs defaultValue="prescriptions" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="prescriptions" className="text-xs">
              <Pill className="w-3 h-3 mr-1" />
              Prescrições {prescriptions.length > 0 && `(${prescriptions.length})`}
            </TabsTrigger>
            <TabsTrigger value="exams" className="text-xs">
              <TestTube className="w-3 h-3 mr-1" />
              Exames {exams.length > 0 && `(${exams.length})`}
            </TabsTrigger>
            <TabsTrigger value="diagnoses" className="text-xs">
              <FileText className="w-3 h-3 mr-1" />
              CID-10 {diagnoses.length > 0 && `(${diagnoses.length})`}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="prescriptions" className="mt-2">
            <div className="flex gap-2 items-center">
              <Input placeholder="Buscar medicamento..." className="flex-1 h-8 text-sm" />
              <Button size="sm" variant="outline">Adicionar</Button>
            </div>
            {prescriptions.length === 0 && (
              <p className="text-xs text-muted-foreground mt-2 text-center py-2">
                Nenhuma prescrição adicionada
              </p>
            )}
          </TabsContent>
          
          <TabsContent value="exams" className="mt-2">
            <div className="flex gap-2 items-center">
              <Input placeholder="Buscar exame..." className="flex-1 h-8 text-sm" />
              <Button size="sm" variant="outline">Adicionar</Button>
            </div>
            {exams.length === 0 && (
              <p className="text-xs text-muted-foreground mt-2 text-center py-2">
                Nenhum exame solicitado
              </p>
            )}
          </TabsContent>
          
          <TabsContent value="diagnoses" className="mt-2">
            <div className="flex gap-2 items-center">
              <Input placeholder="Buscar CID-10..." className="flex-1 h-8 text-sm" />
              <Button size="sm" variant="outline">Adicionar</Button>
            </div>
            {diagnoses.length === 0 && (
              <p className="text-xs text-muted-foreground mt-2 text-center py-2">
                Nenhum diagnóstico registrado
              </p>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
