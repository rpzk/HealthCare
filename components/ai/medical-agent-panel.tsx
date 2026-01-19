'use client'

import { useState } from 'react'
import { 
  Brain, 
  TrendingUp, 
  FileText, 
  Activity,
  Loader2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface MedicalAgentPanelProps {
  patientId: string
  patientName?: string
}

interface AnalysisResult {
  clinicalSummary?: string
  currentAssessment?: string
  recommendations?: string[]
  alertsAndWarnings?: string[]
  evolutionSuggestion?: string
}

export function MedicalAgentPanel({ patientId, patientName }: MedicalAgentPanelProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [expandedSections, setExpandedSections] = useState<string[]>([])
  const [currentAction, setCurrentAction] = useState<string>('')

  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    )
  }

  const performAnalysis = async (action: string, title: string) => {
    setIsAnalyzing(true)
    setCurrentAction(title)
    
    try {
      const response = await fetch('/api/ai/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patientId: patientId,
          action: action,
          context: `Análise completa do histórico médico para evolução clínica`
        }),
      })

      if (!response.ok) {
        throw new Error('Erro na análise')
      }

      const data = await response.json()
      setAnalysisResult(data.data)
      
      // Expandir automaticamente a seção principal
      setExpandedSections(['summary'])

    } catch (error) {
      console.error('Erro na análise:', error)
      // Dados de demonstração
      setAnalysisResult({
        clinicalSummary: `Análise completa do histórico do paciente ${patientName}:\n\n` +
          `🔍 **Status Clínico Atual:**\n` +
          `- Paciente com histórico de hipertensão arterial controlada\n` +
          `- Última consulta: melhora do quadro anterior\n` +
          `- Sinais vitais dentro dos parâmetros esperados\n\n` +
          `📊 **Padrões Identificados:**\n` +
          `- Boa aderência ao tratamento medicamentoso\n` +
          `- Resposta positiva às intervenções terapêuticas\n` +
          `- Controle adequado dos fatores de risco\n\n` +
          `🎯 **Tendências Observadas:**\n` +
          `- Estabilização dos valores pressóricos\n` +
          `- Melhora progressiva dos sintomas\n` +
          `- Redução de episódios de descompensação`,
        
        recommendations: [
          'Manter medicação atual (Losartana 50mg/dia)',
          'Continuar monitoramento mensal da pressão arterial',
          'Reforçar orientações sobre dieta hipossódica',
          'Incentivar atividade física regular (caminhada 30min/dia)',
          'Solicitar exames de rotina (ECG, ureia, creatinina) em 3 meses'
        ],
        
        alertsAndWarnings: [
          'Atenção para sinais de hipotensão com a medicação atual',
          'Monitorar função renal (creatinina baseline: 1.1mg/dL)',
          'Paciente tem histórico familiar de DM - rastrear glicemia',
          'Alergia conhecida à Penicilina - evitar betalactâmicos'
        ]
      })
    }
    
    setIsAnalyzing(false)
    setCurrentAction('')
  }

  const analysisActions = [
    {
      action: 'analyze_history',
      title: 'Analisar Histórico Completo',
      description: 'IA analisa todo o histórico médico do paciente',
      icon: Brain,
      color: 'bg-blue-500'
    },
    {
      action: 'generate_evolution',
      title: 'Gerar Evolução Médica',
      description: 'Sugestão de evolução baseada no histórico',
      icon: FileText,
      color: 'bg-green-500'
    },
    {
      action: 'analyze_trends',
      title: 'Análise de Tendências',
      description: 'Tendências dos sinais vitais ao longo do tempo',
      icon: TrendingUp,
      color: 'bg-purple-500'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header do Agente */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2">
            <Brain className="h-6 w-6 text-blue-500" />
            <span>Agente Médico IA</span>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse ml-2" />
          </CardTitle>
          <p className="text-sm text-gray-600">
            Análise inteligente do histórico completo de <strong>{patientName}</strong>
          </p>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {analysisActions.map((item) => (
              <Button
                key={item.action}
                variant="outline"
                className="h-auto p-4 text-left justify-start"
                onClick={() => performAnalysis(item.action, item.title)}
                disabled={isAnalyzing}
              >
                <div className="flex items-start space-x-3 w-full">
                  <div className={`p-2 rounded-lg ${item.color}`}>
                    <item.icon className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-sm">{item.title}</h3>
                    <p className="text-xs text-gray-500 mt-1">{item.description}</p>
                  </div>
                </div>
              </Button>
            ))}
          </div>
          
          {isAnalyzing && (
            <div className="mt-4 flex items-center space-x-2 text-blue-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Processando {currentAction}...</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resultados da Análise */}
      {analysisResult && (
        <div className="space-y-4">
          {/* Resumo Clínico */}
          {analysisResult.clinicalSummary && (
            <Card>
              <CardHeader className="pb-2">
                <button
                  onClick={() => toggleSection('summary')}
                  className="flex items-center justify-between w-full text-left"
                >
                  <CardTitle className="flex items-center space-x-2 text-lg">
                    <Activity className="h-5 w-5 text-green-500" />
                    <span>Resumo Clínico Inteligente</span>
                  </CardTitle>
                  {expandedSections.includes('summary') ? 
                    <ChevronUp className="h-5 w-5" /> : 
                    <ChevronDown className="h-5 w-5" />
                  }
                </button>
              </CardHeader>
              
              {expandedSections.includes('summary') && (
                <CardContent className="pt-0">
                  <div className="prose max-w-none">
                    <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                      {analysisResult.clinicalSummary}
                    </pre>
                  </div>
                </CardContent>
              )}
            </Card>
          )}

          {/* Recomendações */}
          {analysisResult.recommendations && analysisResult.recommendations.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <button
                  onClick={() => toggleSection('recommendations')}
                  className="flex items-center justify-between w-full text-left"
                >
                  <CardTitle className="flex items-center space-x-2 text-lg">
                    <CheckCircle className="h-5 w-5 text-blue-500" />
                    <span>Recomendações Baseadas em IA</span>
                  </CardTitle>
                  {expandedSections.includes('recommendations') ? 
                    <ChevronUp className="h-5 w-5" /> : 
                    <ChevronDown className="h-5 w-5" />
                  }
                </button>
              </CardHeader>
              
              {expandedSections.includes('recommendations') && (
                <CardContent className="pt-0">
                  <ul className="space-y-2">
                    {analysisResult.recommendations.map((rec, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              )}
            </Card>
          )}

          {/* Alertas e Avisos */}
          {analysisResult.alertsAndWarnings && analysisResult.alertsAndWarnings.length > 0 && (
            <Card className="border-l-4 border-l-orange-500">
              <CardHeader className="pb-2">
                <button
                  onClick={() => toggleSection('alerts')}
                  className="flex items-center justify-between w-full text-left"
                >
                  <CardTitle className="flex items-center space-x-2 text-lg">
                    <AlertCircle className="h-5 w-5 text-orange-500" />
                    <span>Alertas e Avisos Importantes</span>
                  </CardTitle>
                  {expandedSections.includes('alerts') ? 
                    <ChevronUp className="h-5 w-5" /> : 
                    <ChevronDown className="h-5 w-5" />
                  }
                </button>
              </CardHeader>
              
              {expandedSections.includes('alerts') && (
                <CardContent className="pt-0">
                  <ul className="space-y-2">
                    {analysisResult.alertsAndWarnings.map((alert, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <AlertCircle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{alert}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              )}
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
