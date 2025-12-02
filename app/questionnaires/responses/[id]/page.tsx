"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  ArrowLeft, 
  Brain, 
  FileText, 
  Loader2,
  CheckCircle,
  Clock,
  Sparkles,
  User,
  Lightbulb,
  Leaf,
  Flame,
  Droplets,
  Sun,
  Moon,
  Wind,
  Mountain,
  Waves,
  TreePine,
  Zap
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// Universal Analysis Interface
interface UniversalAnalysis {
  isUniversal: true
  systems: {
    ayurveda: {
      profile: Array<{ name: string; percent: number }>
      primary: string
      secondary: string
      description: string
    }
    anthroposophy: {
      profile: Array<{ name: string; percent: number }>
      primary: string
      secondary: string
      description: string
    }
    tcm: {
      elements: Array<{ name: string; percent: number }>
      primaryElement: string
      yinYangBalance: { yin: number; yang: number }
      description: string
    }
    homeopathy: {
      thermalProfile: { hot: number; cold: number }
      humidityProfile: { dry: number; wet: number }
      modalities: string[]
      description: string
    }
  }
  synthesis: {
    convergentPatterns: string[]
    uniqueInsights: string[]
    clinicalCorrelations: string[]
  }
  practicalRecommendations: {
    morningRoutine: string[]
    diet: string[]
    exercise: string[]
    eveningRoutine: string[]
    therapies: string[]
  }
}

interface Analysis {
  scores: Record<string, number>
  percentages: Record<string, number>
  totalScore: number
  analyzedAt: string
  aiAnalyzedAt?: string
  primaryDosha?: string
  secondaryDosha?: string
  doshaProfile?: Array<{ name: string; score: number; percent: number }>
  primaryTemperament?: string
  secondaryTemperament?: string
  temperamentProfile?: Array<{ name: string; score: number; percent: number }>
  recommendations?: {
    diet?: string[]
    lifestyle?: string[]
    therapies?: string[]
    strengths?: string[]
    challenges?: string[]
    therapeutic?: string[]
  }
  answersFormatted?: Array<{
    questionId: string
    questionText: string
    answer: string
    timeSpent?: number
  }>
  // Universal analysis fields
  isUniversal?: boolean
  systems?: UniversalAnalysis['systems']
  synthesis?: UniversalAnalysis['synthesis']
  practicalRecommendations?: UniversalAnalysis['practicalRecommendations']
}

interface Response {
  id: string
  status: string
  progressPercent: number
  sentAt: string
  startedAt: string | null
  completedAt: string | null
  aiAnalysis: Analysis | null
  aiAnalyzedAt: string | null
  professionalNotes: string | null
  template: {
    name: string
    iconEmoji: string
    therapeuticSystem: string
    themeColor: string | null
  }
  patient: {
    id: string
    name: string
    email: string
    birthDate: string
    gender: string
  }
  answers: Array<{
    id: string
    questionId: string
    textValue: string | null
    numericValue: number | null
    booleanValue: boolean | null
    selectedOptionId: string | null
    selectedOptionIds: string[]
    timeSpentSeconds: number | null
    question: {
      text: string
      type: string
      category: {
        name: string
        iconEmoji: string | null
      }
    }
    selectedOption: {
      text: string
      emoji: string | null
    } | null
  }>
}

const DOSHA_COLORS: Record<string, string> = {
  Vata: '#7C3AED', // Purple
  Pitta: '#DC2626', // Red
  Kapha: '#059669'  // Green
}

const TEMPERAMENT_COLORS: Record<string, string> = {
  'Sanguíneo': '#F59E0B',  // Amber
  'Colérico': '#DC2626',   // Red
  'Melancólico': '#3B82F6', // Blue
  'Fleumático': '#10B981'  // Green
}

