"use client"

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'
import { 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  Clock, 
  Loader2,
  Sparkles,
  Home,
  Pause,
  Play
} from 'lucide-react'

interface QuestionOption {
  id: string
  text: string
  emoji: string | null
  description: string | null
}

interface Question {
  id: string
  text: string
  helpText: string | null
  type: string
  isRequired: boolean
  scaleMin: number | null
  scaleMax: number | null
  scaleMinLabel: string | null
  scaleMaxLabel: string | null
  options: QuestionOption[]
}

interface Category {
  id: string
  name: string
  description: string | null
  iconEmoji: string | null
  questions: Question[]
}

interface Questionnaire {
  id: string
  status: string
  progressPercent: number
  totalQuestions: number
  answeredQuestions: number
  template: {
    id: string
    name: string
    description: string | null
    patientIntro: string | null
    estimatedMinutes: number
    allowPause: boolean
    showProgress: boolean
    themeColor: string | null
    iconEmoji: string | null
    categories: Category[]
  }
  patient: {
    id: string
    name: string
  }
  sentBy: {
    id: string
    name: string
    speciality: string | null
  }
}

interface Answer {
  questionId: string
  textValue?: string
  numericValue?: number
  booleanValue?: boolean
  selectedOptionId?: string
  selectedOptionIds?: string[]
  timeSpentSeconds?: number
}

