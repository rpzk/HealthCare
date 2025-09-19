"use client"

import { useEffect, useState } from 'react'
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
import { toast } from '@/hooks/use-toast'

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
                  <Label htmlFor="weight" className="text-gray-300">Peso (kg)</Label>
                  <Input
                    id="weight"
                    value={vitals.weight}
                    onChange={(e) => setVitals({...vitals, weight: e.target.value})}
                    placeholder="70.5"
                    className="bg-black/30 text-white border-gray-600"
                  />
                </div>
                <div>
                  <Label htmlFor="height" className="text-gray-300">Altura (cm)</Label>
                  <Input
                    id="height"
                    value={vitals.height}
                    onChange={(e) => setVitals({...vitals, height: e.target.value})}
                    placeholder="175"
                    className="bg-black/30 text-white border-gray-600"
                  />
                </div>
                <div>
                  <Label htmlFor="bp" className="text-gray-300">PA (mmHg)</Label>
                  <Input
                    id="bp"
                    value={vitals.bloodPressure}
                    onChange={(e) => setVitals({...vitals, bloodPressure: e.target.value})}
                    placeholder="120/80"
                    className="bg-black/30 text-white border-gray-600"
                  />
                </div>
                <div>
                  <Label htmlFor="hr" className="text-gray-300">FC (bpm)</Label>
                  <Input
                    id="hr"
                    value={vitals.heartRate}
                    onChange={(e) => setVitals({...vitals, heartRate: e.target.value})}
                    placeholder="72"
                    className="bg-black/30 text-white border-gray-600"
                  />
                </div>
                <div>
                  <Label htmlFor="temp" className="text-gray-300">Temperatura (°C)</Label>
                  <Input
                    id="temp"
                    value={vitals.temperature}
                    onChange={(e) => setVitals({...vitals, temperature: e.target.value})}
                    placeholder="36.5"
                    className="bg-black/30 text-white border-gray-600"
                  />
                </div>
                <div>
                  <Label htmlFor="sat" className="text-gray-300">SpO2 (%)</Label>
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
                <Label htmlFor="subjective" className="text-gray-300">Subjetivo</Label>
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
                <Label htmlFor="objective" className="text-gray-300">Objetivo</Label>
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
                <Label htmlFor="assessment" className="text-gray-300">Avaliação/Impressão</Label>
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
                <Label htmlFor="plan" className="text-gray-300">Plano/Conduta</Label>
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
                  <Separator className="bg-gray-600" />
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
                  />
                  <Label htmlFor="controlled" className="text-sm text-gray-300">Medicamento controlado</Label>
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
                  <Separator className="bg-gray-600" />
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
                    <Select
                      value={newExamRequest.priority}
                      onValueChange={(value: 'NORMAL' | 'HIGH') => setNewExamRequest({...newExamRequest, priority: value})}
                    >
                      <SelectTrigger className="bg-black/30 text-white border-gray-600">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NORMAL">Prioridade Normal</SelectItem>
                        <SelectItem value="HIGH">Prioridade Alta</SelectItem>
                      </SelectContent>
                    </Select>
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
                  <Separator className="bg-gray-600" />
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
                    <Select
                      value={newReferral.priority}
                      onValueChange={(value: 'NORMAL' | 'HIGH') => setNewReferral({...newReferral, priority: value})}
                    >
                      <SelectTrigger className="bg-black/30 text-white border-gray-600">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NORMAL">Prioridade Normal</SelectItem>
                        <SelectItem value="HIGH">Prioridade Alta</SelectItem>
                      </SelectContent>
                    </Select>
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
                  <Separator className="bg-gray-600" />
                </div>
              )}

              {/* Novo atestado */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-300">Novo Atestado</h4>
                <div className="space-y-3">
                  <Select
                    value={newCertificate.type}
                    onValueChange={(value) => setNewCertificate({...newCertificate, type: value})}
                  >
                    <SelectTrigger className="bg-black/30 text-white border-gray-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="COMPARECIMENTO">Comparecimento</SelectItem>
                      <SelectItem value="AFASTAMENTO">Afastamento</SelectItem>
                      <SelectItem value="ACOMPANHANTE">Acompanhante</SelectItem>
                      <SelectItem value="SAUDE">Atestado de Saúde</SelectItem>
                    </SelectContent>
                  </Select>
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