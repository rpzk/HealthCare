'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { 
  Calendar,
  Pill,
  TestTube,
  ArrowRightCircle,
  Activity,
  FileText,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react'

type TimelineEvent = {
  id: string
  type: 'consultation' | 'prescription' | 'exam' | 'referral' | 'diagnosis'
  date: Date
  title: string
  description?: string
  status?: string
  severity?: string
  metadata?: Record<string, any>
}

interface Diagnosis {
  id: string
  isActive: boolean
  severity?: string | null
  createdAt: string | Date
  primaryCode: {
    code: string
    description: string
  }
}

interface Consultation {
  id: string
  scheduledDate: string | Date
  status: string
  diagnoses: Diagnosis[]
  doctor: {
    name: string
    speciality?: string | null
  }
}

interface Prescription {
  id: string
  createdAt: string | Date
  isActive?: boolean
  doctor: {
    name: string
  }
  items: {
    id: string
    medication?: { name: string } | null
  }[]
}

interface ExamRequest {
  id: string
  createdAt: string | Date
  status: string
  examType?: string | null
  procedimento?: {
    nome: string
  } | null
}

interface Referral {
  id: string
  createdAt: string | Date
  status: string
  specialty?: string | null
  targetOccupation?: {
    title: string
  } | null
}

interface PatientTimelineProps {
  consultations?: Consultation[] | null
  prescriptions?: Prescription[] | null
  exams?: ExamRequest[] | null
  referrals?: Referral[] | null
}

