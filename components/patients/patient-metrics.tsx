'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  Pill,
  TestTube,
  ArrowRightCircle,
  AlertTriangle,
  CheckCircle,
  Clock,
  Heart,
  FileText
} from 'lucide-react'
import { differenceInDays, differenceInMonths, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

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

interface VitalSigns {
  id: string
  measuredAt: string | Date
  bloodPressureSystolic?: number | null
  bloodPressureDiastolic?: number | null
  heartRate?: number | null
  weight?: number | null
}

interface Consultation {
  id: string
  scheduledDate: string | Date
  status: string
  diagnoses: Diagnosis[]
  vitalSigns: VitalSigns[]
}

interface PrescriptionItem {
  medication?: {
    controlado?: boolean
    antimicrobiano?: boolean
  } | null
}

interface Prescription {
  id: string
  createdAt: string | Date
  isActive?: boolean
  expiresAt?: string | Date | null
  items: PrescriptionItem[]
}

interface ExamRequest {
  id: string
  status: string
  createdAt: string | Date
  urgency?: string | null
}

interface Referral {
  id: string
  status: string
  priority?: string | null
}

interface PatientMetricsProps {
  patient: {
    id: string
    name: string
    birthDate?: string | Date | null
    createdAt?: Date
  }
  consultations: Consultation[]
  prescriptions: Prescription[]
  exams: ExamRequest[]
  referrals: Referral[]
  vitalSigns: VitalSigns[]
}

export function PatientMetrics({ 
  patient, 
  consultations, 
  prescriptions, 
  exams, 
  referrals,
  vitalSigns 
}: PatientMetricsProps) {
  // Métricas básicas
  const totalConsultations = consultations.length
  const totalPrescriptions = prescriptions.length
  const totalExams = exams.length
  const totalReferrals = referrals.length

  // Diagnósticos ativos
  const activeDiagnoses = consultations
    .flatMap(c => c.diagnoses ?? [])
    .filter(d => d.isActive)
  const uniqueActiveDiagnoses = Array.from(
    new Map(activeDiagnoses.map(d => [d.primaryCode.code, d])).values()
  )

  // Medicações ativas
  const activePrescriptions = prescriptions.filter(p => {
    if (p.isActive === false) return false
    if (p.expiresAt && new Date(p.expiresAt) < new Date()) return false
    return true
  })
  const activeMedications = activePrescriptions.flatMap(p => p.items ?? [])
  const controlledMeds = activeMedications.filter(m => m.medication?.controlado)
  const antimicrobials = activeMedications.filter(m => m.medication?.antimicrobiano)

  // Exames pendentes
  const pendingExams = exams.filter(e => e.status === 'pending')
  const urgentExams = pendingExams.filter(e => 
    e.urgency?.toLowerCase() === 'urgente' || e.urgency?.toLowerCase() === 'emergência'
  )

  // Encaminhamentos pendentes
  const pendingReferrals = referrals.filter(r => r.status === 'pending')
  const priorityReferrals = pendingReferrals.filter(r => 
    r.priority?.toLowerCase() === 'urgente' || r.priority?.toLowerCase() === 'alta'
  )

  // Última consulta
  const lastConsultation = consultations.length > 0 
    ? consultations.sort((a, b) => 
        new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime()
      )[0]
    : null
  const daysSinceLastConsultation = lastConsultation 
    ? differenceInDays(new Date(), new Date(lastConsultation.scheduledDate))
    : null

  // Tempo como paciente
  const monthsAsPatient = patient.createdAt 
    ? differenceInMonths(new Date(), new Date(patient.createdAt))
    : 0

  // Tendência de sinais vitais (últimos 30 dias vs 30-60 dias)
  const now = new Date()
  const last30Days = vitalSigns.filter(vs => 
    differenceInDays(now, new Date(vs.measuredAt)) <= 30
  )
  const days30to60 = vitalSigns.filter(vs => {
    const days = differenceInDays(now, new Date(vs.measuredAt))
    return days > 30 && days <= 60
  })

  const avgWeight30 = last30Days.length > 0
    ? last30Days.reduce((sum, vs) => sum + (vs.weight || 0), 0) / last30Days.filter(vs => vs.weight).length
    : null
  const avgWeight60 = days30to60.length > 0
    ? days30to60.reduce((sum, vs) => sum + (vs.weight || 0), 0) / days30to60.filter(vs => vs.weight).length
    : null
  const weightTrend = avgWeight30 && avgWeight60 ? avgWeight30 - avgWeight60 : null

  const avgBPSystolic30 = last30Days.length > 0
    ? last30Days.reduce((sum, vs) => sum + (vs.bloodPressureSystolic || 0), 0) / last30Days.filter(vs => vs.bloodPressureSystolic).length
    : null
  const avgBPSystolic60 = days30to60.length > 0
    ? days30to60.reduce((sum, vs) => sum + (vs.bloodPressureSystolic || 0), 0) / days30to60.filter(vs => vs.bloodPressureSystolic).length
    : null
  const bpTrend = avgBPSystolic30 && avgBPSystolic60 ? avgBPSystolic30 - avgBPSystolic60 : null

  return (
    <div className="space-y-6">
      {/* KPIs Principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Diagnósticos Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-red-600">
                {uniqueActiveDiagnoses.length}
              </div>
              <Activity className="h-8 w-8 text-red-600 opacity-20" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Condições em acompanhamento
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Medicações em Uso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-green-600">
                {activeMedications.length}
              </div>
              <Pill className="h-8 w-8 text-green-600 opacity-20" />
            </div>
            <div className="flex gap-2 mt-2">
              {controlledMeds.length > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {controlledMeds.length} controlados
                </Badge>
              )}
              {antimicrobials.length > 0 && (
                <Badge variant="default" className="text-xs bg-orange-500">
                  {antimicrobials.length} ATB
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Exames Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-yellow-600">
                {pendingExams.length}
              </div>
              <TestTube className="h-8 w-8 text-yellow-600 opacity-20" />
            </div>
            {urgentExams.length > 0 && (
              <Badge variant="destructive" className="text-xs mt-2">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {urgentExams.length} urgentes
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Encaminhamentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-blue-600">
                {pendingReferrals.length}
              </div>
              <ArrowRightCircle className="h-8 w-8 text-blue-600 opacity-20" />
            </div>
            {priorityReferrals.length > 0 && (
              <Badge variant="destructive" className="text-xs mt-2">
                {priorityReferrals.length} prioritários
              </Badge>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alertas e Lembretes */}
      {(urgentExams.length > 0 || priorityReferrals.length > 0 || controlledMeds.length > 0) && (
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-700">
              <AlertTriangle className="h-5 w-5" />
              Alertas e Ações Necessárias
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {urgentExams.length > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <TestTube className="h-4 w-4 text-orange-700" />
                <span className="font-medium">{urgentExams.length} exame(s) urgente(s)</span>
                <span className="text-muted-foreground">aguardando realização</span>
              </div>
            )}
            {priorityReferrals.length > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <ArrowRightCircle className="h-4 w-4 text-orange-700" />
                <span className="font-medium">{priorityReferrals.length} encaminhamento(s) prioritário(s)</span>
                <span className="text-muted-foreground">aguardando agendamento</span>
              </div>
            )}
            {controlledMeds.length > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <Pill className="h-4 w-4 text-orange-700" />
                <span className="font-medium">{controlledMeds.length} medicamento(s) controlado(s)</span>
                <span className="text-muted-foreground">em uso - atenção à renovação</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Estatísticas Gerais */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-5 w-5 text-blue-600" />
              Acompanhamento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Paciente há</p>
              <p className="text-2xl font-bold">
                {monthsAsPatient} {monthsAsPatient === 1 ? 'mês' : 'meses'}
              </p>
            </div>
            {lastConsultation && daysSinceLastConsultation !== null && (
              <div className="pt-2 border-t">
                <p className="text-sm text-muted-foreground">Última consulta</p>
                <p className="text-lg font-semibold">
                  há {daysSinceLastConsultation} {daysSinceLastConsultation === 1 ? 'dia' : 'dias'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(lastConsultation.scheduledDate), "dd/MM/yyyy", { locale: ptBR })}
                </p>
              </div>
            )}
            <div className="pt-2 border-t">
              <p className="text-sm text-muted-foreground">Total de consultas</p>
              <p className="text-lg font-semibold">{totalConsultations}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Heart className="h-5 w-5 text-red-600" />
              Sinais Vitais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {last30Days.length > 0 ? (
              <>
                {avgWeight30 && (
                  <div>
                    <p className="text-sm text-muted-foreground">Peso médio (30d)</p>
                    <div className="flex items-center gap-2">
                      <p className="text-2xl font-bold">
                        {avgWeight30.toFixed(1)} kg
                      </p>
                      {weightTrend !== null && Math.abs(weightTrend) > 0.5 && (
                        weightTrend > 0 ? (
                          <TrendingUp className="h-4 w-4 text-red-500" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-green-500" />
                        )
                      )}
                    </div>
                    {weightTrend !== null && Math.abs(weightTrend) > 0.5 && (
                      <p className="text-xs text-muted-foreground">
                        {weightTrend > 0 ? '+' : ''}{weightTrend.toFixed(1)} kg vs período anterior
                      </p>
                    )}
                  </div>
                )}
                {avgBPSystolic30 && (
                  <div className="pt-2 border-t">
                    <p className="text-sm text-muted-foreground">PA sistólica média (30d)</p>
                    <div className="flex items-center gap-2">
                      <p className="text-2xl font-bold">
                        {avgBPSystolic30.toFixed(0)} mmHg
                      </p>
                      {bpTrend !== null && Math.abs(bpTrend) > 5 && (
                        bpTrend > 0 ? (
                          <TrendingUp className="h-4 w-4 text-red-500" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-green-500" />
                        )
                      )}
                    </div>
                    {bpTrend !== null && Math.abs(bpTrend) > 5 && (
                      <p className="text-xs text-muted-foreground">
                        {bpTrend > 0 ? '+' : ''}{bpTrend.toFixed(0)} mmHg vs período anterior
                      </p>
                    )}
                  </div>
                )}
                <div className="pt-2 border-t">
                  <p className="text-sm text-muted-foreground">Aferições registradas</p>
                  <p className="text-lg font-semibold">{vitalSigns.length}</p>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhum sinal vital registrado recentemente
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-5 w-5 text-purple-600" />
              Atividade Clínica
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Taxa de adesão</p>
              <p className="text-2xl font-bold text-green-600">
                {consultations.filter(c => c.status === 'completed').length > 0
                  ? Math.round((consultations.filter(c => c.status === 'completed').length / totalConsultations) * 100)
                  : 0}%
              </p>
              <p className="text-xs text-muted-foreground">
                {consultations.filter(c => c.status === 'completed').length} de {totalConsultations} consultas
              </p>
            </div>
            <div className="pt-2 border-t">
              <p className="text-sm text-muted-foreground">Prescrições ativas</p>
              <p className="text-lg font-semibold">{activePrescriptions.length}</p>
            </div>
            <div className="pt-2 border-t">
              <p className="text-sm text-muted-foreground">Exames concluídos</p>
              <p className="text-lg font-semibold">
                {exams.filter(e => e.status === 'completed').length} / {totalExams}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resumo de Condições Ativas */}
      {uniqueActiveDiagnoses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-red-600" />
              Condições em Acompanhamento
              <Badge variant="destructive">{uniqueActiveDiagnoses.length}</Badge>
            </CardTitle>
            <CardDescription>
              Diagnósticos ativos que requerem monitoramento
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 md:grid-cols-2">
              {uniqueActiveDiagnoses.slice(0, 6).map((diagnosis) => (
                <div 
                  key={diagnosis.id} 
                  className="flex items-start gap-2 p-3 border rounded-lg bg-red-50 dark:bg-red-950/10"
                >
                  <Activity className="h-4 w-4 text-red-500 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="destructive" className="text-xs font-mono">
                        {diagnosis.primaryCode.code}
                      </Badge>
                      {diagnosis.severity && (
                        <Badge variant="outline" className="text-xs">
                          {diagnosis.severity}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm font-medium">
                      {diagnosis.primaryCode.description}
                    </p>
                  </div>
                </div>
              ))}
              {uniqueActiveDiagnoses.length > 6 && (
                <p className="text-xs text-muted-foreground text-center pt-2 col-span-2">
                  + {uniqueActiveDiagnoses.length - 6} condições adicionais
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status Geral */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status de Exames</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Concluídos</span>
                </div>
                <span className="font-semibold">
                  {exams.filter(e => e.status === 'completed').length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-500" />
                  <span className="text-sm">Em andamento</span>
                </div>
                <span className="font-semibold">
                  {exams.filter(e => e.status === 'in_progress').length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm">Pendentes</span>
                </div>
                <span className="font-semibold">{pendingExams.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status de Encaminhamentos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Concluídos</span>
                </div>
                <span className="font-semibold">
                  {referrals.filter(r => r.status === 'completed').length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-500" />
                  <span className="text-sm">Agendados</span>
                </div>
                <span className="font-semibold">
                  {referrals.filter(r => r.status === 'scheduled').length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm">Pendentes</span>
                </div>
                <span className="font-semibold">{pendingReferrals.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