export default function QuestionnairePlayPage({ params }: { params: { token: string } }) {
  const router = useRouter()
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [completing, setCompleting] = useState(false)
  
  // Current position
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [showIntro, setShowIntro] = useState(true)
  const [showComplete, setShowComplete] = useState(false)
  
  // Answers storage
  const [answers, setAnswers] = useState<Record<string, Answer>>({})
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now())

  const fetchQuestionnaire = useCallback(async () => {
    try {
      const res = await fetch(`/api/questionnaire/${params.token}`)
      if (res.ok) {
        const data = await res.json()
        setQuestionnaire(data)
        // If already started, skip intro
        if (data.answeredQuestions > 0) {
          setShowIntro(false)
        }
      } else {
        const err = await res.json()
        setError(err.error || 'Erro ao carregar questionário')
      }
    } catch (error) {
      setError('Erro de conexão')
    } finally {
      setLoading(false)
    }
  }, [params.token]);

  useEffect(() => {
    fetchQuestionnaire()
  }, [fetchQuestionnaire])

  // Get flat list of all questions
  const allQuestions = useMemo(() => questionnaire?.template.categories.flatMap((cat, catIdx) => 
    cat.questions.map((q, qIdx) => ({
      ...q,
      categoryIndex: catIdx,
      questionIndex: qIdx,
      categoryName: cat.name,
      categoryEmoji: cat.iconEmoji
    }))
  ) || [], [questionnaire]);

  const currentFlatIndex = allQuestions.findIndex(
    q => q.categoryIndex === currentCategoryIndex && q.questionIndex === currentQuestionIndex
  )
  const currentQuestion = allQuestions[currentFlatIndex]
  const totalQuestions = allQuestions.length
  const answeredCount = Object.keys(answers).length
  const progress = (answeredCount / totalQuestions) * 100

  // Save answer for current question
  const saveCurrentAnswer = useCallback((answer: Partial<Answer>) => {
    if (!currentQuestion) return
    
    const timeSpent = Math.round((Date.now() - questionStartTime) / 1000)
    
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: {
        ...prev[currentQuestion.id],
        ...answer,
        questionId: currentQuestion.id,
        timeSpentSeconds: (prev[currentQuestion.id]?.timeSpentSeconds || 0) + timeSpent
      }
    }))
  }, [currentQuestion, questionStartTime])

  // Navigation
  const goNext = useCallback(async () => {
    if (currentFlatIndex < totalQuestions - 1) {
      const nextQ = allQuestions[currentFlatIndex + 1]
      setCurrentCategoryIndex(nextQ.categoryIndex)
      setCurrentQuestionIndex(nextQ.questionIndex)
      setQuestionStartTime(Date.now())
    } else {
      // End of questionnaire
      setShowComplete(true)
    }
  }, [currentFlatIndex, totalQuestions, allQuestions])

  const goPrev = useCallback(() => {
    if (currentFlatIndex > 0) {
      const prevQ = allQuestions[currentFlatIndex - 1]
      setCurrentCategoryIndex(prevQ.categoryIndex)
      setCurrentQuestionIndex(prevQ.questionIndex)
      setQuestionStartTime(Date.now())
    }
  }, [currentFlatIndex, allQuestions])

  // Save progress to server
  const saveProgress = useCallback(async (isComplete = false) => {
    if (isComplete) {
      setCompleting(true)
    } else {
      setSaving(true)
    }

    try {
      const res = await fetch(`/api/questionnaire/${params.token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: Object.values(answers),
          isComplete
        })
      })

      if (res.ok) {
        const data = await res.json()
        if (data.status === 'COMPLETED') {
          // Show success screen
          setShowComplete(true)
        }
      } else {
        const err = await res.json()
        alert(err.error || 'Erro ao salvar')
      }
    } catch (error) {
      console.error('Error saving:', error)
    } finally {
      setSaving(false)
      setCompleting(false)
    }
  }, [answers, params.token]);

  // Auto-save every 30 seconds
  useEffect(() => {
    if (Object.keys(answers).length === 0) return
    
    const interval = setInterval(() => {
      saveProgress(false)
    }, 30000)

    return () => clearInterval(interval)
  }, [answers, saveProgress])

  // Current answer value
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : null

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-green-600 mb-4" />
          <p className="text-gray-600">Carregando questionário...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center">
            <div className="text-6xl mb-4">😔</div>
            <h2 className="text-xl font-bold text-red-600 mb-2">Ops!</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <Button onClick={() => router.push('/')}>
              <Home className="h-4 w-4 mr-2" />
              Voltar ao início
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!questionnaire) return null

  const themeColor = questionnaire.template.themeColor || '#10B981'

  // Intro Screen
  if (showIntro) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center p-4"
        style={{ background: `linear-gradient(135deg, ${themeColor}10, ${themeColor}05)` }}
      >
        <Card className="max-w-2xl w-full shadow-xl">
          <CardHeader className="text-center pb-2">
            <div className="text-6xl mb-4">{questionnaire.template.iconEmoji || '📋'}</div>
            <CardTitle className="text-2xl">{questionnaire.template.name}</CardTitle>
            <CardDescription>{questionnaire.template.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {questionnaire.template.patientIntro && (
              <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground whitespace-pre-wrap">
                {questionnaire.template.patientIntro}
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-4 bg-muted/30 rounded-lg">
                <Clock className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                <p className="text-2xl font-bold">{questionnaire.template.estimatedMinutes}</p>
                <p className="text-sm text-muted-foreground">minutos</p>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg">
                <Sparkles className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                <p className="text-2xl font-bold">{totalQuestions}</p>
                <p className="text-sm text-muted-foreground">perguntas</p>
              </div>
            </div>

            <div className="text-center text-sm text-muted-foreground">
              <p>Olá, <strong>{questionnaire.patient.name}</strong>!</p>
              <p className="mt-1">
                Este questionário foi enviado por <strong>Dr(a). {questionnaire.sentBy.name}</strong>
                {questionnaire.sentBy.speciality && ` (${questionnaire.sentBy.speciality})`}
              </p>
            </div>

            {questionnaire.template.allowPause && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground justify-center">
                <Pause className="h-4 w-4" />
                <span>Você pode pausar e continuar depois</span>
              </div>
            )}

            <Button 
              className="w-full h-12 text-lg"
              style={{ backgroundColor: themeColor }}
              onClick={() => setShowIntro(false)}
            >
              <Play className="h-5 w-5 mr-2" />
              Começar
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Complete Screen
  if (showComplete && questionnaire.status !== 'COMPLETED') {
    return (
      <div 
        className="min-h-screen flex items-center justify-center p-4"
        style={{ background: `linear-gradient(135deg, ${themeColor}10, ${themeColor}05)` }}
      >
        <Card className="max-w-md w-full shadow-xl">
          <CardContent className="py-12 text-center space-y-6">
            <div className="text-6xl">🎉</div>
            <h2 className="text-2xl font-bold">Você chegou ao fim!</h2>
            <p className="text-muted-foreground">
              Você respondeu {answeredCount} de {totalQuestions} perguntas.
            </p>
            
            <div className="flex flex-col gap-3">
              <Button 
                className="w-full h-12"
                style={{ backgroundColor: themeColor }}
                onClick={() => saveProgress(true)}
                disabled={completing}
              >
                {completing ? (
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                ) : (
                  <Check className="h-5 w-5 mr-2" />
                )}
                Finalizar e Enviar
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowComplete(false)}
              >
                Revisar respostas
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Already completed
  if (questionnaire.status === 'COMPLETED') {
    return (
      <div 
        className="min-h-screen flex items-center justify-center p-4"
        style={{ background: `linear-gradient(135deg, ${themeColor}10, ${themeColor}05)` }}
      >
        <Card className="max-w-md w-full shadow-xl">
          <CardContent className="py-12 text-center space-y-6">
            <div className="text-6xl">✅</div>
            <h2 className="text-2xl font-bold">Obrigado!</h2>
            <p className="text-muted-foreground">
              Suas respostas foram enviadas com sucesso.
            </p>
            <p className="text-sm text-muted-foreground">
              O(a) Dr(a). {questionnaire.sentBy.name} irá analisar suas respostas.
            </p>
            <Button onClick={() => router.push('/')}>
              <Home className="h-4 w-4 mr-2" />
              Ir para o início
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Main Question Screen
  return (
    <div 
      className="min-h-screen py-6 px-4"
      style={{ background: `linear-gradient(135deg, ${themeColor}08, white)` }}
    >
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Progress Bar */}
        {questionnaire.template.showProgress && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {currentQuestion?.categoryEmoji} {currentQuestion?.categoryName}
              </span>
              <span className="text-muted-foreground">
                {currentFlatIndex + 1} de {totalQuestions}
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Question Card */}
        <Card className="shadow-lg">
          <CardContent className="p-6 md:p-8">
            {/* Question Text */}
            <div className="mb-8">
              <h2 className="text-xl md:text-2xl font-semibold mb-2">
                {currentQuestion?.text}
                {currentQuestion?.isRequired && (
                  <span className="text-red-500 ml-1">*</span>
                )}
              </h2>
              {currentQuestion?.helpText && (
                <p className="text-muted-foreground">{currentQuestion.helpText}</p>
              )}
            </div>

            {/* Answer Input */}
            <div className="space-y-4">
              {/* Single Choice */}
              {currentQuestion?.type === 'SINGLE_CHOICE' && (
                <div className="grid gap-3">
                  {currentQuestion.options.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => {
                        saveCurrentAnswer({ selectedOptionId: opt.id })
                      }}
                      className={cn(
                        "p-4 rounded-xl border-2 text-left transition-all hover:scale-[1.02]",
                        currentAnswer?.selectedOptionId === opt.id
                          ? "border-primary bg-primary/10"
                          : "border-muted hover:border-muted-foreground/30"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        {opt.emoji && <span className="text-2xl">{opt.emoji}</span>}
                        <div>
                          <p className="font-medium">{opt.text}</p>
                          {opt.description && (
                            <p className="text-sm text-muted-foreground">{opt.description}</p>
                          )}
                        </div>
                        {currentAnswer?.selectedOptionId === opt.id && (
                          <Check className="h-5 w-5 ml-auto text-primary" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Multiple Choice */}
              {currentQuestion?.type === 'MULTIPLE_CHOICE' && (
                <div className="grid gap-3">
                  {currentQuestion.options.map(opt => {
                    const selected = currentAnswer?.selectedOptionIds?.includes(opt.id)
                    return (
                      <button
                        key={opt.id}
                        onClick={() => {
                          const current = currentAnswer?.selectedOptionIds || []
                          const updated = selected
                            ? current.filter(id => id !== opt.id)
                            : [...current, opt.id]
                          saveCurrentAnswer({ selectedOptionIds: updated })
                        }}
                        className={cn(
                          "p-4 rounded-xl border-2 text-left transition-all hover:scale-[1.02]",
                          selected
                            ? "border-primary bg-primary/10"
                            : "border-muted hover:border-muted-foreground/30"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          {opt.emoji && <span className="text-2xl">{opt.emoji}</span>}
                          <div className="flex-1">
                            <p className="font-medium">{opt.text}</p>
                            {opt.description && (
                              <p className="text-sm text-muted-foreground">{opt.description}</p>
                            )}
                          </div>
                          <div className={cn(
                            "w-6 h-6 rounded border-2 flex items-center justify-center",
                            selected ? "border-primary bg-primary" : "border-muted"
                          )}>
                            {selected && <Check className="h-4 w-4 text-white" />}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                  <p className="text-sm text-muted-foreground text-center">
                    Selecione todas que se aplicam
                  </p>
                </div>
              )}

              {/* Scale */}
              {currentQuestion?.type === 'SCALE' && (
                <div className="py-8">
                  <div className="mb-6">
                    <Slider
                      min={currentQuestion.scaleMin || 1}
                      max={currentQuestion.scaleMax || 10}
                      step={1}
                      value={[currentAnswer?.numericValue || currentQuestion.scaleMin || 1]}
                      onValueChange={([val]) => saveCurrentAnswer({ numericValue: val })}
                      className="w-full"
                    />
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{currentQuestion.scaleMinLabel || currentQuestion.scaleMin}</span>
                    <span className="text-2xl font-bold text-primary">
                      {currentAnswer?.numericValue || '-'}
                    </span>
                    <span>{currentQuestion.scaleMaxLabel || currentQuestion.scaleMax}</span>
                  </div>
                </div>
              )}

              {/* Text */}
              {currentQuestion?.type === 'TEXT' && (
                <Textarea
                  placeholder="Digite sua resposta..."
                  value={currentAnswer?.textValue || ''}
                  onChange={(e) => saveCurrentAnswer({ textValue: e.target.value })}
                  className="min-h-[150px]"
                />
              )}

              {/* Yes/No */}
              {currentQuestion?.type === 'YES_NO' && (
                <div className="flex gap-4 justify-center">
                  {[
                    { value: true, label: 'Sim', emoji: '👍' },
                    { value: false, label: 'Não', emoji: '👎' }
                  ].map(opt => (
                    <button
                      key={String(opt.value)}
                      onClick={() => saveCurrentAnswer({ booleanValue: opt.value })}
                      className={cn(
                        "flex-1 p-6 rounded-xl border-2 text-center transition-all hover:scale-105",
                        currentAnswer?.booleanValue === opt.value
                          ? "border-primary bg-primary/10"
                          : "border-muted hover:border-muted-foreground/30"
                      )}
                    >
                      <span className="text-4xl block mb-2">{opt.emoji}</span>
                      <span className="font-medium">{opt.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={goPrev}
            disabled={currentFlatIndex === 0}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Anterior
          </Button>

          {saving && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Salvando...
            </div>
          )}

          <Button
            onClick={goNext}
            style={{ backgroundColor: themeColor }}
          >
            {currentFlatIndex === totalQuestions - 1 ? 'Finalizar' : 'Próxima'}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>

        {/* Pause Button */}
        {questionnaire.template.allowPause && (
          <div className="text-center">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => {
                saveProgress(false)
                alert('Progresso salvo! Você pode fechar esta página e continuar depois.')
              }}
              disabled={saving}
            >
              <Pause className="h-4 w-4 mr-2" />
              Pausar e salvar progresso
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
