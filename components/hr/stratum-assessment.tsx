'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/hooks/use-toast'
import { logger } from '@/lib/logger'
import {
  Brain,
  Clock,
  Target,
  Lightbulb,
  Scale,
  Users,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Trophy,
  AlertCircle
} from 'lucide-react'

interface Option {
  id: string
  text: string
  timeSpan?: number
}

interface Question {
  id: string
  category: string
  questionText: string
  questionType: 'SCENARIO' | 'SCALE' | 'RANKING' | 'OPEN'
  options: Option[]
  stratumMapping: Record<string, { timeSpanMonths: number; score: number; stratum: string }>
  weight: number
  order: number
}

interface Assessment {
  id: string
  userId: string
  status: string
  assessmentType?: string
  jobRoleId?: string | null
  calculatedStratum?: string
  timeSpanMonths?: number
  confidenceScore?: number | null
  morUserId?: string | null
  morValidatedAt?: string | null
  morEvidence?: string | null
  jobRole?: { id: string; title: string } | null
  morUser?: { id: string; name: string | null; email: string | null } | null
  responses?: Array<{ questionId: string; answer: string }>
}

interface AssessmentResult {
  stratum: string
  timeSpanMonths: number
  confidence: number | null
}

type StratumAssessmentMode = 'SELF' | 'ROLE'

type JobRoleListItem = {
  id: string
  title: string
  requiredMinStratum: string
  requiredMaxStratum: string | null
  stratumProfile?: {
    minStratum: string
    optimalStratum: string
    maxStratum: string | null
    timeSpanMinMonths: number
    timeSpanMaxMonths: number | null
  } | null
}

const categoryIcons: Record<string, typeof Brain> = {
  TIME_HORIZON: Clock,
  COMPLEXITY: Brain,
  ABSTRACTION: Lightbulb,
  UNCERTAINTY: AlertCircle,
  DECISION_MAKING: Target,
  LEADERSHIP: Users
}

const categoryLabels: Record<string, string> = {
  TIME_HORIZON: 'Horizonte Temporal',
  COMPLEXITY: 'Complexidade',
  ABSTRACTION: 'Abstração',
  UNCERTAINTY: 'Incerteza',
  DECISION_MAKING: 'Tomada de Decisão',
  LEADERSHIP: 'Liderança'
}

const stratumDescriptions: Record<string, { title: string; timeSpan: string; description: string }> = {
  S1: {
    title: 'Estrato I - Operacional',
    timeSpan: '1 dia a 3 meses',
    description: 'Foco em tarefas concretas e procedimentos. Trabalha bem com instruções claras e feedback frequente.'
  },
  S2: {
    title: 'Estrato II - Supervisor',
    timeSpan: '3 meses a 1 ano',
    description: 'Capacidade de gerenciar fluxos de trabalho e pequenas equipes. Planeja táticas de curto prazo.'
  },
  S3: {
    title: 'Estrato III - Gerente',
    timeSpan: '1 a 2 anos',
    description: 'Coordena múltiplos projetos e equipes. Desenvolve sistemas e processos para atingir metas anuais.'
  },
  S4: {
    title: 'Estrato IV - Diretor',
    timeSpan: '2 a 5 anos',
    description: 'Pensamento estratégico de médio prazo. Integra diferentes funções e desenvolve a organização.'
  },
  S5: {
    title: 'Estrato V - Vice-Presidente',
    timeSpan: '5 a 10 anos',
    description: 'Visão estratégica de longo prazo. Posiciona a organização no mercado e desenvolve novas capacidades.'
  },
  S6: {
    title: 'Estrato VI - CEO',
    timeSpan: '10 a 20 anos',
    description: 'Transforma indústrias e cria novos mercados. Legado organizacional duradouro.'
  },
  S7: {
    title: 'Estrato VII - Estadista',
    timeSpan: '20 a 50 anos',
    description: 'Impacto civilizatório. Cria instituições e movimentos que transcendem gerações.'
  },
  S8: {
    title: 'Estrato VIII - Visionário',
    timeSpan: '50+ anos',
    description: 'Raro. Impacto histórico permanente na humanidade.'
  }
}

