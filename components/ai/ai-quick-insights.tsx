'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Brain,
  Sparkles,
  Loader2,
  AlertTriangle,
  Lightbulb,
  Stethoscope,
  ChevronRight,
  CheckCircle2,
  XCircle,
  TrendingUp
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ============ TIPOS ============

interface QuickAnalysisResult {
  suggestions: string[]
  warnings: string[]
  redFlags: string[]
  confidence: number
}

interface AIQuickInsightsProps {
  patientId: string
  symptoms?: string
  medications?: string[]
  onSuggestionApply?: (suggestion: string) => void
  className?: string
}

// ============ COMPONENTE PRINCIPAL ============

export function AIQuickInsights({
  patientId,
  symptoms = '',
  medications = [],
  onSuggestionApply,
  className
}: AIQuickInsightsProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<QuickAnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [customSymptoms, setCustomSymptoms] = useState(symptoms)

  // Analisar sintomas
  const analyzeSymptoms = async () => {
    if (!customSymptoms.trim()) {
      setError('Informe os sintomas para análise')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Converter texto em array de sintomas
      const symptomList = customSymptoms
        .split(/[,;\n]/)
        .map(s => s.trim())
        .filter(Boolean)

      // Fazer requisições em paralelo
      const [symptomsRes, interactionsRes] = await Promise.allSettled([
        fetch('/api/ai/symptom-analysis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symptoms: symptomList, patientId })
        }),
        medications.length >= 2
          ? fetch('/api/ai/drug-interactions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ medications })
            })
          : Promise.resolve(null)
      ])

      const suggestions: string[] = []
      const warnings: string[] = []
      const redFlags: string[] = []
      let confidence = 0.5

      // Processar análise de sintomas
      if (symptomsRes.status === 'fulfilled' && symptomsRes.value?.ok) {
        const data = await symptomsRes.value.json()
        
        // Adicionar condições como sugestões
        if (data.possibleConditions?.length > 0) {
          for (const condition of data.possibleConditions.slice(0, 3)) {
            suggestions.push(`${condition.name} (${condition.probability})`)
          }
          confidence = data.possibleConditions.some((c: { probability: string }) => c.probability === 'alta') ? 0.8 : 0.6
        }

        // Adicionar red flags como warnings
        if (data.redFlags?.length > 0) {
          redFlags.push(...data.redFlags)
        }

        // Adicionar exames como sugestões
        if (data.recommendedTests?.length > 0) {
          suggestions.push(`Exames: ${data.recommendedTests.slice(0, 3).join(', ')}`)
        }
      }

      // Processar interações medicamentosas
      if (interactionsRes.status === 'fulfilled' && interactionsRes.value?.ok) {
        const data = await interactionsRes.value.json()
        
        if (data.hasInteractions) {
          for (const interaction of data.interactions) {
            const severityMap: Record<string, string> = {
              major: '⚠️ GRAVE',
              moderate: '⚡ Moderada',
              minor: 'ℹ️ Menor'
            }
            const severityText = severityMap[interaction.severity as string] || 'ℹ️ Info'
            
            warnings.push(`${severityText}: ${interaction.drug1} × ${interaction.drug2}`)
          }
        }
      }

      setResult({
        suggestions,
        warnings,
        redFlags,
        confidence
      })

    } catch (err) {
      console.error('Erro na análise rápida:', err)
      setError('Erro ao processar análise')
    } finally {
      setLoading(false)
    }
  }

  // Aplicar sugestão
  const handleApplySuggestion = (suggestion: string) => {
    onSuggestionApply?.(suggestion)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  'gap-2 border-purple-200 hover:border-purple-400 hover:bg-purple-50',
                  className
                )}
              >
                <Brain className="h-4 w-4 text-purple-500" />
                <Sparkles className="h-3 w-3 text-purple-400" />
                <span className="hidden sm:inline">IA Insights</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Análise inteligente de sintomas e medicamentos</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </SheetTrigger>

      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-500" />
            Assistente de IA
            <Badge variant="outline" className="text-xs">Beta</Badge>
          </SheetTitle>
          <SheetDescription>
            Análise inteligente para apoio à decisão clínica
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Input de sintomas */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Sintomas do paciente</label>
            <Textarea
              value={customSymptoms}
              onChange={(e) => setCustomSymptoms(e.target.value)}
              placeholder="Digite os sintomas separados por vírgula ou linha&#10;Ex: febre, tosse, dor de garganta"
              rows={3}
            />
          </div>

          {/* Medicamentos em uso */}
          {medications.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Medicamentos em uso</label>
              <div className="flex flex-wrap gap-1">
                {medications.map((med, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {med}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Botão de análise */}
          <Button
            onClick={analyzeSymptoms}
            disabled={loading || !customSymptoms.trim()}
            className="w-full gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analisando...
              </>
            ) : (
              <>
                <Stethoscope className="h-4 w-4" />
                Analisar Sintomas
              </>
            )}
          </Button>

          {/* Erro */}
          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Resultados */}
          {result && (
            <div className="space-y-4">
              {/* Indicador de confiança */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Confiança da análise</span>
                <Badge variant={result.confidence >= 0.7 ? 'default' : 'secondary'}>
                  {Math.round(result.confidence * 100)}%
                </Badge>
              </div>

              {/* Red Flags */}
              {result.redFlags.length > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Sinais de Alarme:</strong>
                    <ul className="mt-1 list-disc list-inside text-sm">
                      {result.redFlags.slice(0, 3).map((flag, i) => (
                        <li key={i}>{flag}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Warnings (interações) */}
              {result.warnings.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    Alertas de Medicamentos
                  </h4>
                  <div className="space-y-1">
                    {result.warnings.map((warning, i) => (
                      <div
                        key={i}
                        className="text-sm p-2 bg-amber-50 rounded border border-amber-200"
                      >
                        {warning}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sugestões */}
              {result.suggestions.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-blue-500" />
                    Sugestões Diagnósticas
                  </h4>
                  <div className="space-y-1">
                    {result.suggestions.map((suggestion, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-2 bg-blue-50 rounded border border-blue-200 hover:bg-blue-100 cursor-pointer"
                        onClick={() => handleApplySuggestion(suggestion)}
                      >
                        <span className="text-sm">{suggestion}</span>
                        {onSuggestionApply && (
                          <ChevronRight className="h-4 w-4 text-blue-500" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sem resultados */}
              {result.suggestions.length === 0 && 
               result.warnings.length === 0 && 
               result.redFlags.length === 0 && (
                <div className="text-center py-4 text-muted-foreground">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma condição específica identificada</p>
                  <p className="text-xs">Avaliação clínica detalhada recomendada</p>
                </div>
              )}
            </div>
          )}

          {/* Disclaimer */}
          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground text-center">
              ⚠️ Esta análise é para apoio à decisão clínica e não substitui a 
              avaliação médica profissional.
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ============ COMPONENTE DE BADGE DE RISCO ============

export function AIRiskBadge({ patientId }: { patientId: string }) {
  const [loading, setLoading] = useState(true)
  const [riskLevel, setRiskLevel] = useState<'LOW' | 'MEDIUM' | 'HIGH' | null>(null)

  // Carregar risco ao montar
  useState(() => {
    const loadRisk = async () => {
      try {
        const response = await fetch(`/api/ai/patient-risk?patientId=${patientId}`)
        if (response.ok) {
          const data = await response.json()
          setRiskLevel(data.riskLevel)
        }
      } catch (error) {
        console.error('Erro ao carregar risco:', error)
      } finally {
        setLoading(false)
      }
    }
    loadRisk()
  })

  if (loading) {
    return <Skeleton className="h-5 w-16" />
  }

  if (!riskLevel) {
    return null
  }

  const config = {
    LOW: { label: 'Baixo', variant: 'secondary' as const, icon: CheckCircle2 },
    MEDIUM: { label: 'Moderado', variant: 'outline' as const, icon: TrendingUp },
    HIGH: { label: 'Alto', variant: 'destructive' as const, icon: AlertTriangle }
  }

  const { label, variant, icon: Icon } = config[riskLevel]

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={variant} className="gap-1 text-xs">
            <Icon className="h-3 w-3" />
            Risco {label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>Nível de risco calculado por IA</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// ============ EXPORTAÇÕES ============

export default AIQuickInsights
