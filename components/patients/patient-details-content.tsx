'use client'

import { useState } from 'react'
import { StartConsultationButton } from '@/components/consultations/start-consultation-button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { parseAllergies } from '@/lib/patient-schemas'
import { PatientDevelopment } from '@/components/patients/patient-development'
import { PatientQuestionnaires } from '@/components/patients/patient-questionnaires'
import { PatientDiagnoses } from '@/components/patients/patient-diagnoses'
import { PatientMedicationsDetailed } from '@/components/patients/patient-medications-detailed'
import { PatientExamsDetailed } from '@/components/patients/patient-exams-detailed'
import { PatientReferrals } from '@/components/patients/patient-referrals'
import { PatientCertificates } from '@/components/patients/patient-certificates'
import { PatientMedicalRecords } from '@/components/patients/patient-medical-records'
import { PatientMetrics } from '@/components/patients/patient-metrics'
import { PatientTimeline } from '@/components/patients/patient-timeline'
import { PatientCharts } from '@/components/patients/patient-charts'
import {
  User,
  Users,
  FileText,
  Pill,
  TestTube,
  Sparkles,
  Calendar,
  Phone,
  Mail,
  MapPin,
  AlertCircle,
  Heart,
  Activity,
  ClipboardList,
  Send,
  ArrowRightCircle,
  BarChart3,
  Clock,
} from 'lucide-react'
import { PatientCareTeam } from '@/components/patients/patient-care-team'

interface Diagnosis {
  id: string
  primaryCodeId: string
  secondaryCodeId?: string | null
  primaryCode: {
    id: string
    code: string
    description: string
  }
  secondaryCode?: {
    id: string
    code: string
    description: string
  } | null
  notes?: string | null
  severity?: string | null
  isActive: boolean
  createdAt: string | Date
}

interface VitalSigns {
  id: string
  measuredAt?: string | Date
  recordedAt?: string | Date
  temperature?: number | null
  bloodPressureSystolic?: number | null
  bloodPressureDiastolic?: number | null
  heartRate?: number | null
  respiratoryRate?: number | null
  oxygenSaturation?: number | null
  weight?: number | null
  height?: number | null
}

interface PrescriptionItem {
  id: string
  medication?: {
    id: string
    name: string
    synonym?: string | null
    strength?: string | null
    form?: string | null
    componente?: string | null
    controlado?: boolean
    antimicrobiano?: boolean
  } | null
  dosage: string
  frequency: string
  duration: string
  instructions?: string | null
  quantity?: number | null
}

interface Consultation {
  id: string
  scheduledDate: string | Date
  assessment?: string | null
  notes?: string | null
  diagnoses: Diagnosis[]
  vitalSigns: VitalSigns[]
  doctor: {
    id: string
    name: string
    speciality?: string | null
    crmNumber: string
  }
}

interface Prescription {
  id: string
  createdAt: string | Date
  status: string
  isActive?: boolean
  expiresAt?: string | Date | null
  doctor: {
    id: string
    name: string
    crmNumber: string
  }
  items: PrescriptionItem[]
}

interface ExamRequest {
  id: string
  createdAt: string | Date
  status: string
  examType?: string | null
  description?: string | null
  urgency?: string | null
  justification?: string | null
  results?: string | null
  resultsDate?: string | Date | null
  doctor: {
    name: string
  }
  procedimento?: {
    id: string
    codigo: string
    nome: string
    complexidade?: string | null
  } | null
}

interface Referral {
  id: string
  specialty?: string | null
  reason: string
  priority?: string | null
  status: string
  createdAt: string | Date
  doctor: {
    name: string
  }
  targetOccupation?: {
    id: string
    code: string
    title: string
    familyGroup?: {
      code: string
      title: string
    }
  } | null
  destinationUnit?: {
    id: string
    name: string
    type: string
  } | null
}

interface MedicalCertificate {
  id: string
  sequenceNumber: number
  year: number
  type: string
  days?: number | null
  startDate: string | Date
  endDate?: string | Date | null
  title: string
  content: string
  issuedAt: string | Date
  revokedAt?: string | Date | null
  doctor: {
    name: string
    crmNumber?: string | null
    speciality?: string | null
  }
  consultation?: {
    id: string
    scheduledDate: string | Date
  } | null
}

interface MedicalRecord {
  id: string
  title: string
  description: string
  diagnosis?: string | null
  treatment?: string | null
  recordType: string
  createdAt: string | Date
  doctor: {
    name: string
    speciality?: string | null
  }
}

interface Address {
  id?: string
  street: string
  number: string
  complement?: string | null
  neighborhood?: string | null
  city: string
  state: string
  zipCode?: string | null
  isPrimary?: boolean
}

