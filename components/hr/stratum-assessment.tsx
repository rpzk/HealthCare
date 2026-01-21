'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
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
  questionType: string
  options: Option[]
  stratumMapping: Record<string, { timeSpanMonths: number; score: number; stratum: string }>
  weight: number
  order: number
}

interface Assessment {
  id: string
  userId: string
  status: string
  calculatedStratum?: string
  timeSpanMonths?: number
  confidenceScore?: number
}

interface AssessmentResult {
  stratum: string
  timeSpanMonths: number
  confidence: number
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

export function StratumAssessment() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [questions, setQuestions] = useState<Question[]>([])
  const [assessment, setAssessment] = useState<Assessment | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [result, setResult] = useState<AssessmentResult | null>(null)
  const [showResult, setShowResult] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)

      // Carregar questões
      const questionsRes = await fetch('/api/stratum/questions')
      const questionsData = await questionsRes.json()

      if (questionsData.questions?.length === 0) {
        // Seed questions
        await fetch('/api/stratum/seed', { method: 'POST' })
        const retryRes = await fetch('/api/stratum/questions')
        const retryData = await retryRes.json()
        setQuestions(retryData.questions || [])
      } else {
        setQuestions(questionsData.questions || [])
      }

      // Carregar ou criar assessment
      const assessmentsRes = await fetch('/api/stratum/assessments?status=IN_PROGRESS')
      const assessmentsData = await assessmentsRes.json()

      if (assessmentsData.assessments?.length > 0) {
        const existing = assessmentsData.assessments[0]
        setAssessment(existing)
        
        // Restaurar respostas anteriores
        const savedAnswers: Record<string, string> = {}
        for (const response of existing.responses || []) {
          savedAnswers[response.questionId] = JSON.parse(response.answer)
        }
        setAnswers(savedAnswers)
      } else {
        // Verificar se já completou
        const completedRes = await fetch('/api/stratum/assessments?status=COMPLETED')
        const completedData = await completedRes.json()
        
        if (completedData.assessments?.length > 0) {
          const latest = completedData.assessments[0]
          setAssessment(latest)
          setResult({
            stratum: latest.calculatedStratum,
            timeSpanMonths: latest.timeSpanMonths,
            confidence: latest.confidenceScore
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
      const response = await fetch('/api/stratum/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assessmentType: 'SELF' })
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

  const saveAnswer = async (questionId: string, answer: string) => {
    if (!assessment) return

    setAnswers(prev => ({ ...prev, [questionId]: answer }))
    setSaving(true)

    try {
      await fetch('/api/stratum/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assessmentId: assessment.id,
          questionId,
          answer
        })
      })
    } catch (error) {
      logger.error('Erro ao salvar resposta:', error)
    } finally {
      setSaving(false)
    }
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
  const allAnswered = questions.every(q => answers[q.id])

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
                  {Math.round(result.confidence * 100)}%
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
            <CardTitle className="text-2xl">Avaliação de Capacidade para o Trabalho</CardTitle>
            <CardDescription className="text-base mt-2">
              Baseado na teoria de Elliott Jaques sobre Time Span of Discretion
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-2">O que é isso?</h4>
              <p className="text-sm text-gray-600">
                Esta avaliação mede seu horizonte temporal de planejamento - 
                a capacidade natural de trabalhar com tarefas de diferentes complexidades 
                e prazos. Não é um teste de inteligência, mas uma medida de como você 
                naturalmente processa e planeja o trabalho.
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
                <strong>Questões:</strong> {questions.length} cenários situacionais<br />
                <strong>Dica:</strong> Responda com sua primeira intuição, sem pensar demais.
              </p>
            </div>

            <Button onClick={startAssessment} className="w-full" size="lg">
              Iniciar Avaliação
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
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
          {currentQuestion.options.map((option) => {
            const isSelected = answers[currentQuestion.id] === option.id
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
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                  }`}>
                    {isSelected && <CheckCircle className="h-4 w-4 text-white" />}
                  </div>
                  <span className={isSelected ? 'text-blue-900' : 'text-gray-700'}>
                    {option.text}
                  </span>
                </div>
              </button>
            )
          })}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
          disabled={currentIndex === 0}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Anterior
        </Button>

        {currentIndex < questions.length - 1 ? (
          <Button
            onClick={() => setCurrentIndex(currentIndex + 1)}
            disabled={!answers[currentQuestion.id]}
          >
            Próxima
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={completeAssessment}
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
                : answers[q.id]
                ? 'bg-green-500'
                : 'bg-gray-300'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