const TCM_ELEMENT_COLORS: Record<string, string> = {
  'Madeira': '#22C55E', // Green
  'Fogo': '#EF4444',    // Red
  'Terra': '#F59E0B',   // Yellow/Amber
  'Metal': '#9CA3AF',   // Gray
  'Água': '#3B82F6'     // Blue
}

const TCM_ELEMENT_ICONS: Record<string, string> = {
  'Madeira': '🌳',
  'Fogo': '🔥',
  'Terra': '🏔️',
  'Metal': '⚙️',
  'Água': '💧'
}

const DOSHA_EMOJIS: Record<string, string> = {
  'Vata': '💨',
  'Pitta': '🔥',
  'Kapha': '💧'
}

const TEMPERAMENT_EMOJIS: Record<string, string> = {
  'Sanguíneo': '☀️',
  'Colérico': '⚡',
  'Melancólico': '🌙',
  'Fleumático': '🌊'
}

export default function ResponseDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [response, setResponse] = useState<Response | null>(null)
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)

  useEffect(() => {
    fetchResponse()
  }, [params.id])

  async function fetchResponse() {
    try {
      const res = await fetch(`/api/questionnaires/responses/${params.id}`)
      if (res.ok) {
        const data = await res.json()
        setResponse(data)
      }
    } catch (error) {
      console.error('Error fetching response:', error)
    } finally {
      setLoading(false)
    }
  }

  async function runAnalysis() {
    setAnalyzing(true)
    try {
      const res = await fetch(`/api/questionnaires/responses/${params.id}/analyze`, {
        method: 'POST'
      })
      if (res.ok) {
        const analysis = await res.json()
        setResponse(prev => prev ? { ...prev, aiAnalysis: analysis, aiAnalyzedAt: new Date().toISOString() } : null)
      } else {
        const err = await res.json()
        alert(`Erro: ${err.error}`)
      }
    } catch (error) {
      console.error('Error analyzing:', error)
    } finally {
      setAnalyzing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!response) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Resposta não encontrada</h3>
            <Button className="mt-4" onClick={() => router.back()}>
              Voltar
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const themeColor = response.template.themeColor || '#10B981'
  const analysis = response.aiAnalysis

  // Group answers by category
  const answersByCategory = response.answers.reduce((acc, answer) => {
    const catName = answer.question.category.name
    if (!acc[catName]) {
      acc[catName] = {
        name: catName,
        emoji: answer.question.category.iconEmoji,
        answers: []
      }
    }
    acc[catName].answers.push(answer)
    return acc
  }, {} as Record<string, { name: string; emoji: string | null; answers: typeof response.answers }>)

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{response.template.iconEmoji}</span>
            <div>
              <h1 className="text-2xl font-bold">{response.template.name}</h1>
              <p className="text-muted-foreground">Respostas de {response.patient.name}</p>
            </div>
          </div>
        </div>
        {!analysis && (
          <Button 
            onClick={runAnalysis} 
            disabled={analyzing}
            style={{ backgroundColor: themeColor }}
          >
            {analyzing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Brain className="h-4 w-4 mr-2" />
            )}
            Analisar com IA
          </Button>
        )}
      </div>

      {/* Patient Info & Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">{response.patient.name}</p>
                <p className="text-sm text-muted-foreground">{response.patient.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="font-medium">Completado</p>
                <p className="text-sm text-muted-foreground">
                  {response.completedAt && format(new Date(response.completedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">{response.answers.length} respostas</p>
                <p className="text-sm text-muted-foreground">100% completado</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">
                  {Math.round(response.answers.reduce((acc, a) => acc + (a.timeSpentSeconds || 0), 0) / 60)} min
                </p>
                <p className="text-sm text-muted-foreground">Tempo total</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analysis Results */}
      {analysis && (
        <div className="space-y-6">
          {/* Universal Integrative Analysis */}
          {analysis.isUniversal && analysis.systems ? (
            <>
              {/* Header Card */}
              <Card className="border-2 border-gradient-to-r from-purple-500 to-orange-500 bg-gradient-to-r from-purple-50 to-orange-50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <Sparkles className="h-6 w-6 text-purple-600" />
                      🌟 Análise Integrativa Universal
                    </CardTitle>
                    <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                      4 Sistemas Analisados
                    </Badge>
                  </div>
                  <CardDescription className="text-base">
                    Perfil completo baseado em Ayurveda, Medicina Tradicional Chinesa, Homeopatia e Antroposofia
                  </CardDescription>
                </CardHeader>
              </Card>

              {/* Four Systems Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Ayurveda Card */}
                <Card className="border-l-4 border-l-purple-500">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      🕉️ Ayurveda
                      <Badge variant="outline" className="ml-auto text-purple-600 border-purple-300">
                        {analysis.systems.ayurveda.primary}-{analysis.systems.ayurveda.secondary}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-2">
                      {analysis.systems.ayurveda.profile.map(d => (
                        <div key={d.name} className="text-center p-3 rounded-lg bg-muted/50">
                          <div className="text-lg mb-1">{DOSHA_EMOJIS[d.name] || ''}</div>
                          <div className="text-xl font-bold" style={{ color: DOSHA_COLORS[d.name] }}>
                            {d.percent}%
                          </div>
                          <div className="text-xs font-medium">{d.name}</div>
                          <Progress value={d.percent} className="h-1.5 mt-1" />
                        </div>
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground">{analysis.systems.ayurveda.description}</p>
                  </CardContent>
                </Card>

                {/* Anthroposophy Card */}
                <Card className="border-l-4 border-l-amber-500">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      🔮 Antroposofia
                      <Badge variant="outline" className="ml-auto text-amber-600 border-amber-300">
                        {analysis.systems.anthroposophy.primary}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-4 gap-2">
                      {analysis.systems.anthroposophy.profile.map(t => (
                        <div key={t.name} className="text-center p-2 rounded-lg bg-muted/50">
                          <div className="text-lg mb-1">{TEMPERAMENT_EMOJIS[t.name] || ''}</div>
                          <div className="text-lg font-bold" style={{ color: TEMPERAMENT_COLORS[t.name] }}>
                            {t.percent}%
                          </div>
                          <div className="text-xs font-medium truncate">{t.name}</div>
                          <Progress value={t.percent} className="h-1.5 mt-1" />
                        </div>
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground">{analysis.systems.anthroposophy.description}</p>
                  </CardContent>
                </Card>

                {/* TCM Card */}
                <Card className="border-l-4 border-l-green-500">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      ☯️ Medicina Tradicional Chinesa
                      <Badge variant="outline" className="ml-auto text-green-600 border-green-300">
                        {analysis.systems.tcm.primaryElement}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-5 gap-1">
                      {analysis.systems.tcm.elements.map(e => (
                        <div key={e.name} className="text-center p-2 rounded-lg bg-muted/50">
                          <div className="text-lg mb-1">{TCM_ELEMENT_ICONS[e.name] || ''}</div>
                          <div className="text-lg font-bold" style={{ color: TCM_ELEMENT_COLORS[e.name] }}>
                            {e.percent}%
                          </div>
                          <div className="text-xs font-medium">{e.name}</div>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-center gap-4 mt-2">
                      <div className="flex items-center gap-2">
                        <Moon className="h-4 w-4 text-blue-500" />
                        <span className="text-sm">Yin: {analysis.systems.tcm.yinYangBalance.yin}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Sun className="h-4 w-4 text-orange-500" />
                        <span className="text-sm">Yang: {analysis.systems.tcm.yinYangBalance.yang}%</span>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{analysis.systems.tcm.description}</p>
                  </CardContent>
                </Card>

                {/* Homeopathy Card */}
                <Card className="border-l-4 border-l-blue-500">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      💊 Homeopatia
                      <Badge variant="outline" className="ml-auto text-blue-600 border-blue-300">
                        Modalidades
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="flex items-center gap-1">
                            <Flame className="h-3 w-3 text-red-500" /> Calor
                          </span>
                          <span>{analysis.systems.homeopathy.thermalProfile.hot}%</span>
                        </div>
                        <Progress value={analysis.systems.homeopathy.thermalProfile.hot} className="h-2 bg-red-100" />
                        <div className="flex justify-between text-sm">
                          <span className="flex items-center gap-1">
                            <Droplets className="h-3 w-3 text-blue-500" /> Frio
                          </span>
                          <span>{analysis.systems.homeopathy.thermalProfile.cold}%</span>
                        </div>
                        <Progress value={analysis.systems.homeopathy.thermalProfile.cold} className="h-2 bg-blue-100" />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="flex items-center gap-1">
                            <Wind className="h-3 w-3 text-yellow-600" /> Seco
                          </span>
                          <span>{analysis.systems.homeopathy.humidityProfile.dry}%</span>
                        </div>
                        <Progress value={analysis.systems.homeopathy.humidityProfile.dry} className="h-2 bg-yellow-100" />
                        <div className="flex justify-between text-sm">
                          <span className="flex items-center gap-1">
                            <Waves className="h-3 w-3 text-cyan-500" /> Úmido
                          </span>
                          <span>{analysis.systems.homeopathy.humidityProfile.wet}%</span>
                        </div>
                        <Progress value={analysis.systems.homeopathy.humidityProfile.wet} className="h-2 bg-cyan-100" />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {analysis.systems.homeopathy.modalities.map((m, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">{m}</Badge>
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground">{analysis.systems.homeopathy.description}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Synthesis Section */}
              {analysis.synthesis && (
                <Card className="border-2 border-purple-200 bg-purple-50/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="h-5 w-5 text-purple-600" />
                      Síntese Integrativa
                    </CardTitle>
                    <CardDescription>
                      Padrões convergentes identificados entre os diferentes sistemas
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {analysis.synthesis.convergentPatterns && analysis.synthesis.convergentPatterns.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm flex items-center gap-2">
                          <Zap className="h-4 w-4 text-amber-500" />
                          Padrões Convergentes
                        </h4>
                        <div className="grid md:grid-cols-2 gap-2">
                          {analysis.synthesis.convergentPatterns.map((p, i) => (
                            <div key={i} className="p-2 bg-white rounded border border-purple-200 text-sm">
                              {p}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {analysis.synthesis.uniqueInsights && analysis.synthesis.uniqueInsights.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm flex items-center gap-2">
                          <Lightbulb className="h-4 w-4 text-yellow-500" />
                          Insights Únicos
                        </h4>
                        <ul className="space-y-1">
                          {analysis.synthesis.uniqueInsights.map((ins, i) => (
                            <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                              <span className="text-purple-500">•</span>
                              {ins}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {analysis.synthesis.clinicalCorrelations && analysis.synthesis.clinicalCorrelations.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm flex items-center gap-2">
                          <FileText className="h-4 w-4 text-blue-500" />
                          Correlações Clínicas
                        </h4>
                        <ul className="space-y-1">
                          {analysis.synthesis.clinicalCorrelations.map((cc, i) => (
                            <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                              <span className="text-blue-500">•</span>
                              {cc}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Practical Recommendations */}
              {analysis.practicalRecommendations && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lightbulb className="h-5 w-5 text-amber-500" />
                      Recomendações Práticas Integradas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-4">
                      {analysis.practicalRecommendations.morningRoutine && (
                        <div className="p-4 rounded-lg bg-orange-50 border border-orange-200">
                          <h4 className="font-medium text-orange-800 mb-2 flex items-center gap-2">
                            <Sun className="h-4 w-4" /> Rotina Matinal
                          </h4>
                          <ul className="text-sm space-y-1 text-orange-700">
                            {analysis.practicalRecommendations.morningRoutine.map((r, i) => (
                              <li key={i}>• {r}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {analysis.practicalRecommendations.diet && (
                        <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                          <h4 className="font-medium text-green-800 mb-2 flex items-center gap-2">
                            <Leaf className="h-4 w-4" /> Alimentação
                          </h4>
                          <ul className="text-sm space-y-1 text-green-700">
                            {analysis.practicalRecommendations.diet.map((r, i) => (
                              <li key={i}>• {r}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {analysis.practicalRecommendations.exercise && (
                        <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                          <h4 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
                            <Zap className="h-4 w-4" /> Exercícios
                          </h4>
                          <ul className="text-sm space-y-1 text-blue-700">
                            {analysis.practicalRecommendations.exercise.map((r, i) => (
                              <li key={i}>• {r}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {analysis.practicalRecommendations.eveningRoutine && (
                        <div className="p-4 rounded-lg bg-indigo-50 border border-indigo-200">
                          <h4 className="font-medium text-indigo-800 mb-2 flex items-center gap-2">
                            <Moon className="h-4 w-4" /> Rotina Noturna
                          </h4>
                          <ul className="text-sm space-y-1 text-indigo-700">
                            {analysis.practicalRecommendations.eveningRoutine.map((r, i) => (
                              <li key={i}>• {r}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {analysis.practicalRecommendations.therapies && (
                        <div className="p-4 rounded-lg bg-purple-50 border border-purple-200">
                          <h4 className="font-medium text-purple-800 mb-2 flex items-center gap-2">
                            <Sparkles className="h-4 w-4" /> Terapias
                          </h4>
                          <ul className="text-sm space-y-1 text-purple-700">
                            {analysis.practicalRecommendations.therapies.map((r, i) => (
                              <li key={i}>• {r}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            /* Standard Single-System Analysis */
            <Card className="border-2" style={{ borderColor: themeColor }}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" style={{ color: themeColor }} />
                Análise
              </CardTitle>
              <Badge variant="secondary">
                Analisado {(response.aiAnalyzedAt || analysis.analyzedAt) && formatDistanceToNow(new Date(response.aiAnalyzedAt || analysis.analyzedAt), { addSuffix: true, locale: ptBR })}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Dosha Profile (Ayurveda) */}
            {analysis.doshaProfile && (
              <div className="space-y-4">
                <div className="text-center">
                  <h3 className="text-lg font-semibold">Perfil de Prakriti (Constituição)</h3>
                  <p className="text-3xl font-bold mt-2" style={{ color: DOSHA_COLORS[analysis.primaryDosha || ''] }}>
                    {analysis.primaryDosha}-{analysis.secondaryDosha}
                  </p>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  {analysis.doshaProfile.map(d => (
                    <div key={d.name} className="text-center p-4 rounded-lg bg-muted/50">
                      <div 
                        className="text-2xl font-bold"
                        style={{ color: DOSHA_COLORS[d.name] }}
                      >
                        {d.percent}%
                      </div>
                      <div className="font-medium">{d.name}</div>
                      <Progress 
                        value={d.percent} 
                        className="h-2 mt-2"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Temperament Profile (Anthroposophy) */}
            {analysis.temperamentProfile && (
              <div className="space-y-4">
                <div className="text-center">
                  <h3 className="text-lg font-semibold">Perfil de Temperamento</h3>
                  <p className="text-3xl font-bold mt-2" style={{ color: TEMPERAMENT_COLORS[analysis.primaryTemperament || ''] }}>
                    {analysis.primaryTemperament}
                  </p>
                  <p className="text-muted-foreground">
                    com tendências {analysis.secondaryTemperament}
                  </p>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {analysis.temperamentProfile.map(t => (
                    <div key={t.name} className="text-center p-4 rounded-lg bg-muted/50">
                      <div 
                        className="text-2xl font-bold"
                        style={{ color: TEMPERAMENT_COLORS[t.name] }}
                      >
                        {t.percent}%
                      </div>
                      <div className="font-medium text-sm">{t.name}</div>
                      <Progress 
                        value={t.percent} 
                        className="h-2 mt-2"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {analysis.recommendations && (
              <div className="space-y-4 pt-4 border-t">
                <h3 className="font-semibold flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-amber-500" />
                  Recomendações
                </h3>
                
                <div className="grid md:grid-cols-3 gap-4">
                  {analysis.recommendations.diet && (
                    <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                      <h4 className="font-medium text-green-800 mb-2">🥗 Alimentação</h4>
                      <ul className="text-sm space-y-1 text-green-700">
                        {analysis.recommendations.diet.map((r, i) => (
                          <li key={i}>• {r}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {analysis.recommendations.lifestyle && (
                    <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                      <h4 className="font-medium text-blue-800 mb-2">🌟 Estilo de Vida</h4>
                      <ul className="text-sm space-y-1 text-blue-700">
                        {analysis.recommendations.lifestyle.map((r, i) => (
                          <li key={i}>• {r}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {analysis.recommendations.therapies && (
                    <div className="p-4 rounded-lg bg-purple-50 border border-purple-200">
                      <h4 className="font-medium text-purple-800 mb-2">💆 Terapias</h4>
                      <ul className="text-sm space-y-1 text-purple-700">
                        {analysis.recommendations.therapies.map((r, i) => (
                          <li key={i}>• {r}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {analysis.recommendations.strengths && (
                    <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                      <h4 className="font-medium text-green-800 mb-2">💪 Pontos Fortes</h4>
                      <ul className="text-sm space-y-1 text-green-700">
                        {analysis.recommendations.strengths.map((r, i) => (
                          <li key={i}>• {r}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {analysis.recommendations.challenges && (
                    <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
                      <h4 className="font-medium text-amber-800 mb-2">⚠️ Desafios</h4>
                      <ul className="text-sm space-y-1 text-amber-700">
                        {analysis.recommendations.challenges.map((r, i) => (
                          <li key={i}>• {r}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {analysis.recommendations.therapeutic && (
                    <div className="p-4 rounded-lg bg-purple-50 border border-purple-200">
                      <h4 className="font-medium text-purple-800 mb-2">🎯 Sugestões Terapêuticas</h4>
                      <ul className="text-sm space-y-1 text-purple-700">
                        {analysis.recommendations.therapeutic.map((r, i) => (
                          <li key={i}>• {r}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
          )}
        </div>
      )}

      {/* Detailed Answers */}
      <Card>
        <CardHeader>
          <CardTitle>Respostas Detalhadas</CardTitle>
          <CardDescription>
            Todas as respostas do paciente organizadas por categoria
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {Object.values(answersByCategory).map(category => (
            <div key={category.name} className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                {category.emoji && <span>{category.emoji}</span>}
                {category.name}
              </h3>
              
              <div className="space-y-3 pl-4 border-l-2 border-muted">
                {category.answers.map(answer => (
                  <div key={answer.id} className="p-3 bg-muted/30 rounded-lg">
                    <p className="font-medium text-sm">{answer.question.text}</p>
                    <div className="mt-2 flex items-center gap-2">
                      {answer.selectedOption && (
                        <Badge variant="secondary">
                          {answer.selectedOption.emoji && <span className="mr-1">{answer.selectedOption.emoji}</span>}
                          {answer.selectedOption.text}
                        </Badge>
                      )}
                      {answer.selectedOptionIds && answer.selectedOptionIds.length > 0 && (
                        <span className="text-sm text-muted-foreground">
                          {answer.selectedOptionIds.length} selecionados
                        </span>
                      )}
                      {answer.textValue && (
                        <span className="text-sm italic">"{answer.textValue}"</span>
                      )}
                      {answer.numericValue !== null && (
                        <Badge>{answer.numericValue}</Badge>
                      )}
                      {answer.booleanValue !== null && (
                        <Badge variant={answer.booleanValue ? 'default' : 'secondary'}>
                          {answer.booleanValue ? 'Sim' : 'Não'}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