interface Patient {
  id: string
  name: string
  cpf?: string | null
  email?: string | null
  phone?: string | null
  birthDate?: string | Date | null
  gender?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  zipCode?: string | null
  bloodType?: string | null
  allergies?: string | string[] | null
  observations?: string | null
  createdAt?: Date
  consultations?: Consultation[]
  prescriptions?: Prescription[]
  ExamRequest?: ExamRequest[]
  referrals?: Referral[]
  medicalCertificates?: MedicalCertificate[]
  medicalRecords?: MedicalRecord[]
  vitalSigns?: VitalSigns[]
  addresses?: Address[]
}

interface PatientDetailsContentProps {
  patient: Patient
  onClose?: () => void
  defaultTab?: string
}

export function PatientDetailsContent({ patient, onClose, defaultTab = 'overview' }: PatientDetailsContentProps) {
  const [activeTab, setActiveTab] = useState(defaultTab)

  const formatZipCodePtBR = (zip: string | null | undefined) => {
    if (!zip) return ''
    const digits = String(zip).replace(/\D/g, '')
    if (digits.length === 8) return `${digits.slice(0, 5)}-${digits.slice(5)}`
    return String(zip)
  }

  const toSafeBirthDate = (birthDate: string | Date | null | undefined): Date | null => {
    if (!birthDate) return null
    const raw = typeof birthDate === 'string' ? birthDate : birthDate.toISOString()
    const dateOnly = raw.slice(0, 10)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
      const parsed = new Date(raw)
      return isNaN(parsed.getTime()) ? null : parsed
    }
    const safe = new Date(`${dateOnly}T12:00:00.000Z`)
    return isNaN(safe.getTime()) ? null : safe
  }

  const calculateAge = (birthDate: string | Date | null | undefined) => {
    const birth = toSafeBirthDate(birthDate)
    if (!birth) return null
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age
  }

  const age = calculateAge(patient.birthDate)

  const allergies = parseAllergies(patient.allergies)
  const primaryAddress = patient.addresses?.find((a) => a.isPrimary) || patient.addresses?.[0]
  const addressText = primaryAddress
    ? [
        primaryAddress.street,
        primaryAddress.number,
        primaryAddress.complement,
        primaryAddress.neighborhood,
        primaryAddress.city,
        primaryAddress.state,
        formatZipCodePtBR(primaryAddress.zipCode),
      ]
        .filter(Boolean)
        .join(', ')
    : (patient.address || [patient.address, patient.city, patient.state, formatZipCodePtBR(patient.zipCode)].filter(Boolean).join(', ') || '')

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="space-y-2">
          <TabsList className="grid w-full grid-cols-7 lg:w-auto lg:inline-grid">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Visão Geral</span>
            </TabsTrigger>
            <TabsTrigger value="metrics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Métricas</span>
            </TabsTrigger>
            <TabsTrigger value="timeline" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Timeline</span>
            </TabsTrigger>
            <TabsTrigger value="diagnoses" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">Diagnósticos</span>
            </TabsTrigger>
            <TabsTrigger value="medications" className="flex items-center gap-2">
              <Pill className="h-4 w-4" />
              <span className="hidden sm:inline">Medicações</span>
            </TabsTrigger>
            <TabsTrigger value="exams" className="flex items-center gap-2">
              <TestTube className="h-4 w-4" />
              <span className="hidden sm:inline">Exames</span>
            </TabsTrigger>
            <TabsTrigger value="referrals" className="flex items-center gap-2">
              <ArrowRightCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Encaminhamentos</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 lg:w-auto lg:inline-grid">
            <TabsTrigger value="consultations" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Consultas</span>
            </TabsTrigger>
            <TabsTrigger value="certificates" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Atestados</span>
            </TabsTrigger>
            <TabsTrigger value="records" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Registros</span>
            </TabsTrigger>
            <TabsTrigger value="questionnaires" className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              <span className="hidden sm:inline">Questionários</span>
            </TabsTrigger>
            <TabsTrigger value="care-team" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Equipe</span>
            </TabsTrigger>
            <TabsTrigger value="development" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">Desenvolvimento</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Visão Geral */}
        <TabsContent value="overview" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Dados Pessoais */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-blue-600" />
                  Dados Pessoais
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">CPF</p>
                    <p className="font-medium">{patient.cpf || 'Não informado'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Data de Nascimento</p>
                    <p className="font-medium">
                      {(() => {
                        const birth = toSafeBirthDate(patient.birthDate)
                        if (!birth) return 'Não informado'
                        const ageText = typeof age === 'number' ? ` (${age} anos)` : ''
                        return `${birth.toLocaleDateString('pt-BR')}${ageText}`
                      })()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Gênero</p>
                    <p className="font-medium">{patient.gender || 'Não informado'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Tipo Sanguíneo</p>
                    <p className="font-medium">{patient.bloodType || 'Não informado'}</p>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex items-center gap-2 mb-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <p>{patient.phone || 'Telefone não informado'}</p>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <p>{patient.email || 'Email não informado'}</p>
                  </div>
                  {addressText && (
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-gray-400 mt-1" />
                      <p>
                        {addressText}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Informações Médicas */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-red-600" />
                  Informações Médicas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {allergies.length > 0 ? (
                  <div>
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                      Alergias
                    </p>
                    <p className="font-medium text-red-600">{allergies.join(', ')}</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-gray-500">Alergias</p>
                    <p className="text-gray-400">Nenhuma alergia registrada</p>
                  </div>
                )}

                {patient.observations && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-gray-500">Observações</p>
                    <p className="mt-1">{patient.observations}</p>
                  </div>
                )}

                <div className="pt-4 border-t">
                  <p className="text-sm text-gray-500 mb-2">Resumo do Prontuário</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                      <p className="text-xl font-bold text-red-600">
                        {patient.consultations?.reduce((acc, c) => acc + (c.diagnoses?.length ?? 0), 0) || 0}
                      </p>
                      <p className="text-xs text-gray-600">Diagnósticos</p>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-xl font-bold text-blue-600">
                        {patient.consultations?.length || 0}
                      </p>
                      <p className="text-xs text-gray-600">Consultas</p>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-xl font-bold text-green-600">
                        {patient.prescriptions?.length || 0}
                      </p>
                      <p className="text-xs text-gray-600">Prescrições</p>
                    </div>
                    <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                      <p className="text-xl font-bold text-purple-600">
                        {patient.ExamRequest?.length || 0}
                      </p>
                      <p className="text-xs text-gray-600">Exames</p>
                    </div>
                    <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                      <p className="text-xl font-bold text-orange-600">
                        {patient.referrals?.length || 0}
                      </p>
                      <p className="text-xs text-gray-600">Encaminhamentos</p>
                    </div>
                    <div className="p-3 bg-teal-50 rounded-lg border border-teal-200">
                      <p className="text-xl font-bold text-teal-600">
                        {patient.vitalSigns?.length || 0}
                      </p>
                      <p className="text-xs text-gray-600">Sinais Vitais</p>
                    </div>
                    <div className="p-3 bg-cyan-50 rounded-lg border border-cyan-200">
                      <p className="text-xl font-bold text-cyan-600">
                        {patient.medicalCertificates?.length || 0}
                      </p>
                      <p className="text-xs text-gray-600">Atestados</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <p className="text-xl font-bold text-slate-600">
                        {patient.medicalRecords?.length || 0}
                      </p>
                      <p className="text-xs text-gray-600">Registros</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Ações Rápidas */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5 text-emerald-600" />
                  Ações Rápidas
                </CardTitle>
                <CardDescription>
                  Inicie a consulta ou acesse outras ações
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  <StartConsultationButton
                    patientId={patient.id}
                    patientName={patient.name}
                    variant="default"
                    size="lg"
                    className="h-auto py-4 flex-col gap-2 md:col-span-2"
                  >
                    <span className="text-sm font-medium">Iniciar Consulta</span>
                  </StartConsultationButton>
                  <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
                    <a href={`/consultations/new?patientId=${patient.id}`}>
                      <Calendar className="h-6 w-6 text-blue-600" />
                      <span className="text-sm">Agendar para depois</span>
                    </a>
                  </Button>
                  <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
                    <a href={`/questionnaires?patientId=${patient.id}`}>
                      <ClipboardList className="h-6 w-6 text-emerald-600" />
                      <span className="text-sm">Enviar Questionário</span>
                    </a>
                  </Button>
                  <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
                    <a href={`/prescriptions/new?patientId=${patient.id}`}>
                      <Pill className="h-6 w-6 text-amber-600" />
                      <span className="text-sm">Nova Receita</span>
                    </a>
                  </Button>
                  <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
                    <a href={`/exams/new?patientId=${patient.id}`}>
                      <TestTube className="h-6 w-6 text-purple-600" />
                      <span className="text-sm">Solicitar Exame</span>
                    </a>
                  </Button>
                  <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
                    <a href={`/certificates?patientId=${patient.id}`}>
                      <FileText className="h-6 w-6 text-indigo-600" />
                      <span className="text-sm">Novo Atestado</span>
                    </a>
                  </Button>
                  <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
                    <a href={`/referrals?patientId=${patient.id}`}>
                      <Send className="h-6 w-6 text-teal-600" />
                      <span className="text-sm">Novo Encaminhamento</span>
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Métricas e Dashboard - NOVA ABA */}
        <TabsContent value="metrics" className="mt-6">
          <PatientMetrics 
            patient={patient}
            consultations={(patient.consultations || []) as never}
            prescriptions={patient.prescriptions || []}
            exams={patient.ExamRequest || []}
            referrals={patient.referrals || []}
            vitalSigns={(patient.vitalSigns || []) as never}
          />
          <div className="mt-6">
            <PatientCharts vitalSigns={(patient.vitalSigns || []) as never} />
          </div>
        </TabsContent>

        {/* Timeline - NOVA ABA */}
        <TabsContent value="timeline" className="mt-6">
          <PatientTimeline 
            consultations={(patient.consultations || []) as never}
            prescriptions={patient.prescriptions || []}
            exams={patient.ExamRequest || []}
            referrals={patient.referrals || []}
          />
        </TabsContent>

        {/* Diagnósticos (CIDs) - NOVA ABA */}
        <TabsContent value="diagnoses" className="mt-6">
          <PatientDiagnoses consultations={(patient.consultations || []) as never} />
        </TabsContent>

        {/* Medicações Detalhadas - NOVA ABA */}
        <TabsContent value="medications" className="mt-6">
          <PatientMedicationsDetailed prescriptions={patient.prescriptions || []} />
        </TabsContent>

        {/* Exames Detalhados - REFORMULADO */}
        <TabsContent value="exams" className="mt-6">
          <PatientExamsDetailed exams={patient.ExamRequest || []} />
        </TabsContent>

        {/* Encaminhamentos - NOVA ABA */}
        <TabsContent value="referrals" className="mt-6">
          <PatientReferrals referrals={patient.referrals || []} />
        </TabsContent>

        {/* Atestados */}
        <TabsContent value="certificates" className="mt-6">
          <PatientCertificates certificates={patient.medicalCertificates || []} patientId={patient.id} />
        </TabsContent>

        {/* Registros / Evoluções (MedicalRecord) */}
        <TabsContent value="records" className="mt-6">
          <PatientMedicalRecords records={patient.medicalRecords || []} patientId={patient.id} />
        </TabsContent>

        {/* Consultas */}
        <TabsContent value="consultations" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Histórico de Consultas</CardTitle>
                <Button asChild>
                  <a href={`/consultations?patientId=${patient.id}`}>
                    <Calendar className="h-4 w-4 mr-2" />
                    Nova Consulta
                  </a>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {(patient.consultations?.length || 0) > 0 ? (
                <div className="space-y-3">
                  {patient.consultations?.map((consultation) => (
                    <div
                      key={consultation.id}
                      className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium">
                          {new Date(consultation.scheduledDate).toLocaleDateString('pt-BR')}
                        </p>
                        <Badge variant="outline">
                          {new Date(consultation.scheduledDate).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600 mb-2">
                        <span className="font-medium">Médico:</span> Dr(a). {consultation.doctor.name}
                        {consultation.doctor.speciality && (
                          <span className="text-gray-500"> • {consultation.doctor.speciality}</span>
                        )}
                      </div>
                      {(consultation.diagnoses?.length ?? 0) > 0 && (
                        <div className="mt-2">
                          <p className="text-xs font-medium text-gray-500 mb-1">Diagnósticos:</p>
                          <div className="flex flex-wrap gap-1">
                            {(consultation.diagnoses ?? []).slice(0, 3).map((diag) => (
                              <Badge key={diag.id} variant="destructive" className="text-xs font-mono">
                                {diag.primaryCode.code}
                              </Badge>
                            ))}
                            {(consultation.diagnoses?.length ?? 0) > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{(consultation.diagnoses?.length ?? 0) - 3}
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                      {consultation.assessment && (
                        <p className="text-sm text-gray-600 mt-2">
                          <strong>Avaliação:</strong> {consultation.assessment}
                        </p>
                      )}
                      {consultation.notes && (
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                          {consultation.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  <p>Nenhuma consulta registrada</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Questionários */}
        <TabsContent value="questionnaires" className="mt-6">
          <PatientQuestionnaires patientId={patient.id} />
        </TabsContent>

        {/* Equipe de Cuidado - permanece */}
        <TabsContent value="care-team" className="mt-6">
          <PatientCareTeam patientId={patient.id} patientName={patient.name} />
        </TabsContent>

        {/* Desenvolvimento - permanece */}
        <TabsContent value="development" className="mt-6">
          <PatientDevelopment 
            patientId={patient.id}
            patientName={patient.name}
            patientEmail={patient.email || undefined}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