export function StratumAssessment({ mode = 'SELF' }: { mode?: StratumAssessmentMode } = {}) {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [questions, setQuestions] = useState<Question[]>([])
  const [assessment, setAssessment] = useState<Assessment | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, unknown>>({})
  const [result, setResult] = useState<AssessmentResult | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [quickTimeSpanMonths, setQuickTimeSpanMonths] = useState('')
  const [quickConfidencePct, setQuickConfidencePct] = useState('')
  const [quickNotes, setQuickNotes] = useState('')

  const [jobRoles, setJobRoles] = useState<JobRoleListItem[]>([])
  const [jobRolesLoading, setJobRolesLoading] = useState(false)
  const [selectedJobRoleId, setSelectedJobRoleId] = useState<string>('')

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, selectedJobRoleId])

  const loadJobRoles = async () => {
    try {
      setJobRolesLoading(true)
      const res = await fetch('/api/job-roles?limit=200')
      const data = await res.json()
      if (!res.ok) {
        toast({ title: 'Erro', description: data?.error || 'Falha ao carregar cargos', variant: 'destructive' })
        return
      }
      setJobRoles(data.roles || [])
    } catch (error) {
      logger.error('Erro ao carregar job roles:', error)
      toast({ title: 'Erro', description: 'Falha ao carregar cargos', variant: 'destructive' })
    } finally {
      setJobRolesLoading(false)
    }
  }

  const loadData = async () => {
    try {
      setLoading(true)

      // Carregar questões
      const questionsRes = await fetch('/api/stratum/questions')
      const questionsData = await questionsRes.json()

      setQuestions(questionsData.questions || [])

      if (mode === 'ROLE' && jobRoles.length === 0 && !jobRolesLoading) {
        await loadJobRoles()
      }

      // ROLE mode requires JobRole selection to filter assessments
      if (mode === 'ROLE' && !selectedJobRoleId) {
        setAssessment(null)
        setResult(null)
        setShowResult(false)
        setCurrentIndex(0)
        setAnswers({})
        return
      }

      const filterQuery = mode === 'ROLE' ? `&jobRoleId=${encodeURIComponent(selectedJobRoleId)}` : ''

      // Carregar ou criar assessment
      const assessmentsRes = await fetch(`/api/stratum/assessments?status=IN_PROGRESS${filterQuery}`)
      const assessmentsData = await assessmentsRes.json()

      if (assessmentsData.assessments?.length > 0) {
        const existing = assessmentsData.assessments[0]
        setAssessment(existing)
        
        // Restaurar respostas anteriores
        const savedAnswers: Record<string, unknown> = {}
        for (const response of existing.responses || []) {
          savedAnswers[response.questionId] = JSON.parse(response.answer)
        }
        setAnswers(savedAnswers)
      } else {
        // Verificar se já completou
        const completedRes = await fetch(`/api/stratum/assessments?status=COMPLETED${filterQuery}`)
        const completedData = await completedRes.json()
        
        if (completedData.assessments?.length > 0) {
          const latest = completedData.assessments[0]
          setAssessment(latest)
          setResult({
            stratum: latest.calculatedStratum,
            timeSpanMonths: latest.timeSpanMonths,
            confidence: latest.confidenceScore ?? null
          })
          setShowResult(true)
        }
      }
    } catch (error) {
      logger.error('Erro ao carregar dados:', error)
      toast({ title: 'Erro', description: 'Falha ao carregar avaliação', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const startAssessment = async () => {
    try {
      setLoading(true)

      if (mode === 'ROLE' && !selectedJobRoleId) {
        toast({ title: 'Erro', description: 'Selecione um cargo (JobRole) para iniciar.', variant: 'destructive' })
        return
      }

      const response = await fetch('/api/stratum/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          mode === 'ROLE'
            ? { assessmentType: 'MANAGER', jobRoleId: selectedJobRoleId }
            : { assessmentType: 'SELF' }
        )
      })
      const data = await response.json()
      setAssessment(data.assessment)
      setShowResult(false)
      setCurrentIndex(0)
      setAnswers({})
    } catch (error) {
      toast({ title: 'Erro', description: 'Falha ao iniciar avaliação', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const completeManualAssessment = async () => {
    try {
      if (mode === 'ROLE' && !selectedJobRoleId) {
        toast({ title: 'Erro', description: 'Selecione um cargo (JobRole) antes de concluir.', variant: 'destructive' })
        return
      }

      const months = Number(quickTimeSpanMonths)
      if (!Number.isFinite(months) || months <= 0) {
        toast({ title: 'Erro', description: 'Informe o Time Span em meses (maior que 0).', variant: 'destructive' })
        return
      }

      let confidenceScore: number | undefined
      if (quickConfidencePct.trim().length > 0) {
        const pct = Number(quickConfidencePct)
        if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
          toast({ title: 'Erro', description: 'Confiança deve ser 0 a 100.', variant: 'destructive' })
          return
        }
        confidenceScore = Math.round((pct / 100) * 100) / 100
      }

      setLoading(true)

      let assessmentId = assessment?.id
      if (!assessmentId || assessment?.status === 'COMPLETED') {
        const createRes = await fetch('/api/stratum/assessments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            mode === 'ROLE'
              ? { assessmentType: 'MANAGER', jobRoleId: selectedJobRoleId }
              : { assessmentType: 'SELF' }
          )
        })
        const createData = await createRes.json()
        assessmentId = createData.assessment?.id
        setAssessment(createData.assessment)
      }

      const response = await fetch('/api/stratum/assessments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assessmentId,
          action: 'complete_manual',
          timeSpanMonths: Math.round(months),
          confidenceScore,
          notes: quickNotes
        })
      })

      const data = await response.json()
      if (!response.ok) {
        toast({ title: 'Erro', description: data?.error || 'Falha ao concluir avaliação rápida', variant: 'destructive' })
        return
      }

      setResult(data.result)
      setShowResult(true)
      toast({ title: 'Avaliação concluída!', description: 'Resultado calculado pelo Time Span informado.' })
    } catch (error) {
      logger.error('Erro ao concluir avaliação rápida:', error)
      toast({ title: 'Erro', description: 'Falha ao concluir avaliação rápida', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const saveAnswer = async (questionId: string, answer: unknown) => {
    if (!assessment) return

    setAnswers(prev => ({ ...prev, [questionId]: answer }))
    setSaving(true)

    try {
      const res = await fetch('/api/stratum/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assessmentId: assessment.id,
          questionId,
          answer
        })
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast({ title: 'Erro', description: data?.error || 'Falha ao salvar resposta', variant: 'destructive' })
      }
    } catch (error) {
      logger.error('Erro ao salvar resposta:', error)
      toast({ title: 'Erro', description: 'Falha ao salvar resposta', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  function isAnswered(question: Question, value: unknown) {
    if (question.questionType === 'OPEN') {
      if (!value || typeof value !== 'object') return false
      const anyValue = value as Record<string, unknown>
      const ts = Number(anyValue.timeSpanMonths)
      return Number.isFinite(ts) && ts > 0
    }
    return typeof value === 'string' && value.trim().length > 0
  }

  const completeAssessment = async () => {
    if (!assessment) return

    try {
      setLoading(true)
      const response = await fetch('/api/stratum/assessments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assessmentId: assessment.id,
          action: 'complete'
        })
      })
      const data = await response.json()
      setResult(data.result)
      setShowResult(true)
      toast({ title: 'Avaliação concluída!', description: 'Veja seu resultado abaixo.' })
    } catch (error) {
      toast({ title: 'Erro', description: 'Falha ao concluir avaliação', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const currentQuestion = questions[currentIndex]
  const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0
  const allAnswered = questions.every(q => isAnswered(q, answers[q.id]))

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  // Tela de resultado
  if (showResult && result) {
    const stratumInfo = stratumDescriptions[result.stratum] || stratumDescriptions.S1
    const Icon = categoryIcons.TIME_HORIZON

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="border-2 border-green-500 bg-gradient-to-br from-green-50 to-emerald-50">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <Trophy className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl text-green-800">Avaliação Concluída!</CardTitle>
            <CardDescription>
              Baseado na teoria de Elliott Jaques sobre capacidade de trabalho
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {mode === 'ROLE' && (
              <div className="p-4 bg-white rounded-xl shadow-sm border">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm text-muted-foreground">Cargo (JobRole)</div>
                    <div className="font-medium text-gray-900">{assessment?.jobRole?.title || selectedJobRoleId}</div>
                  </div>
                  <Badge variant={assessment?.morValidatedAt ? 'default' : 'outline'}>
                    {assessment?.morValidatedAt ? 'Validado (MoR)' : 'Pendente MoR'}
                  </Badge>
                </div>
                {assessment?.morUser && !assessment?.morValidatedAt && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    MoR designado: {assessment.morUser.name || assessment.morUser.email || assessment.morUser.id}
                  </div>
                )}
              </div>
            )}

            <div className="text-center p-6 bg-white rounded-xl shadow-sm">
              <Badge className="mb-4 text-lg px-4 py-2 bg-blue-600">
                {result.stratum}
              </Badge>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {stratumInfo.title}
              </h3>
              <p className="text-blue-600 font-medium mb-4">
                Horizonte Temporal: {stratumInfo.timeSpan}
              </p>
              <p className="text-gray-600">
                {stratumInfo.description}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-white rounded-lg text-center">
                <Clock className="h-6 w-6 mx-auto text-blue-600 mb-2" />
                <p className="text-sm text-gray-500">Time Span Calculado</p>
                <p className="text-xl font-bold text-gray-900">
                  {result.timeSpanMonths} meses
                </p>
              </div>
              <div className="p-4 bg-white rounded-lg text-center">
                <Target className="h-6 w-6 mx-auto text-green-600 mb-2" />
                <p className="text-sm text-gray-500">Confiança</p>
                <p className="text-xl font-bold text-gray-900">
                  {typeof result.confidence === 'number' ? `${Math.round(result.confidence * 100)}%` : '—'}
                </p>
              </div>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">O que isso significa?</h4>
              <p className="text-sm text-blue-800">
                Seu estrato indica a complexidade natural de trabalho onde você opera melhor.
                Funções muito abaixo podem causar tédio; muito acima podem causar estresse.
                O ideal é um fit de ±1 estrato em relação às demandas do cargo.
              </p>
            </div>

            <Button onClick={startAssessment} variant="outline" className="w-full">
              Refazer Avaliação
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Tela inicial
  if (!assessment || assessment.status === 'COMPLETED') {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Brain className="h-8 w-8 text-blue-600" />
            </div>
            <CardTitle className="text-2xl">
              {mode === 'ROLE' ? 'Avaliação de Cargo (RO/SST)' : 'Avaliação de Capacidade para o Trabalho'}
            </CardTitle>
            <CardDescription className="text-base mt-2">
              {mode === 'ROLE'
                ? 'Gestor define o Time Span do cargo; MoR valida com evidência.'
                : 'Baseado na teoria de Elliott Jaques sobre Time Span of Discretion'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {mode === 'ROLE' && (
              <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="font-medium">Selecione o cargo (JobRole)</h4>
                  {jobRolesLoading && (
                    <span className="text-sm text-muted-foreground inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Carregando…
                    </span>
                  )}
                </div>

                <Select
                  value={selectedJobRoleId}
                  onValueChange={(value) => {
                    setSelectedJobRoleId(value)
                    setAssessment(null)
                    setAnswers({})
                    setCurrentIndex(0)
                    setResult(null)
                    setShowResult(false)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cargo" />
                  </SelectTrigger>
                  <SelectContent>
                    {jobRoles.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {!jobRolesLoading && jobRoles.length === 0 && (
                  <div className="text-sm text-muted-foreground space-y-2">
                    <div>Nenhum cargo (JobRole) cadastrado. O fluxo de avaliação de cargo depende disso.</div>
                    <Button asChild type="button" variant="outline" size="sm">
                      <Link href="/admin/job-roles">Abrir cadastro de Job Roles (Admin)</Link>
                    </Button>
                  </div>
                )}

                {selectedJobRoleId && assessment?.morUser && (
                  <div className="text-sm text-muted-foreground">
                    MoR designado: {assessment.morUser.name || assessment.morUser.email || assessment.morUser.id}
                  </div>
                )}
              </div>
            )}

            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-2">O que é isso?</h4>
              <p className="text-sm text-gray-600">
                {mode === 'ROLE'
                  ? 'Esta avaliação captura o Time Span do cargo (horizonte temporal de decisão) conforme definido pelo gestor. O MoR valida oficialmente com evidência.'
                  : 'Esta avaliação mede seu horizonte temporal de planejamento - a capacidade natural de trabalhar com tarefas de diferentes complexidades e prazos. Não é um teste de inteligência, mas uma medida de como você naturalmente processa e planeja o trabalho.'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {Object.entries(categoryLabels).slice(0, 4).map(([key, label]) => {
                const Icon = categoryIcons[key]
                return (
                  <div key={key} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <Icon className="h-5 w-5 text-blue-600" />
                    <span className="text-sm">{label}</span>
                  </div>
                )
              })}
            </div>

            <div className="p-4 bg-amber-50 rounded-lg">
              <p className="text-sm text-amber-800">
                <strong>Tempo estimado:</strong> 10-15 minutos<br />
                <strong>Questões:</strong> {questions.length > 0 ? `${questions.length} cenários situacionais` : 'nenhuma questão cadastrada'}<br />
                <strong>Dica:</strong> Responda com sua primeira intuição, sem pensar demais.
              </p>
            </div>

            <div className="space-y-3">
              <Button
                onClick={startAssessment}
                className="w-full"
                size="lg"
                disabled={questions.length === 0 || (mode === 'ROLE' && !selectedJobRoleId)}
              >
                Iniciar Questionário
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              {questions.length === 0 && (
                <p className="text-sm text-gray-500">
                  Sem questões cadastradas. Para usar o questionário, cadastre questões reais via Admin.
                </p>
              )}
            </div>

            <Card className="border border-blue-200 bg-blue-50/50">
              <CardHeader>
                <CardTitle className="text-base">Avaliação rápida (Time Span)</CardTitle>
                <CardDescription>
                  Informe o horizonte temporal (meses) e conclua imediatamente.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-sm text-gray-700">Time Span (meses)</label>
                    <Input
                      type="number"
                      min={1}
                      value={quickTimeSpanMonths}
                      onChange={(e) => setQuickTimeSpanMonths(e.target.value)}
                      placeholder="Ex: 12"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-gray-700">Confiança (0-100) (opcional)</label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={quickConfidencePct}
                      onChange={(e) => setQuickConfidencePct(e.target.value)}
                      placeholder="Ex: 80"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-sm text-gray-700">Evidências/observações (opcional)</label>
                  <Textarea
                    value={quickNotes}
                    onChange={(e) => setQuickNotes(e.target.value)}
                    placeholder="Descreva exemplos reais de entregas e horizontes de decisão."
                  />
                </div>

                <Button onClick={completeManualAssessment} className="w-full">
                  Concluir avaliação rápida
                </Button>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Questionário
  if (!currentQuestion) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Nenhuma questão encontrada.</p>
        <Button onClick={loadData} className="mt-4">Recarregar</Button>
      </div>
    )
  }

  const CategoryIcon = categoryIcons[currentQuestion.category] || Brain

  const currentAnswer = answers[currentQuestion.id]
  const canProceed = isAnswered(currentQuestion, currentAnswer)

  const goNext = async () => {
    if (!currentQuestion) return
    if (!assessment) return
    if (!canProceed) return

    // Persist OPEN answer on navigation
    if (currentQuestion.questionType === 'OPEN') {
      await saveAnswer(currentQuestion.id, currentAnswer)
    }

    setCurrentIndex(currentIndex + 1)
  }

  const goPrev = () => {
    setCurrentIndex(Math.max(0, currentIndex - 1))
  }

  const finish = async () => {
    if (!currentQuestion) return
    if (!assessment) return
    if (!allAnswered) return

    if (currentQuestion.questionType === 'OPEN') {
      await saveAnswer(currentQuestion.id, currentAnswer)
    }

    await completeAssessment()
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">
            Questão {currentIndex + 1} de {questions.length}
          </span>
          <span className="text-gray-500">
            {Math.round(progress)}% completo
          </span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Question Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="flex items-center gap-1">
              <CategoryIcon className="h-3 w-3" />
              {categoryLabels[currentQuestion.category]}
            </Badge>
            {saving && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Salvando...
              </Badge>
            )}
          </div>
          <CardTitle className="text-lg leading-relaxed">
            {currentQuestion.questionText}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {currentQuestion.questionType === 'OPEN' ? (
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm text-gray-700">Resposta (opcional)</label>
                <Textarea
                  value={
                    typeof currentAnswer === 'object' && currentAnswer
                      ? String((currentAnswer as any).text ?? '')
                      : ''
                  }
                  onChange={(e) => {
                    const existing = (typeof currentAnswer === 'object' && currentAnswer ? currentAnswer : {}) as any
                    setAnswers(prev => ({
                      ...prev,
                      [currentQuestion.id]: {
                        ...existing,
                        text: e.target.value
                      }
                    }))
                  }}
                  placeholder="Descreva sua resposta (se aplicável)."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-sm text-gray-700">Time Span desta resposta (meses)</label>
                  <Input
                    type="number"
                    min={1}
                    value={
                      typeof currentAnswer === 'object' && currentAnswer
                        ? String((currentAnswer as any).timeSpanMonths ?? '')
                        : ''
                    }
                    onChange={(e) => {
                      const existing = (typeof currentAnswer === 'object' && currentAnswer ? currentAnswer : {}) as any
                      const raw = e.target.value
                      const num = raw === '' ? null : Number(raw)
                      setAnswers(prev => ({
                        ...prev,
                        [currentQuestion.id]: {
                          ...existing,
                          timeSpanMonths: num
                        }
                      }))
                    }}
                    placeholder="Ex: 12"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-gray-700">Score (0..1) (opcional)</label>
                  <Input
                    type="number"
                    min={0}
                    max={1}
                    step={0.01}
                    value={
                      typeof currentAnswer === 'object' && currentAnswer
                        ? String((currentAnswer as any).score ?? '')
                        : ''
                    }
                    onChange={(e) => {
                      const existing = (typeof currentAnswer === 'object' && currentAnswer ? currentAnswer : {}) as any
                      const raw = e.target.value
                      const num = raw === '' ? null : Number(raw)
                      setAnswers(prev => ({
                        ...prev,
                        [currentQuestion.id]: {
                          ...existing,
                          score: num
                        }
                      }))
                    }}
                    placeholder="Ex: 0.7"
                  />
                </div>
              </div>

              <div className="text-xs text-gray-500">
                Para questões OPEN, o cálculo usa o Time Span informado acima.
              </div>

              <Button
                variant="outline"
                onClick={() => saveAnswer(currentQuestion.id, currentAnswer)}
                disabled={!canProceed || saving}
              >
                Salvar resposta
              </Button>
            </div>
          ) : (
            <>
              {currentQuestion.questionType === 'SCALE' && currentQuestion.options.length >= 2 ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{currentQuestion.options[0]?.text}</span>
                      <span>{currentQuestion.options[currentQuestion.options.length - 1]?.text}</span>
                    </div>

                    <Slider
                      min={0}
                      max={currentQuestion.options.length - 1}
                      step={1}
                      value={(() => {
                        const selected = typeof currentAnswer === 'string' ? currentAnswer : ''
                        const idx = currentQuestion.options.findIndex((o) => o.id === selected)
                        return idx >= 0 ? [idx] : undefined
                      })()}
                      defaultValue={[0]}
                      onValueChange={(vals) => {
                        const idx = vals?.[0]
                        const option = currentQuestion.options[idx]
                        if (!option) return
                        setAnswers((prev) => ({ ...prev, [currentQuestion.id]: option.id }))
                      }}
                      onValueCommit={(vals) => {
                        const idx = vals?.[0]
                        const option = currentQuestion.options[idx]
                        if (!option) return
                        void saveAnswer(currentQuestion.id, option.id)
                      }}
                    />

                    <div className="pt-1">
                      {(() => {
                        const count = currentQuestion.options.length
                        const showAll = count <= 7
                        const indices = showAll
                          ? Array.from({ length: count }, (_, i) => i)
                          : [0, Math.floor((count - 1) / 2), count - 1]

                        return (
                          <div className="flex items-start justify-between gap-2">
                            {indices.map((idx) => (
                              <div key={idx} className="flex-1">
                                <div className="mx-auto h-1.5 w-1.5 rounded-full bg-gray-300" />
                                <div className="mt-1 text-[11px] leading-tight text-gray-500 text-center line-clamp-2">
                                  {currentQuestion.options[idx]?.text}
                                </div>
                              </div>
                            ))}
                          </div>
                        )
                      })()}
                    </div>

                    <div className="text-sm text-gray-700">
                      Selecionado:{' '}
                      <span className="font-medium">
                        {(() => {
                          const selected = typeof currentAnswer === 'string' ? currentAnswer : ''
                          const opt = currentQuestion.options.find((o) => o.id === selected)
                          return opt?.text || '—'
                        })()}
                      </span>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    {currentQuestion.options.map((option) => {
                      const selected = typeof currentAnswer === 'string' ? currentAnswer : ''
                      const isSelected = selected === option.id
                      return (
                        <button
                          key={option.id}
                          onClick={() => saveAnswer(currentQuestion.id, option.id)}
                          className={`w-full p-3 text-left rounded-lg border transition-all ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                              }`}
                            >
                              {isSelected && <CheckCircle className="h-3 w-3 text-white" />}
                            </div>
                            <span className={isSelected ? 'text-blue-900' : 'text-gray-700'}>
                              {option.text}
                            </span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ) : (
                currentQuestion.options.map((option) => {
                  const selected = typeof currentAnswer === 'string' ? currentAnswer : ''
                  const isSelected = selected === option.id
                  return (
                    <button
                      key={option.id}
                      onClick={() => saveAnswer(currentQuestion.id, option.id)}
                      className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                            isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                          }`}
                        >
                          {isSelected && <CheckCircle className="h-4 w-4 text-white" />}
                        </div>
                        <span className={isSelected ? 'text-blue-900' : 'text-gray-700'}>
                          {option.text}
                        </span>
                      </div>
                    </button>
                  )
                })
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={goPrev}
          disabled={currentIndex === 0}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Anterior
        </Button>

        {currentIndex < questions.length - 1 ? (
          <Button
            onClick={goNext}
            disabled={!canProceed}
          >
            Próxima
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={finish}
            disabled={!allAnswered}
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            Concluir Avaliação
          </Button>
        )}
      </div>

      {/* Question dots */}
      <div className="flex justify-center gap-1 flex-wrap">
        {questions.map((q, idx) => (
          <button
            key={q.id}
            onClick={() => setCurrentIndex(idx)}
            className={`w-3 h-3 rounded-full transition-all ${
              idx === currentIndex
                ? 'bg-blue-600 scale-125'
                : isAnswered(q, answers[q.id])
                ? 'bg-green-500'
                : 'bg-gray-300'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
