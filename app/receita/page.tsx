'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Plus, 
  Trash2, 
  FileText, 
  ShieldCheck,
  Loader2,
  AlertCircle,
  CheckCircle,
  Download,
  Search,
  User,
  Calendar,
  Pill,
  Stethoscope,
  Clock,
  ExternalLink,
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// ========================================
// TIPOS
// ========================================

interface Patient {
  id: string
  name: string
  cpf?: string
  birthDate?: string
  email?: string
  phone?: string
}

interface Medication {
  genericName: string      // DCB obrigatório
  brandName?: string       // Nome comercial opcional
  concentration: string    // Ex: 500mg
  pharmaceuticalForm: string // Ex: comprimido, cápsula
  quantity: number
  quantityUnit: string     // Ex: comprimidos, cápsulas
  dosage: string           // Ex: 1 comprimido
  route: string            // Ex: oral, tópico
  frequency: string        // Ex: de 8 em 8 horas
  duration: string         // Ex: por 7 dias
  instructions?: string    // Instruções adicionais
}

interface SessionStatus {
  active: boolean
  locked: boolean
  remainingTimeFormatted?: string
}

interface Doctor {
  id: string
  name: string
  crmNumber?: string
  crmState?: string
  speciality?: string
}

// ========================================
// COMPONENTE PRINCIPAL
// ========================================

