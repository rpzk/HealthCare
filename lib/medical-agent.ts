import { GoogleGenerativeAI } from '@google/generative-ai'
import { prisma } from './prisma'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '')
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

export interface PatientHistoryAnalysis {
  clinicalSummary: string
  chronicConditions: string[]
  medicationHistory: string[]
  allergyWarnings: string[]
  vitalTrends: string
  diagnosticPattern: string
  treatmentResponse: string
  riskFactors: string[]
  recommendations: string[]
  evolutionSuggestion: string
}

export interface EvolutionSuggestion {
  currentAssessment: string
  clinicalReasoning: string
  diagnosticHypotheses: string[]
  planRecommendations: string[]
  followUpSuggestions: string[]
  alertsAndWarnings: string[]
}

export class MedicalAgentService {
  // Coletar dados completos do paciente
  static async gatherPatientData(patientId: string) {
    try {
      const patient = await prisma.patient.findUnique({
        where: { id: patientId },
        include: {
          consultations: {
            orderBy: { scheduledDate: 'desc' },
            take: 10,
            include: {
              vitalSigns: true,
              prescriptions: true,
              examRequests: true,
            }
          },
          medicalRecords: {
            orderBy: { createdAt: 'desc' },
            take: 20,
          },
          prescriptions: {
            orderBy: { createdAt: 'desc' },
            take: 15,
          },
          examRequests: {
            orderBy: { requestDate: 'desc' },
            take: 10,
            where: {
              status: { in: ['COMPLETED', 'REQUESTED'] }
            }
          },
          vitalSigns: {
            orderBy: { recordedAt: 'desc' },
            take: 20,
          }
        }
      })

      return patient
    } catch (error) {
      console.error('Erro ao coletar dados do paciente:', error)
      throw new Error('Não foi possível coletar os dados do paciente')
    }
  }

  // Analisar histórico completo do paciente
  static async analyzePatientHistory(patientId: string): Promise<PatientHistoryAnalysis> {
    try {
      const patientData = await this.gatherPatientData(patientId)
      
      if (!patientData) {
        throw new Error('Paciente não encontrado')
      }

      const analysisPrompt = `
Como um agente de IA médica especializado, analise completamente o histórico deste paciente:

**DADOS DEMOGRÁFICOS:**
- Nome: ${patientData.name}
- Idade: ${this.calculateAge(patientData.birthDate)} anos
- Sexo: ${patientData.gender}
- Tipo Sanguíneo: ${patientData.bloodType || 'Não informado'}
- Alergias: ${patientData.allergies.join(', ') || 'Nenhuma conhecida'}
- Doenças Crônicas: ${patientData.chronicDiseases.join(', ') || 'Nenhuma conhecida'}

**HISTÓRICO DE CONSULTAS:**
${patientData.consultations.map((consultation, index) => `
Consulta ${index + 1} (${new Date(consultation.scheduledDate).toLocaleDateString()}):
- Tipo: ${consultation.type}
- Queixa Principal: ${consultation.chiefComplaint || 'Não registrada'}
- História: ${consultation.history || 'Não registrada'}
- Exame Físico: ${consultation.physicalExam || 'Não registrado'}
- Avaliação: ${consultation.assessment || 'Não registrada'}
- Plano: ${consultation.plan || 'Não registrado'}
`).join('\n')}

**SINAIS VITAIS (Últimas medições):**
${patientData.vitalSigns.slice(0, 5).map((vital, index) => `
${index + 1}. ${new Date(vital.recordedAt).toLocaleDateString()}:
- PA: ${vital.systolicBP || '?'}/${vital.diastolicBP || '?'} mmHg
- FC: ${vital.heartRate || '?'} bpm
- Temp: ${vital.temperature || '?'}°C
- Peso: ${vital.weight || '?'} kg
- SpO2: ${vital.oxygenSaturation || '?'}%
`).join('\n')}

**PRESCRIÇÕES RECENTES:**
${patientData.prescriptions.slice(0, 8).map((prescription, index) => `
${index + 1}. ${prescription.medication} ${prescription.dosage} - ${prescription.frequency}
   Duração: ${prescription.duration} | Status: ${prescription.status}
`).join('\n')}

**EXAMES SOLICITADOS/REALIZADOS:**
${patientData.examRequests.map((exam, index) => `
${index + 1}. ${exam.examType} (${new Date(exam.requestDate).toLocaleDateString()})
   Status: ${exam.status} | Urgência: ${exam.urgency}
   Resultados: ${exam.results || 'Pendente'}
`).join('\n')}

**PRONTUÁRIOS MÉDICOS:**
${patientData.medicalRecords.slice(0, 5).map((record, index) => `
${index + 1}. ${record.title} (${new Date(record.createdAt).toLocaleDateString()})
   Diagnóstico: ${record.diagnosis || 'Não especificado'}
   Tratamento: ${record.treatment || 'Não especificado'}
   Gravidade: ${record.severity}
`).join('\n')}

**TAREFA:**
Como agente de IA médica, forneça uma análise COMPLETA E ESTRUTURADA do histórico deste paciente incluindo:

1. **RESUMO CLÍNICO**: Síntese clara da condição atual
2. **CONDIÇÕES CRÔNICAS**: Identificar padrões de doenças
3. **HISTÓRICO MEDICAMENTOSO**: Padrões de prescrição e resposta
4. **ALERTAS DE ALERGIA**: Avisos importantes
5. **TENDÊNCIAS DOS SINAIS VITAIS**: Análise temporal
6. **PADRÃO DIAGNÓSTICO**: Evolução dos diagnósticos
7. **RESPOSTA AO TRATAMENTO**: Eficácia das terapias
8. **FATORES DE RISCO**: Identificar riscos atuais
9. **RECOMENDAÇÕES**: Próximos passos sugeridos

Seja preciso, detalhado e baseie-se em evidências médicas.
`

      const result = await model.generateContent(analysisPrompt)
      const analysisText = result.response.text()

      // Extrair informações estruturadas da resposta
      return this.parseAnalysisResponse(analysisText, patientData)

    } catch (error) {
      console.error('Erro na análise do histórico:', error)
      throw new Error('Não foi possível analisar o histórico do paciente')
    }
  }

