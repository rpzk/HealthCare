'use client'

import { useEffect, useState } from 'react'
import { Loader2, Brain, AlertTriangle, CheckCircle2, TrendingUp, Pill, FileText, Activity } from 'lucide-react'

interface AIInsight {
  type: 'diagnosis' | 'treatment' | 'interaction' | 'risk' | 'summary'
  severity?: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  recommendations?: string[]
}

interface AIRecordInsightsProps {
  recordId: string
  patientId: string
  recordData: {
    diagnosis?: string
    treatment?: string
    notes?: string
    recordType: string
    priority: string
  }
}

export function AIRecordInsights({ recordId, patientId, recordData }: AIRecordInsightsProps) {
  const [insights, setInsights] = useState<AIInsight[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    async function generateInsights() {
      setIsLoading(true)
      setError(null)

      try {
        const results: AIInsight[] = []

        // 1. Análise de diagnóstico (se houver diagnóstico)
        if (recordData.diagnosis && recordData.diagnosis.trim()) {
          try {
            const diagnosisResponse = await fetch('/api/ai/analyze', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                text: recordData.diagnosis,
                type: 'diagnosis',
                patientId
              })
            })

            if (diagnosisResponse.ok) {
              const diagnosisData = await diagnosisResponse.json()
              
              if (diagnosisData.possibleDiagnoses && diagnosisData.possibleDiagnoses.length > 0) {
                const topDiagnosis = diagnosisData.possibleDiagnoses[0]
                results.push({
                  type: 'diagnosis',
                  severity: topDiagnosis.urgencyLevel || 'medium',
                  title: 'Análise do Diagnóstico',
                  description: `Diagnóstico principal identificado: ${topDiagnosis.name} (${Math.round(topDiagnosis.probability * 100)}% de probabilidade). ${topDiagnosis.description}`,
                  recommendations: diagnosisData.recommendedTests || []
                })
              }

              if (diagnosisData.redFlags && diagnosisData.redFlags.length > 0) {
                results.push({
                  type: 'risk',
                  severity: 'high',
                  title: 'Sinais de Alerta Identificados',
                  description: `Atenção para: ${diagnosisData.redFlags.join(', ')}`,
                  recommendations: diagnosisData.treatmentSuggestions || []
                })
              }
            }
          } catch (err) {
            console.error('Erro na análise de diagnóstico:', err)
          }
        }

        // 2. Verificação de interações medicamentosas (se houver tratamento)
        if (recordData.treatment && recordData.treatment.includes('medicação') || recordData.treatment?.includes('medicamento')) {
          try {
            // Extrair medicamentos do texto (simplificado)
            const medications = recordData.treatment
              .split(/[,;]/)
              .map(m => m.trim())
              .filter(m => m.length > 3)
              .slice(0, 5) // Limitar a 5 medicamentos

            if (medications.length > 1) {
              const interactionResponse = await fetch('/api/ai/drug-interactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ medications })
              })

              if (interactionResponse.ok) {
                const interactionData = await interactionResponse.json()
                
                if (interactionData.interactions && interactionData.interactions.length > 0) {
                  const severeInteractions = interactionData.interactions.filter(
                    (i: any) => i.severity === 'severe' || i.severity === 'moderate'
                  )
                  
                  if (severeInteractions.length > 0) {
                    results.push({
                      type: 'interaction',
                      severity: severeInteractions.some((i: any) => i.severity === 'severe') ? 'critical' : 'high',
                      title: 'Interações Medicamentosas Detectadas',
                      description: `Foram encontradas ${severeInteractions.length} interação(ões) importante(s) entre os medicamentos prescritos.`,
                      recommendations: severeInteractions.map((i: any) => i.recommendation)
                    })
                  }
                }

                if (interactionData.contraindications && interactionData.contraindications.length > 0) {
                  results.push({
                    type: 'risk',
                    severity: 'high',
                    title: 'Contraindicações Identificadas',
                    description: interactionData.contraindications.join('; '),
                    recommendations: ['Revisar prescrição', 'Consultar especialista']
                  })
                }
              }
            }
          } catch (err) {
            console.error('Erro na verificação de interações:', err)
          }
        }

        // 3. Geração de resumo inteligente
        try {
          const summaryResponse = await fetch('/api/ai/recommendations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              patientId,
              context: {
                recordType: recordData.recordType,
                priority: recordData.priority,
                diagnosis: recordData.diagnosis,
                treatment: recordData.treatment,
                notes: recordData.notes
              }
            })
          })

          if (summaryResponse.ok) {
            const summaryData = await summaryResponse.json()
            
            if (summaryData.summary) {
              results.push({
                type: 'summary',
                severity: 'low',
                title: 'Resumo Inteligente do Prontuário',
                description: summaryData.summary,
                recommendations: summaryData.keyFindings || []
              })
            }

            if (summaryData.recommendations && summaryData.recommendations.length > 0) {
              results.push({
                type: 'treatment',
                severity: 'medium',
                title: 'Recomendações de Acompanhamento',
                description: 'Sugestões baseadas no contexto clínico do paciente',
                recommendations: summaryData.recommendations
              })
            }
          }
        } catch (err) {
          console.error('Erro na geração de resumo:', err)
        }

        setInsights(results)
      } catch (err) {
        setError('Não foi possível gerar insights de IA. O serviço pode estar indisponível.')
        console.error('Erro geral ao gerar insights:', err)
      } finally {
        setIsLoading(false)
      }
    }

    generateInsights()
  }, [recordId, patientId, recordData])

  const getInsightIcon = (type: AIInsight['type']) => {
    switch (type) {
      case 'diagnosis': return <Activity className="h-5 w-5" />
      case 'treatment': return <Pill className="h-5 w-5" />
      case 'interaction': return <AlertTriangle className="h-5 w-5" />
      case 'risk': return <AlertTriangle className="h-5 w-5" />
      case 'summary': return <FileText className="h-5 w-5" />
      default: return <Brain className="h-5 w-5" />
    }
  }

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-50 border-red-200 text-red-900'
      case 'high': return 'bg-orange-50 border-orange-200 text-orange-900'
      case 'medium': return 'bg-yellow-50 border-yellow-200 text-yellow-900'
      case 'low': return 'bg-blue-50 border-blue-200 text-blue-900'
      default: return 'bg-gray-50 border-gray-200 text-gray-900'
    }
  }

  const getSeverityBadge = (severity?: string) => {
    switch (severity) {
      case 'critical': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Crítico</span>
      case 'high': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">Alto</span>
      case 'medium': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Médio</span>
      case 'low': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">Baixo</span>
      default: return null
    }
  }

  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <Brain className="h-6 w-6 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900">Análise com IA</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
          <span className="ml-3 text-gray-600">Analisando prontuário com IA...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-yellow-900">Análise de IA indisponível</p>
            <p className="text-sm text-yellow-700 mt-1">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (insights.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-2">
          <Brain className="h-6 w-6 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-700">Análise com IA</h3>
        </div>
        <p className="text-sm text-gray-600">
          Nenhum insight disponível para este prontuário. A IA precisa de mais informações para gerar análises.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Brain className="h-6 w-6 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900">Análise com IA</h3>
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
            {insights.length} insight{insights.length !== 1 ? 's' : ''}
          </span>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-sm font-medium text-purple-600 hover:text-purple-800 transition-colors"
        >
          {expanded ? 'Ocultar detalhes' : 'Ver todos'}
        </button>
      </div>

      <div className="space-y-3">
        {insights.slice(0, expanded ? insights.length : 2).map((insight, index) => (
          <div
            key={index}
            className={`border rounded-lg p-4 ${getSeverityColor(insight.severity)}`}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                {getInsightIcon(insight.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="text-sm font-semibold">{insight.title}</h4>
                  {getSeverityBadge(insight.severity)}
                </div>
                <p className="text-sm mb-3">{insight.description}</p>
                
                {insight.recommendations && insight.recommendations.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-current border-opacity-20">
                    <p className="text-xs font-semibold mb-2 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      Recomendações:
                    </p>
                    <ul className="space-y-1">
                      {insight.recommendations.map((rec, recIndex) => (
                        <li key={recIndex} className="text-xs flex items-start gap-2">
                          <CheckCircle2 className="h-3 w-3 mt-0.5 flex-shrink-0" />
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {!expanded && insights.length > 2 && (
        <div className="mt-3 text-center">
          <button
            onClick={() => setExpanded(true)}
            className="text-sm text-purple-600 hover:text-purple-800 font-medium"
          >
            Ver mais {insights.length - 2} insight{insights.length - 2 !== 1 ? 's' : ''}
          </button>
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-purple-200">
        <p className="text-xs text-gray-600 italic">
          💡 Insights gerados por IA. Sempre valide com avaliação clínica profissional.
        </p>
      </div>
    </div>
  )
}