export default function ReceitaMedicaPage() {
  const { data: session, status: authStatus } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const printFrameRef = useRef<HTMLIFrameElement>(null)
  
  // Estado do formulário
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [patientSearch, setPatientSearch] = useState('')
  const [patientResults, setPatientResults] = useState<Patient[]>([])
  const [searchingPatient, setSearchingPatient] = useState(false)
  
  const [medications, setMedications] = useState<Medication[]>([])
  const [notes, setNotes] = useState('')
  const [usageType, setUsageType] = useState<'INTERNAL' | 'EXTERNAL' | 'TOPICAL'>('INTERNAL')
  
  // Estado da sessão de certificado
  const [certSession, setCertSession] = useState<SessionStatus>({ active: false, locked: false })
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [certPassword, setCertPassword] = useState('')
  
  // Estado de processamento
  const [generating, setGenerating] = useState(false)
  const [signing, setSigning] = useState(false)
  const [generatedPdfUrl, setGeneratedPdfUrl] = useState<string | null>(null)
  const [prescriptionId, setPrescriptionId] = useState<string | null>(null)
  
  // Dados do médico logado
  const [doctor, setDoctor] = useState<Doctor | null>(null)
  
  // ========================================
  // EFEITOS
  // ========================================
  
  // Carregar dados do médico
  useEffect(() => {
    if (authStatus === 'authenticated') {
      fetchDoctorInfo()
      checkCertificateSession()
    }
  }, [authStatus])
  
  // Se vier com consultationId, carregar dados da consulta
  useEffect(() => {
    const consultationId = searchParams?.get('consultationId')
    const patientId = searchParams?.get('patientId')
    
    if (patientId) {
      fetchPatientById(patientId)
    } else if (consultationId) {
      fetchConsultationData(consultationId)
    }
  }, [searchParams])
  
  // ========================================
  // FUNÇÕES DE BUSCA
  // ========================================
  
  const fetchDoctorInfo = async () => {
    try {
      const res = await fetch('/api/user/profile')
      if (res.ok) {
        const data = await res.json()
        setDoctor({
          id: data.id,
          name: data.name,
          crmNumber: data.crmNumber,
          crmState: data.crmState,
          speciality: data.speciality,
        })
      }
    } catch (error) {
      console.error('Erro ao buscar dados do médico:', error)
    }
  }
  
  const checkCertificateSession = async () => {
    try {
      const res = await fetch('/api/certificate-session')
      if (res.ok) {
        const data = await res.json()
        setCertSession({
          active: data.session?.active && !data.session?.locked,
          locked: data.session?.locked || false,
          remainingTimeFormatted: data.session?.remainingTimeFormatted,
        })
      }
    } catch (error) {
      console.error('Erro ao verificar sessão:', error)
    }
  }
  
  const fetchPatientById = async (id: string) => {
    try {
      const res = await fetch(`/api/patients/${id}`)
      if (res.ok) {
        const data = await res.json()
        setSelectedPatient({
          id: data.id,
          name: data.name,
          cpf: data.cpf,
          birthDate: data.birthDate,
          email: data.email,
          phone: data.phone,
        })
      }
    } catch (error) {
      console.error('Erro ao buscar paciente:', error)
    }
  }
  
  const fetchConsultationData = async (id: string) => {
    try {
      const res = await fetch(`/api/consultations/${id}`)
      if (res.ok) {
        const data = await res.json()
        if (data.patient) {
          setSelectedPatient({
            id: data.patient.id,
            name: data.patient.name,
            cpf: data.patient.cpf,
            birthDate: data.patient.birthDate,
          })
        }
      }
    } catch (error) {
      console.error('Erro ao buscar consulta:', error)
    }
  }
  
  const searchPatients = useCallback(async (term: string) => {
    if (term.length < 2) {
      setPatientResults([])
      return
    }
    
    setSearchingPatient(true)
    try {
      const res = await fetch(`/api/patients?search=${encodeURIComponent(term)}&limit=5`)
      if (res.ok) {
        const data = await res.json()
        setPatientResults(data.patients || [])
      }
    } catch (error) {
      console.error('Erro ao buscar pacientes:', error)
    } finally {
      setSearchingPatient(false)
    }
  }, [])
  
  // Debounce da busca de pacientes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (patientSearch && !selectedPatient) {
        searchPatients(patientSearch)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [patientSearch, selectedPatient, searchPatients])
  
  // ========================================
  // FUNÇÕES DE MEDICAMENTOS
  // ========================================
  
  const addMedication = () => {
    setMedications(prev => [...prev, {
      genericName: '',
      brandName: '',
      concentration: '',
      pharmaceuticalForm: 'comprimido',
      quantity: 1,
      quantityUnit: 'comprimido(s)',
      dosage: '1 comprimido',
      route: 'oral',
      frequency: 'de 8 em 8 horas',
      duration: 'por 7 dias',
      instructions: '',
    }])
  }
  
  const updateMedication = (index: number, field: keyof Medication, value: string | number) => {
    setMedications(prev => prev.map((med, i) => 
      i === index ? { ...med, [field]: value } : med
    ))
  }
  
  const removeMedication = (index: number) => {
    setMedications(prev => prev.filter((_, i) => i !== index))
  }
  
  // ========================================
  // FUNÇÕES DE GERAÇÃO E ASSINATURA
  // ========================================
  
  const validateForm = (): boolean => {
    if (!selectedPatient) {
      toast.error('Selecione um paciente')
      return false
    }
    
    if (medications.length === 0) {
      toast.error('Adicione pelo menos um medicamento')
      return false
    }
    
    for (let i = 0; i < medications.length; i++) {
      const med = medications[i]
      if (!med.genericName.trim()) {
        toast.error(`Medicamento ${i + 1}: Nome genérico (DCB) é obrigatório`)
        return false
      }
      if (!med.concentration.trim()) {
        toast.error(`Medicamento ${i + 1}: Concentração é obrigatória`)
        return false
      }
    }
    
    if (!doctor?.crmNumber) {
      toast.error('Seu CRM não está cadastrado. Configure no perfil.')
      return false
    }
    
    return true
  }
  
  const startCertificateSession = async () => {
    if (!certPassword) {
      toast.error('Digite a senha do certificado')
      return
    }
    
    setSigning(true)
    try {
      const res = await fetch('/api/certificate-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: certPassword }),
      })
      
      const data = await res.json()
      
      if (res.ok) {
        toast.success('Certificado ativado!')
        setCertSession({ active: true, locked: false, remainingTimeFormatted: '4h' })
        setShowPasswordDialog(false)
        setCertPassword('')
        
        // Agora gera a receita
        await generatePrescription()
      } else {
        toast.error(data.error || 'Senha incorreta')
      }
    } catch (error) {
      toast.error('Erro ao ativar certificado')
    } finally {
      setSigning(false)
    }
  }
  
  const generatePrescription = async () => {
    if (!validateForm()) return
    
    // Se não tem sessão ativa, pedir senha
    if (!certSession.active) {
      setShowPasswordDialog(true)
      return
    }
    
    setGenerating(true)
    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'PRESCRIPTION',
          patientId: selectedPatient!.id,
          usageType,
          medications: medications.map(med => ({
            genericName: med.genericName,
            brandName: med.brandName || undefined,
            concentration: med.concentration,
            pharmaceuticalForm: med.pharmaceuticalForm,
            quantity: med.quantity,
            quantityUnit: med.quantityUnit,
            dosage: med.dosage,
            route: med.route,
            frequency: med.frequency,
            duration: med.duration,
            instructions: med.instructions || undefined,
          })),
          notes: notes || undefined,
        }),
      })
      
      const data = await res.json()
      
      if (res.ok && data.success) {
        toast.success('Receita gerada e assinada!')
        setPrescriptionId(data.documentId)
        setGeneratedPdfUrl(`/api/documents/${data.documentId}/pdf`)
      } else {
        toast.error(data.error || 'Erro ao gerar receita')
      }
    } catch (error) {
      toast.error('Erro ao comunicar com o servidor')
      console.error(error)
    } finally {
      setGenerating(false)
    }
  }
  
  const handleDownload = async () => {
    if (generatedPdfUrl) {
      const a = document.createElement('a')
      a.href = generatedPdfUrl
      a.download = `receita-${prescriptionId}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }
  }
  
  const resetForm = () => {
    setSelectedPatient(null)
    setPatientSearch('')
    setMedications([])
    setNotes('')
    setGeneratedPdfUrl(null)
    setPrescriptionId(null)
  }
  
  // ========================================
  // RENDERIZAÇÃO
  // ========================================
  
  if (authStatus === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }
  
  if (authStatus === 'unauthenticated') {
    router.push('/auth/login')
    return null
  }
  
  return (
    <div className="min-h-screen bg-muted/40">
      <Header />
      <div className="flex pt-16">
        <Sidebar />
        <main className="flex-1 ml-64 p-6">
          
          {/* Cabeçalho */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <FileText className="h-6 w-6" />
                Receita Médica
              </h1>
              <p className="text-muted-foreground">
                Prescrição eletrônica conforme CFM 2.299/2021
              </p>
            </div>
            
            {/* Status do certificado */}
            <div className="flex items-center gap-3">
              {certSession.active ? (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 gap-1">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Assinatura ativa ({certSession.remainingTimeFormatted})
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300 gap-1">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Certificado não ativado
                </Badge>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Coluna principal - Formulário */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Card: Paciente */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Paciente
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedPatient ? (
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div>
                        <p className="font-medium">{selectedPatient.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {selectedPatient.cpf && `CPF: ${selectedPatient.cpf}`}
                          {selectedPatient.birthDate && ` • Nasc: ${format(new Date(selectedPatient.birthDate), 'dd/MM/yyyy')}`}
                        </p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          setSelectedPatient(null)
                          setPatientSearch('')
                        }}
                      >
                        Trocar
                      </Button>
                    </div>
                  ) : (
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar paciente por nome ou CPF..."
                        value={patientSearch}
                        onChange={(e) => setPatientSearch(e.target.value)}
                        className="pl-9"
                      />
                      {patientResults.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-lg">
                          {patientResults.map((p) => (
                            <button
                              key={p.id}
                              className="w-full px-4 py-2 text-left hover:bg-muted flex justify-between items-center"
                              onClick={() => {
                                setSelectedPatient(p)
                                setPatientSearch('')
                                setPatientResults([])
                              }}
                            >
                              <span>{p.name}</span>
                              <span className="text-sm text-muted-foreground">{p.cpf}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      {searchingPatient && (
                        <div className="absolute right-3 top-3">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Card: Medicamentos */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Pill className="h-5 w-5" />
                      Medicamentos
                    </CardTitle>
                    <Button size="sm" onClick={addMedication}>
                      <Plus className="h-4 w-4 mr-1" />
                      Adicionar
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {medications.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Pill className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>Nenhum medicamento adicionado</p>
                      <Button variant="outline" className="mt-3" onClick={addMedication}>
                        <Plus className="h-4 w-4 mr-1" />
                        Adicionar medicamento
                      </Button>
                    </div>
                  ) : (
                    medications.map((med, index) => (
                      <div key={index} className="p-4 border rounded-lg space-y-3 relative">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2 h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => removeMedication(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        
                        <div className="pr-10">
                          <Badge variant="outline" className="mb-2">
                            Medicamento {index + 1}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="md:col-span-2">
                            <Label className="text-xs text-muted-foreground">
                              Nome Genérico (DCB) *
                            </Label>
                            <Input
                              placeholder="Ex: Amoxicilina"
                              value={med.genericName}
                              onChange={(e) => updateMedication(index, 'genericName', e.target.value)}
                            />
                          </div>
                          
                          <div>
                            <Label className="text-xs text-muted-foreground">
                              Nome Comercial (opcional)
                            </Label>
                            <Input
                              placeholder="Ex: Amoxil"
                              value={med.brandName}
                              onChange={(e) => updateMedication(index, 'brandName', e.target.value)}
                            />
                          </div>
                          
                          <div>
                            <Label className="text-xs text-muted-foreground">
                              Concentração *
                            </Label>
                            <Input
                              placeholder="Ex: 500mg"
                              value={med.concentration}
                              onChange={(e) => updateMedication(index, 'concentration', e.target.value)}
                            />
                          </div>
                          
                          <div>
                            <Label className="text-xs text-muted-foreground">
                              Forma Farmacêutica
                            </Label>
                            <Select
                              value={med.pharmaceuticalForm}
                              onValueChange={(v) => updateMedication(index, 'pharmaceuticalForm', v)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="comprimido">Comprimido</SelectItem>
                                <SelectItem value="cápsula">Cápsula</SelectItem>
                                <SelectItem value="solução oral">Solução oral</SelectItem>
                                <SelectItem value="suspensão">Suspensão</SelectItem>
                                <SelectItem value="pomada">Pomada</SelectItem>
                                <SelectItem value="creme">Creme</SelectItem>
                                <SelectItem value="gel">Gel</SelectItem>
                                <SelectItem value="injetável">Injetável</SelectItem>
                                <SelectItem value="colírio">Colírio</SelectItem>
                                <SelectItem value="aerossol">Aerossol</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <Label className="text-xs text-muted-foreground">
                              Quantidade
                            </Label>
                            <div className="flex gap-2">
                              <Input
                                type="number"
                                min={1}
                                value={med.quantity}
                                onChange={(e) => updateMedication(index, 'quantity', parseInt(e.target.value) || 1)}
                                className="w-20"
                              />
                              <Input
                                placeholder="comprimidos"
                                value={med.quantityUnit}
                                onChange={(e) => updateMedication(index, 'quantityUnit', e.target.value)}
                              />
                            </div>
                          </div>
                          
                          <div>
                            <Label className="text-xs text-muted-foreground">
                              Via de Administração
                            </Label>
                            <Select
                              value={med.route}
                              onValueChange={(v) => updateMedication(index, 'route', v)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="oral">Oral</SelectItem>
                                <SelectItem value="sublingual">Sublingual</SelectItem>
                                <SelectItem value="tópico">Tópico</SelectItem>
                                <SelectItem value="oftálmico">Oftálmico</SelectItem>
                                <SelectItem value="nasal">Nasal</SelectItem>
                                <SelectItem value="inalatório">Inalatório</SelectItem>
                                <SelectItem value="retal">Retal</SelectItem>
                                <SelectItem value="vaginal">Vaginal</SelectItem>
                                <SelectItem value="intramuscular">Intramuscular</SelectItem>
                                <SelectItem value="intravenoso">Intravenoso</SelectItem>
                                <SelectItem value="subcutâneo">Subcutâneo</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <Label className="text-xs text-muted-foreground">
                              Posologia
                            </Label>
                            <Input
                              placeholder="Ex: 1 comprimido"
                              value={med.dosage}
                              onChange={(e) => updateMedication(index, 'dosage', e.target.value)}
                            />
                          </div>
                          
                          <div>
                            <Label className="text-xs text-muted-foreground">
                              Frequência
                            </Label>
                            <Input
                              placeholder="Ex: de 8 em 8 horas"
                              value={med.frequency}
                              onChange={(e) => updateMedication(index, 'frequency', e.target.value)}
                            />
                          </div>
                          
                          <div>
                            <Label className="text-xs text-muted-foreground">
                              Duração
                            </Label>
                            <Input
                              placeholder="Ex: por 7 dias"
                              value={med.duration}
                              onChange={(e) => updateMedication(index, 'duration', e.target.value)}
                            />
                          </div>
                          
                          <div className="md:col-span-2">
                            <Label className="text-xs text-muted-foreground">
                              Instruções adicionais
                            </Label>
                            <Input
                              placeholder="Ex: Tomar após as refeições"
                              value={med.instructions}
                              onChange={(e) => updateMedication(index, 'instructions', e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
              
              {/* Card: Observações */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Observações</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Orientações adicionais para o paciente..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />
                </CardContent>
              </Card>
              
            </div>
            
            {/* Coluna lateral - Preview e Ações */}
            <div className="space-y-6">
              
              {/* Card: Dados do Médico */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Stethoscope className="h-5 w-5" />
                    Prescritor
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {doctor ? (
                    <>
                      <p className="font-medium">{doctor.name}</p>
                      {doctor.crmNumber && (
                        <p className="text-muted-foreground">
                          CRM {doctor.crmNumber}/{doctor.crmState}
                        </p>
                      )}
                      {doctor.speciality && (
                        <p className="text-muted-foreground">{doctor.speciality}</p>
                      )}
                    </>
                  ) : (
                    <p className="text-muted-foreground">Carregando...</p>
                  )}
                </CardContent>
              </Card>
              
              {/* Card: Ações */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Ações</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  
                  {!generatedPdfUrl ? (
                    <>
                      <Button 
                        className="w-full" 
                        size="lg"
                        onClick={generatePrescription}
                        disabled={generating || !selectedPatient || medications.length === 0}
                      >
                        {generating ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Gerando...
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="h-4 w-4 mr-2" />
                            Gerar e Assinar
                          </>
                        )}
                      </Button>
                      
                      <p className="text-xs text-center text-muted-foreground">
                        O documento será assinado digitalmente com seu certificado ICP-Brasil
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                        <CheckCircle className="h-8 w-8 mx-auto text-green-600 mb-2" />
                        <p className="font-medium text-green-800 dark:text-green-300">
                          Receita assinada!
                        </p>
                        <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                          Documento válido conforme ICP-Brasil
                        </p>
                      </div>
                      
                      <Separator />
                      
                      <Button variant="default" className="w-full" size="lg" onClick={handleDownload}>
                        <Download className="h-4 w-4 mr-2" />
                        Baixar PDF
                      </Button>
                      
                      {prescriptionId && (
                        <>
                          <Button 
                            variant="outline" 
                            className="w-full"
                            onClick={async () => {
                              try {
                                const res = await fetch(`/api/prescriptions/${prescriptionId}/signature`)
                                const data = await res.json()
                                const pageUrl = data?.verificationPageUrl ?? (data?.signatureHash ? `/verify/${data.signatureHash}` : null)
                                if (pageUrl) window.open(pageUrl, '_blank')
                                else toast.error('Verificação disponível após assinatura.')
                              } catch {
                                toast.error('Erro ao abrir verificação')
                              }
                            }}
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Verificar
                          </Button>
                          <Button 
                            variant="ghost" 
                            className="w-full"
                            onClick={async () => {
                              try {
                                const res = await fetch(`/api/prescriptions/${prescriptionId}/signature`)
                                const data = await res.json()
                                const pageUrl = data?.verificationPageUrl ?? (data?.signatureHash ? `/verify/${data.signatureHash}` : null)
                                if (!pageUrl) {
                                  toast.error('Compartilhe após assinar.')
                                  return
                                }
                                const shareUrl = `${window.location.origin}${pageUrl}`
                                await navigator.clipboard.writeText(shareUrl)
                                toast.success('Link de verificação copiado.')
                              } catch {
                                toast.error('Erro ao copiar link')
                              }
                            }}
                          >
                            Compartilhar link de verificação
                          </Button>
                        </>
                      )}
                      
                      <Button 
                        variant="ghost" 
                        className="w-full"
                        onClick={() => window.open('https://validar.iti.gov.br', '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Verificar no ITI
                      </Button>
                      
                      <Separator />
                      
                      <Button variant="outline" className="w-full" onClick={resetForm}>
                        <Plus className="h-4 w-4 mr-2" />
                        Nova Receita
                      </Button>
                    </>
                  )}
                  
                </CardContent>
              </Card>
              
              {/* Card: Info Legal */}
              <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200">
                <CardContent className="pt-4 text-sm text-blue-800 dark:text-blue-300">
                  <p className="font-medium mb-2">Conformidade Legal</p>
                  <ul className="space-y-1 text-xs">
                    <li>• CFM 2.299/2021 - Prescrição eletrônica</li>
                    <li>• Lei 9.787/99 - Denominação genérica</li>
                    <li>• ICP-Brasil - Assinatura digital válida</li>
                    <li>• Validável em validar.iti.gov.br</li>
                  </ul>
                </CardContent>
              </Card>
              
            </div>
            
          </div>
          
        </main>
      </div>
      
      {/* Dialog: Senha do Certificado */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Ativar Certificado Digital
            </DialogTitle>
            <DialogDescription>
              Digite a senha do seu certificado A1 para assinar o documento.
              A sessão ficará ativa por 4 horas.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="cert-pwd">Senha do certificado</Label>
              <Input
                id="cert-pwd"
                type="password"
                placeholder="Digite a senha do seu certificado A1"
                value={certPassword}
                onChange={(e) => setCertPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && startCertificateSession()}
                autoFocus
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={startCertificateSession} disabled={signing || !certPassword}>
              {signing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Verificando...
                </>
              ) : (
                'Ativar e Assinar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* iframe oculto para impressão */}
      <iframe
        ref={printFrameRef}
        className="hidden"
        title="Print Frame"
      />
      
    </div>
  )
}