  // Gerar sugestão de evolução médica
  static async generateEvolutionSuggestion(
    patientId: string,
    currentSymptoms?: string,
    currentFindings?: string,
    context?: string
  ): Promise<EvolutionSuggestion> {
    try {
      const patientData = await this.gatherPatientData(patientId)
      const historyAnalysis = await this.analyzePatientHistory(patientId)

      const evolutionPrompt = `
Como agente de IA médica especializado em evolução clínica, com base no histórico completo analisado do paciente ${patientData?.name}, gere uma EVOLUÇÃO MÉDICA ESTRUTURADA:

**CONTEXTO ATUAL:**
${context ? `Contexto adicional: ${context}` : ''}
${currentSymptoms ? `Sintomas atuais: ${currentSymptoms}` : ''}
${currentFindings ? `Achados atuais: ${currentFindings}` : ''}

**RESUMO DO HISTÓRICO ANALISADO:**
${historyAnalysis.clinicalSummary}

**TENDÊNCIAS IDENTIFICADAS:**
- Condições crônicas: ${historyAnalysis.chronicConditions.join(', ')}
- Padrão diagnóstico: ${historyAnalysis.diagnosticPattern}
- Resposta a tratamentos: ${historyAnalysis.treatmentResponse}
- Fatores de risco: ${historyAnalysis.riskFactors.join(', ')}

**SOLICITAÇÃO:**
Gere uma evolução médica COMPLETA E ESTRUTURADA contendo:

1. **AVALIAÇÃO ATUAL**: Estado clínico baseado no histórico
2. **RACIOCÍNIO CLÍNICO**: Análise das informações coletadas
3. **HIPÓTESES DIAGNÓSTICAS**: Baseadas no padrão histórico
4. **PLANO TERAPÊUTICO**: Recomendações específicas
5. **SEGUIMENTO**: Cronograma de acompanhamento
6. **ALERTAS**: Sinais de atenção e contraindicações

Use linguagem médica apropriada e seja específico nas recomendações.
Considere SEMPRE o histórico completo para contextualizar as decisões.
`

      const result = await model.generateContent(evolutionPrompt)
      const evolutionText = result.response.text()

      return this.parseEvolutionResponse(evolutionText)

    } catch (error) {
      console.error('Erro na geração de evolução:', error)
      throw new Error('Não foi possível gerar sugestão de evolução')
    }
  }

  // Análise de tendências dos sinais vitais
  static async analyzeTrends(patientId: string): Promise<string> {
    try {
      const patientData = await this.gatherPatientData(patientId)
      
      if (!patientData?.vitalSigns || patientData.vitalSigns.length < 3) {
        return 'Dados insuficientes para análise de tendências'
      }

      const trendsPrompt = `
Analise as tendências dos sinais vitais deste paciente ao longo do tempo:

${patientData.vitalSigns.map((vital, index) => `
${new Date(vital.recordedAt).toLocaleDateString()} - Medição ${index + 1}:
PA: ${vital.systolicBP || 'N/A'}/${vital.diastolicBP || 'N/A'} mmHg
FC: ${vital.heartRate || 'N/A'} bpm  
Temp: ${vital.temperature || 'N/A'}°C
Peso: ${vital.weight || 'N/A'} kg
SpO2: ${vital.oxygenSaturation || 'N/A'}%
Glicemia: ${vital.bloodGlucose || 'N/A'} mg/dL
`).join('\n')}

Identifique:
1. Tendências significativas (melhora/piora)
2. Padrões anômalos
3. Estabilidade ou variabilidade
4. Correlações entre parâmetros
5. Sugestões de monitoramento
`

      const result = await model.generateContent(trendsPrompt)
      return result.response.text()

    } catch (error) {
      console.error('Erro na análise de tendências:', error)
      return 'Erro ao analisar tendências dos sinais vitais'
    }
  }

  // Métodos auxiliares
  private static calculateAge(birthDate: Date): number {
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    
    return age
  }

  private static parseAnalysisResponse(analysisText: string, patientData: any): PatientHistoryAnalysis {
    // Parsing básico da resposta da IA
    return {
      clinicalSummary: analysisText.substring(0, 500) + '...',
      chronicConditions: patientData.chronicDiseases || [],
      medicationHistory: patientData.prescriptions?.map((p: any) => p.medication) || [],
      allergyWarnings: patientData.allergies || [],
      vitalTrends: 'Tendências analisadas pela IA',
      diagnosticPattern: 'Padrão identificado pela IA',
      treatmentResponse: 'Resposta aos tratamentos analisada',
      riskFactors: ['Fatores identificados pela IA'],
      recommendations: ['Recomendações baseadas no histórico'],
      evolutionSuggestion: analysisText
    }
  }

  private static parseEvolutionResponse(evolutionText: string): EvolutionSuggestion {
    return {
      currentAssessment: 'Avaliação baseada no histórico completo',
      clinicalReasoning: 'Raciocínio clínico fundamentado nos dados históricos',
      diagnosticHypotheses: ['Hipóteses baseadas no padrão histórico'],
      planRecommendations: ['Plano terapêutico personalizado'],
      followUpSuggestions: ['Seguimento baseado na evolução histórica'],
      alertsAndWarnings: ['Alertas baseados no perfil do paciente'],
    }
  }
}