export function PatientTimeline({ 
  consultations = [], 
  prescriptions = [], 
  exams = [], 
  referrals = [] 
}: PatientTimelineProps) {
  // Garantir que os inputs são arrays
  const safeConsultations = Array.isArray(consultations) ? consultations : []
  const safePrescriptions = Array.isArray(prescriptions) ? prescriptions : []
  const safeExams = Array.isArray(exams) ? exams : []
  const safeReferrals = Array.isArray(referrals) ? referrals : []

  // Construir eventos usando flatMap/spread (evita push que pode falhar em certos ambientes)
  const consultationEvents: TimelineEvent[] = safeConsultations.flatMap(consultation => {
    const consultationEvent: TimelineEvent = {
      id: `consultation-${consultation.id}`,
      type: 'consultation',
      date: new Date(consultation.scheduledDate),
      title: `Consulta - Dr(a). ${consultation.doctor.name}`,
      description: consultation.doctor.speciality || undefined,
      status: consultation.status,
      metadata: { 
        diagnosesCount: consultation.diagnoses?.length ?? 0,
        doctor: consultation.doctor.name
      }
    }
    const diagnosisEvents: TimelineEvent[] = (consultation.diagnoses ?? []).map(diagnosis => ({
      id: `diagnosis-${diagnosis.id}`,
      type: 'diagnosis' as const,
      date: new Date(diagnosis.createdAt),
      title: `CID-10: ${diagnosis.primaryCode.code}`,
      description: diagnosis.primaryCode.description,
      status: diagnosis.isActive ? 'active' : 'inactive',
      severity: diagnosis.severity || undefined,
      metadata: {
        code: diagnosis.primaryCode.code,
        isActive: diagnosis.isActive
      }
    }))
    return [consultationEvent, ...diagnosisEvents]
  })

  const prescriptionEvents: TimelineEvent[] = safePrescriptions.map(prescription => {
    const medCount = prescription.items?.length ?? 0
    return {
      id: `prescription-${prescription.id}`,
      type: 'prescription' as const,
      date: new Date(prescription.createdAt),
      title: `Prescrição - ${medCount} medicamento(s)`,
      description: `Por Dr(a). ${prescription.doctor.name}`,
      status: prescription.isActive ? 'active' : 'inactive',
      metadata: { itemsCount: medCount, doctor: prescription.doctor.name }
    }
  })

  const examEvents: TimelineEvent[] = safeExams.map(exam => {
    const examName = exam.procedimento?.nome || exam.examType || 'Exame'
    return {
      id: `exam-${exam.id}`,
      type: 'exam' as const,
      date: new Date(exam.createdAt),
      title: `Exame: ${examName}`,
      status: exam.status,
      metadata: { examType: examName }
    }
  })

  const referralEvents: TimelineEvent[] = safeReferrals.map(referral => {
    const specialty = referral.targetOccupation?.title || referral.specialty || 'Especialista'
    return {
      id: `referral-${referral.id}`,
      type: 'referral' as const,
      date: new Date(referral.createdAt),
      title: `Encaminhamento - ${specialty}`,
      status: referral.status,
      metadata: { specialty }
    }
  })

  const timelineEvents = [...consultationEvents, ...prescriptionEvents, ...examEvents, ...referralEvents]
    .sort((a, b) => b.date.getTime() - a.date.getTime())

  // Agrupar por mês
  const eventsByMonth = timelineEvents.reduce((acc, event) => {
    const monthKey = format(event.date, 'MMMM yyyy', { locale: ptBR })
    if (!acc[monthKey]) acc[monthKey] = []
    acc[monthKey].push(event)
    return acc
  }, {} as Record<string, TimelineEvent[]>)

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'consultation':
        return <Calendar className="h-4 w-4" />
      case 'prescription':
        return <Pill className="h-4 w-4" />
      case 'exam':
        return <TestTube className="h-4 w-4" />
      case 'referral':
        return <ArrowRightCircle className="h-4 w-4" />
      case 'diagnosis':
        return <Activity className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const getEventColor = (type: string) => {
    switch (type) {
      case 'consultation':
        return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'prescription':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'exam':
        return 'text-purple-600 bg-purple-50 border-purple-200'
      case 'referral':
        return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'diagnosis':
        return 'text-red-600 bg-red-50 border-red-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getStatusIcon = (status?: string) => {
    if (!status) return null
    switch (status) {
      case 'completed':
      case 'active':
        return <CheckCircle className="h-3 w-3 text-green-500" />
      case 'pending':
        return <AlertCircle className="h-3 w-3 text-yellow-500" />
      case 'in_progress':
      case 'scheduled':
        return <Clock className="h-3 w-3 text-blue-500" />
      case 'cancelled':
      case 'inactive':
        return <AlertCircle className="h-3 w-3 text-gray-400" />
      default:
        return null
    }
  }

  const getStatusLabel = (status?: string) => {
    if (!status) return null
    switch (status) {
      case 'completed': return 'Concluído'
      case 'active': return 'Ativo'
      case 'inactive': return 'Inativo'
      case 'pending': return 'Pendente'
      case 'in_progress': return 'Em andamento'
      case 'scheduled': return 'Agendado'
      case 'cancelled': return 'Cancelado'
      default: return status
    }
  }

  if (timelineEvents.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Linha do Tempo
          </CardTitle>
          <CardDescription>
            Histórico cronológico de eventos clínicos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Nenhum evento registrado
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Linha do Tempo
          <Badge variant="outline">{timelineEvents.length} eventos</Badge>
        </CardTitle>
        <CardDescription>
          Histórico cronológico completo de atividades clínicas
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {Object.entries(eventsByMonth).map(([month, monthEvents]) => (
            <div key={month}>
              <div className="flex items-center gap-2 mb-3">
                <h3 className="font-semibold text-sm uppercase text-muted-foreground">
                  {month}
                </h3>
                <div className="flex-1 border-t" />
                <Badge variant="secondary" className="text-xs">
                  {monthEvents.length}
                </Badge>
              </div>

              <div className="space-y-2 pl-4 border-l-2 border-muted">
                {monthEvents.map((event) => (
                  <div 
                    key={event.id}
                    className="relative"
                  >
                    <div className={`absolute -left-[21px] top-2 p-1 rounded-full border-2 border-background ${getEventColor(event.type)}`}>
                      {getEventIcon(event.type)}
                    </div>

                    <div className="ml-4 pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-sm">
                              {event.title}
                            </h4>
                            {event.status && (
                              <div className="flex items-center gap-1">
                                {getStatusIcon(event.status)}
                                <span className="text-xs text-muted-foreground">
                                  {getStatusLabel(event.status)}
                                </span>
                              </div>
                            )}
                            {event.severity && (
                              <Badge variant="outline" className="text-xs">
                                {event.severity}
                              </Badge>
                            )}
                          </div>
                          {event.description && (
                            <p className="text-sm text-muted-foreground">
                              {event.description}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(event.date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
