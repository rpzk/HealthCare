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
  Sparkles,
  Heart,
  Shield,
  Users,
  Scale,
  Star,
  Lightbulb,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Trophy,
  Gem
} from 'lucide-react'

interface Strength {
  id: string
  code: string
  name: string
  virtue: string
  description: string
  examples: string[]
  healthTips: string[]
}

interface AssessmentResult {
  strengthId: string
  strength: Strength
  score: number
  rank: number
}

interface Assessment {
  id: string
  status: string
  results: AssessmentResult[]
}

// Questões para avaliar forças (simplificadas para MVP)
const strengthQuestions = [
  {
    id: 1,
    text: 'Quando enfrento um problema novo, geralmente...',
    options: [
      { text: 'Busco uma solução criativa e diferente', strengths: ['CREATIVITY'] },
      { text: 'Pesquiso e aprendo tudo sobre o assunto', strengths: ['CURIOSITY', 'LOVE_OF_LEARNING'] },
      { text: 'Analiso cuidadosamente antes de agir', strengths: ['JUDGMENT', 'PRUDENCE'] },
      { text: 'Peço conselhos a pessoas experientes', strengths: ['PERSPECTIVE', 'HUMILITY'] }
    ]
  },
  {
    id: 2,
    text: 'Em situações difíceis, o que me move é...',
    options: [
      { text: 'A coragem de enfrentar mesmo com medo', strengths: ['BRAVERY'] },
      { text: 'A persistência em não desistir', strengths: ['PERSEVERANCE'] },
      { text: 'Ser verdadeiro comigo mesmo', strengths: ['HONESTY'] },
      { text: 'Manter o entusiasmo e energia', strengths: ['ZEST'] }
    ]
  },
  {
    id: 3,
    text: 'Nos meus relacionamentos, valorizo mais...',
    options: [
      { text: 'Conexões profundas e significativas', strengths: ['LOVE'] },
      { text: 'Ajudar e cuidar dos outros', strengths: ['KINDNESS'] },
      { text: 'Entender as pessoas e suas emoções', strengths: ['SOCIAL_INTELLIGENCE'] },
      { text: 'Trabalhar bem em grupo', strengths: ['TEAMWORK'] }
    ]
  },
  {
    id: 4,
    text: 'Para mim, justiça significa...',
    options: [
      { text: 'Tratar todos de forma igual', strengths: ['FAIRNESS'] },
      { text: 'Liderar pelo exemplo', strengths: ['LEADERSHIP'] },
      { text: 'Colaborar para o bem comum', strengths: ['TEAMWORK'] },
      { text: 'Defender os mais vulneráveis', strengths: ['BRAVERY', 'KINDNESS'] }
    ]
  },
  {
    id: 5,
    text: 'Quando erro ou falho, eu...',
    options: [
      { text: 'Perdoo a mim e aos outros facilmente', strengths: ['FORGIVENESS'] },
      { text: 'Reconheço minhas limitações', strengths: ['HUMILITY'] },
      { text: 'Reflito cuidadosamente sobre o que aconteceu', strengths: ['PRUDENCE'] },
      { text: 'Uso como aprendizado e sigo em frente', strengths: ['PERSEVERANCE', 'HOPE'] }
    ]
  },
  {
    id: 6,
    text: 'Minha forma de controlar impulsos é...',
    options: [
      { text: 'Disciplina e autocontrole', strengths: ['SELF_REGULATION'] },
      { text: 'Pensar nas consequências futuras', strengths: ['PRUDENCE', 'PERSPECTIVE'] },
      { text: 'Buscar algo que me acalme', strengths: ['APPRECIATION_OF_BEAUTY', 'SPIRITUALITY'] },
      { text: 'Conversar com alguém de confiança', strengths: ['LOVE', 'SOCIAL_INTELLIGENCE'] }
    ]
  },
  {
    id: 7,
    text: 'O que mais me traz paz e alegria é...',
    options: [
      { text: 'Apreciar a beleza da natureza ou da arte', strengths: ['APPRECIATION_OF_BEAUTY'] },
      { text: 'Reconhecer e agradecer pelas coisas boas', strengths: ['GRATITUDE'] },
      { text: 'Rir e fazer os outros rirem', strengths: ['HUMOR'] },
      { text: 'Conectar-me com algo maior que eu', strengths: ['SPIRITUALITY'] }
    ]
  },
  {
    id: 8,
    text: 'Quando penso no futuro, sinto...',
    options: [
      { text: 'Otimismo e esperança', strengths: ['HOPE'] },
      { text: 'Curiosidade sobre o que vem', strengths: ['CURIOSITY'] },
      { text: 'Determinação para realizar meus planos', strengths: ['PERSEVERANCE', 'ZEST'] },
      { text: 'Gratidão pelo presente', strengths: ['GRATITUDE', 'SPIRITUALITY'] }
    ]
  }
]

