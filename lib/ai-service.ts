import ollamaClient from './ollama-client'

const model = ollamaClient.getGenerativeModel({ model: process.env.OLLAMA_MODEL || 'llama3' })

export interface AIAnalysisRequest {
  type: 'diagnosis' | 'treatment' | 'drug_interaction' | 'symptom_analysis'
  data: {
    symptoms?: string[]
    patientHistory?: string
    medications?: string[]
    vitalSigns?: any
    labResults?: any
  }
  context?: string
}

export interface AIAnalysisResponse {
  analysis: string
  suggestions: string[]
  confidence: number
  warnings: string[]
  references: string[]
}

export class MedicalAIService {
  static async analyzeSymptoms(
    symptoms: string[],
    patientHistory?: string,
    context?: string
  ): Promise<AIAnalysisResponse> {
    try {
      const prompt = `
Como um assistente médico especializado, analise os seguintes sintomas e forneça sugestões diagnósticas:

Sintomas: ${symptoms.join(', ')}
${patientHistory ? `Histórico do paciente: ${patientHistory}` : ''}
${context ? `Contexto adicional: ${context}` : ''}

Por favor, forneça:
1. Possíveis diagnósticos ordenados por probabilidade
2. Sugestões de exames complementares
3. Sinais de alerta importantes
4. Recomendações gerais

IMPORTANTE: Esta análise é apenas para apoio médico e não substitui a avaliação clínica profissional.
`

      const systemPrompt = 'Você é um assistente médico especializado em análise de sintomas e suporte diagnóstico. Sempre forneça informações baseadas em evidências médicas e inclua disclaimers apropriados.'
      
      const result = await model.generateContent(`${systemPrompt}\n\n${prompt}`)

      const analysis = result.response.text() || 'Não foi possível gerar análise'

      return {
        analysis,
        suggestions: [],
        confidence: 0,
        warnings: [],
        references: []
      }
    } catch (error) {
      console.error('Erro na análise de IA:', error)
      return {
        analysis: 'Erro ao processar análise. Verifique a configuração da API do Google AI.',
        suggestions: [],
        confidence: 0,
        warnings: ['Serviço de IA indisponível'],
        references: []
      }
    }
  }

  static async checkDrugInteractions(
    medications: string[]
  ): Promise<AIAnalysisResponse> {
    try {
      const prompt = `
Analise as seguintes medicações para possíveis interações medicamentosas:

Medicações: ${medications.join(', ')}

Por favor, identifique:
1. Interações graves ou contraindicações
2. Interações moderadas que requerem monitoramento
3. Recomendações de ajuste de dose
4. Monitoramento laboratorial necessário

Forneça uma análise detalhada baseada em farmacologia clínica.
`

      const systemPrompt = 'Você é um farmacologista clínico especializado em interações medicamentosas. Forneça análises precisas e baseadas em evidências.'
      
      const result = await model.generateContent(`${systemPrompt}\n\n${prompt}`)

      const analysis = result.response.text() || 'Não foi possível analisar interações'

      return {
        analysis,
        suggestions: [],
        confidence: 0,
        warnings: [],
        references: []
      }
    } catch (error) {
      console.error('Erro na análise de interações:', error)
      return {
        analysis: 'Erro ao processar análise de interações. Verifique a configuração da API do Google AI.',
        suggestions: [],
        confidence: 0,
        warnings: ['Serviço de IA indisponível'],
        references: []
      }
    }
  }

  static async generateMedicalSummary(
    patientData: any,
    consultations: any[]
  ): Promise<string> {
    try {
      const prompt = `
Gere um resumo médico conciso para o seguinte paciente:

Dados do paciente: ${JSON.stringify(patientData, null, 2)}
Consultas recentes: ${JSON.stringify(consultations, null, 2)}

Crie um resumo estruturado incluindo:
1. Informações demográficas básicas
2. Principais problemas médicos
3. Medicações atuais
4. Última evolução clínica
5. Plano de acompanhamento
`

      const systemPrompt = 'Você é um médico especialista criando resumos médicos claros e estruturados.'
      
      const result = await model.generateContent(`${systemPrompt}\n\n${prompt}`)

      return result.response.text() || 'Não foi possível gerar resumo'
    } catch (error) {
      console.error('Erro na geração de resumo:', error)
      return 'Erro ao gerar resumo médico. Verifique a configuração da API do Google AI.'
    }
  }
}

export default MedicalAIService