const virtueIcons: Record<string, typeof Heart> = {
  WISDOM: Lightbulb,
  COURAGE: Shield,
  HUMANITY: Heart,
  JUSTICE: Scale,
  TEMPERANCE: Star,
  TRANSCENDENCE: Sparkles
}

const virtueLabels: Record<string, string> = {
  WISDOM: 'Sabedoria',
  COURAGE: 'Coragem',
  HUMANITY: 'Humanidade',
  JUSTICE: 'Justiça',
  TEMPERANCE: 'Temperança',
  TRANSCENDENCE: 'Transcendência'
}

const virtueColors: Record<string, string> = {
  WISDOM: 'bg-blue-100 text-blue-700',
  COURAGE: 'bg-red-100 text-red-700',
  HUMANITY: 'bg-pink-100 text-pink-700',
  JUSTICE: 'bg-amber-100 text-amber-700',
  TEMPERANCE: 'bg-green-100 text-green-700',
  TRANSCENDENCE: 'bg-purple-100 text-purple-700'
}

export function StrengthsAssessment() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)
  const [strengths, setStrengths] = useState<Strength[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [showResult, setShowResult] = useState(false)
  const [topStrengths, setTopStrengths] = useState<Strength[]>([])
  const [calculating, setCalculating] = useState(false)

  useEffect(() => {
    loadStrengths()
  }, [])

  const loadStrengths = async () => {
    try {
      setLoading(true)
      
      // Tentar carregar forças
      let response = await fetch('/api/strengths')
      let data = await response.json()

      // Se não houver forças, fazer seed
      if (!data.strengths || data.strengths.length === 0) {
        await fetch('/api/strengths', { method: 'POST' })
        response = await fetch('/api/strengths')
        data = await response.json()
      }

      setStrengths(data.strengths || [])
    } catch (error) {
      logger.error('Erro ao carregar forças:', error)
      toast({ title: 'Erro', description: 'Falha ao carregar dados', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const selectAnswer = (questionIndex: number, optionIndex: number) => {
    setAnswers(prev => ({ ...prev, [questionIndex]: optionIndex }))
  }

  const calculateResults = () => {
    setCalculating(true)
    
    // Contar pontos para cada força
    const scores: Record<string, number> = {}
    
    strengthQuestions.forEach((question, qIndex) => {
      const selectedOption = answers[qIndex]
      if (selectedOption !== undefined) {
        const option = question.options[selectedOption]
        option.strengths.forEach(strengthCode => {
          scores[strengthCode] = (scores[strengthCode] || 0) + 1
        })
      }
    })

    // Ordenar e pegar top 5
    const sorted = Object.entries(scores)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([code]) => code)

    // Mapear para objetos de força
    const topFive = sorted
      .map(code => strengths.find(s => s.code === code))
      .filter((s): s is Strength => s !== undefined)

    setTopStrengths(topFive)
    setShowResult(true)
    setCalculating(false)
  }

  const currentQuestion = strengthQuestions[currentIndex]
  const progress = ((currentIndex + 1) / strengthQuestions.length) * 100
  const allAnswered = strengthQuestions.every((_, idx) => answers[idx] !== undefined)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    )
  }

  // Tela de resultado
  if (showResult && topStrengths.length > 0) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="border-2 border-purple-500 bg-gradient-to-br from-purple-50 to-pink-50">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
              <Gem className="h-8 w-8 text-purple-600" />
            </div>
            <CardTitle className="text-2xl text-purple-800">Suas Gemas Descobertas!</CardTitle>
            <CardDescription>
              Estas são suas principais forças de caráter
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {topStrengths.map((strength, index) => {
              const VirtueIcon = virtueIcons[strength.virtue] || Star
              return (
                <div 
                  key={strength.id}
                  className="p-4 bg-white rounded-xl shadow-sm border-l-4"
                  style={{ borderLeftColor: index === 0 ? '#9333ea' : index === 1 ? '#a855f7' : '#c084fc' }}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-purple-300">#{index + 1}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-gray-900">{strength.name}</h3>
                        <Badge className={virtueColors[strength.virtue]}>
                          <VirtueIcon className="h-3 w-3 mr-1" />
                          {virtueLabels[strength.virtue]}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{strength.description}</p>
                      {strength.healthTips && strength.healthTips.length > 0 && (
                        <div className="p-2 bg-green-50 rounded-lg">
                          <p className="text-xs text-green-800">
                            <strong>💡 Dica de saúde:</strong> {strength.healthTips[0]}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}

            <div className="p-4 bg-amber-50 rounded-lg mt-6">
              <h4 className="font-medium text-amber-900 mb-2">🌟 Como usar suas forças</h4>
              <p className="text-sm text-amber-800">
                Suas forças de caráter são como músculos - quanto mais você as usa, mais fortes ficam.
                Procure aplicá-las nos seus desafios de saúde. Por exemplo, se <strong>{topStrengths[0]?.name}</strong> é 
                sua maior força, pense em como ela pode te ajudar a manter hábitos saudáveis.
              </p>
            </div>

            <div className="flex gap-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowResult(false)
                  setAnswers({})
                  setCurrentIndex(0)
                }}
                className="flex-1"
              >
                Refazer Avaliação
              </Button>
              <Button className="flex-1 bg-purple-600 hover:bg-purple-700">
                Criar Plano de Desenvolvimento
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Tela inicial
  if (Object.keys(answers).length === 0 && currentIndex === 0) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
              <Gem className="h-8 w-8 text-purple-600" />
            </div>
            <CardTitle className="text-2xl">Descoberta de Forças de Caráter</CardTitle>
            <CardDescription className="text-base mt-2">
              Baseado na Psicologia Positiva de Martin Seligman
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-2">O que são Forças de Caráter?</h4>
              <p className="text-sm text-gray-600">
                São qualidades positivas que definem quem você é no seu melhor. 
                Diferente de talentos (que são inatos), forças podem ser desenvolvidas 
                e aplicadas em qualquer área da vida, incluindo sua saúde.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {Object.entries(virtueLabels).map(([key, label]) => {
                const Icon = virtueIcons[key]
                return (
                  <div key={key} className={`flex items-center gap-2 p-2 rounded-lg ${virtueColors[key]}`}>
                    <Icon className="h-4 w-4" />
                    <span className="text-xs font-medium">{label}</span>
                  </div>
                )
              })}
            </div>

            <div className="p-4 bg-purple-50 rounded-lg">
              <p className="text-sm text-purple-800">
                <strong>Tempo estimado:</strong> 5-8 minutos<br />
                <strong>Questões:</strong> {strengthQuestions.length} cenários de escolha<br />
                <strong>Resultado:</strong> Suas 5 principais forças (Gemas)
              </p>
            </div>

            <Button 
              onClick={() => setCurrentIndex(0)} 
              className="w-full bg-purple-600 hover:bg-purple-700" 
              size="lg"
            >
              Descobrir Minhas Forças
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Questionário
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">
            Questão {currentIndex + 1} de {strengthQuestions.length}
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
          <CardTitle className="text-lg leading-relaxed">
            {currentQuestion.text}
          </CardTitle>
          <CardDescription>
            Escolha a opção que mais combina com você
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {currentQuestion.options.map((option, optIdx) => {
            const isSelected = answers[currentIndex] === optIdx
            return (
              <button
                key={optIdx}
                onClick={() => selectAnswer(currentIndex, optIdx)}
                className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                  isSelected
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    isSelected ? 'border-purple-500 bg-purple-500' : 'border-gray-300'
                  }`}>
                    {isSelected && <CheckCircle className="h-4 w-4 text-white" />}
                  </div>
                  <span className={isSelected ? 'text-purple-900' : 'text-gray-700'}>
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

        {currentIndex < strengthQuestions.length - 1 ? (
          <Button
            onClick={() => setCurrentIndex(currentIndex + 1)}
            disabled={answers[currentIndex] === undefined}
            className="bg-purple-600 hover:bg-purple-700"
          >
            Próxima
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={calculateResults}
            disabled={!allAnswered || calculating}
            className="bg-green-600 hover:bg-green-700"
          >
            {calculating ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Trophy className="mr-2 h-4 w-4" />
            )}
            Ver Minhas Forças
          </Button>
        )}
      </div>

      {/* Question dots */}
      <div className="flex justify-center gap-1 flex-wrap">
        {strengthQuestions.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={`w-3 h-3 rounded-full transition-all ${
              idx === currentIndex
                ? 'bg-purple-600 scale-125'
                : answers[idx] !== undefined
                ? 'bg-green-500'
                : 'bg-gray-300'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
