import ollamaClient from './ollama-client'
import { incCounter, observeHistogram, setGauge } from './metrics'
import { startSpan } from './tracing'
import { checkAndConsumeAIQuota } from './ai-quota'

if (!process.env.OLLAMA_URL) {
  console.warn('URL do Ollama ausente. Verifique se o serviço Ollama está em execução.')
}

// Tipos específicos para análise médica
export interface SymptomAnalysisRequest {
  symptoms: string[]
  patientAge: number
  patientGender: 'M' | 'F'
  medicalHistory?: string[]
  currentMedications?: string[]
  vitalSigns?: {
    temperature?: number
    bloodPressure?: string
    heartRate?: number
    respiratoryRate?: number
  }
}

export interface DiagnosisResult {
  possibleDiagnoses: {
    name: string
    probability: number
    description: string
    urgencyLevel: 'low' | 'medium' | 'high' | 'critical'
  }[]
  recommendedTests: string[]
  redFlags: string[]
  treatmentSuggestions?: string[]
}

export interface DrugInteractionCheck {
  medications: string[]
  interactions: {
    drugs: string[]
    severity: 'mild' | 'moderate' | 'severe'
    description: string
    recommendation: string
  }[]
  contraindications: string[]
}

export interface MedicalSummary {
  patientId: string
  summary: string
  keyFindings: string[]
  recommendations: string[]
  followUpNeeded: boolean
}

export class AdvancedMedicalAI {
  private model = ollamaClient.getGenerativeModel({ model: process.env.OLLAMA_MODEL || "llama3" })
  private failures = 0
  private OPEN = false
  private nextRetry = 0
  private FAILURE_THRESHOLD = 3
  private COOLDOWN_MS = 60_000

  private ensureCircuit() {
    const now = Date.now()
    if (this.OPEN && now >= this.nextRetry) {
      this.OPEN = false
      this.failures = 0
    }
    if (this.OPEN) {
      throw new Error('IA temporariamente indisponível (circuit breaker)')
    }
  }

  private recordSuccess() { this.failures = 0 }
  private recordFailure() {
    this.failures++
    if (this.failures >= this.FAILURE_THRESHOLD) {
      this.OPEN = true
      this.nextRetry = Date.now() + this.COOLDOWN_MS
    }
  setGauge('ai_circuit_open', this.OPEN ? 1 : 0, { model: 'gemini-1.5-flash' })
  }

  // Análise avançada de sintomas com IA
  async analyzeSymptoms(request: SymptomAnalysisRequest & { userId?: string }): Promise<DiagnosisResult> {
    if (!process.env.GOOGLE_AI_API_KEY) {
      throw new Error('Serviço de IA não configurado')
    }
    if (request.userId) await checkAndConsumeAIQuota(request.userId, 'symptom_analysis')
    // Anonimização básica: não enviar identificadores diretos
    const safeHistory = request.medicalHistory?.slice(0, 20)
    const safeMeds = request.currentMedications?.slice(0, 20)
    const safeVitals = request.vitalSigns
    const prompt = `
Você é um assistente médico especializado em análise de sintomas. Analise os seguintes dados:

DADOS DO PACIENTE:
- Idade: ${request.patientAge} anos
- Gênero: ${request.patientGender === 'M' ? 'Masculino' : 'Feminino'}
- Sintomas: ${request.symptoms.join(', ')}
${safeHistory ? `- Histórico médico: ${safeHistory.join(', ')}` : ''}
${safeMeds ? `- Medicações atuais: ${safeMeds.join(', ')}` : ''}
${safeVitals ? `- Sinais vitais: ${JSON.stringify(safeVitals)}` : ''}

INSTRUÇÕES:
1. Liste 3-5 possíveis diagnósticos ordenados por probabilidade (0-100%)
2. Inclua o nível de urgência para cada diagnóstico
3. Sugira exames complementares específicos
4. Identifique sinais de alerta (red flags) se houver
5. Sugira tratamentos iniciais quando apropriado

IMPORTANTE: Este é um sistema de apoio médico. Sempre recomende avaliação médica presencial.

Responda em formato JSON estruturado:
{
  "possibleDiagnoses": [
    {
      "name": "Nome do diagnóstico",
      "probability": 85,
      "description": "Descrição detalhada",
      "urgencyLevel": "medium"
    }
  ],
  "recommendedTests": ["lista de exames"],
  "redFlags": ["sinais de alerta"],
  "treatmentSuggestions": ["sugestões de tratamento"]
}
`

  const started = Date.now(); this.ensureCircuit()
    try {
      const result = await startSpan('ai.symptom_analysis.request', () => this.model.generateContent(prompt))
      const response = result.response.text()
      
      // Extrair JSON da resposta
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
      
      throw new Error('Formato de resposta inválido')
    } catch (error) {
      incCounter('ai_request_total', { type: 'symptom_analysis', status: 'error' })
      observeHistogram('ai_request_latency_ms', Date.now() - started, { type: 'symptom_analysis' })
      console.error('Erro na análise de sintomas:', error)
      this.recordFailure()
      throw new Error('Erro ao analisar sintomas')
    }
    finally {
      const duration = Date.now() - started
      observeHistogram('ai_request_latency_ms', duration, { type: 'symptom_analysis' })
      incCounter('ai_request_total', { type: 'symptom_analysis', status: 'success' })
      this.recordSuccess()
    }
  }

  // Verificação de interações medicamentosas
  async checkDrugInteractions(medications: string[], userId?: string): Promise<DrugInteractionCheck> {
    if (!process.env.GOOGLE_AI_API_KEY) {
      throw new Error('Serviço de IA não configurado')
    }
    if (userId) await checkAndConsumeAIQuota(userId, 'drug_interaction')
    const meds = medications.slice(0, 50)
    const prompt = `
Você é um especialista em farmacologia clínica. Analise as seguintes medicações para interações:

MEDICAÇÕES: ${meds.join(', ')}

INSTRUÇÕES:
1. Identifique todas as interações medicamentosas possíveis
2. Classifique a severidade (mild, moderate, severe)
3. Explique o mecanismo da interação
4. Forneça recomendações específicas
5. Liste contraindicações absolutas

Responda em formato JSON:
{
  "medications": ${JSON.stringify(medications)},
  "interactions": [
    {
      "drugs": ["medicamento1", "medicamento2"],
      "severity": "moderate",
      "description": "Descrição da interação",
      "recommendation": "Recomendação específica"
    }
  ],
  "contraindications": ["lista de contraindicações"]
}
`

  const started = Date.now(); this.ensureCircuit()
    try {
      const result = await startSpan('ai.drug_interaction.request', () => this.model.generateContent(prompt))
      const response = result.response.text()
      
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
      
      throw new Error('Formato de resposta inválido')
    } catch (error) {
      incCounter('ai_request_total', { type: 'drug_interaction', status: 'error' })
      observeHistogram('ai_request_latency_ms', Date.now() - started, { type: 'drug_interaction' })
      console.error('Erro na verificação de interações:', error)
      this.recordFailure()
      throw new Error('Erro ao verificar interações medicamentosas')
    }
    finally {
      const duration = Date.now() - started
      observeHistogram('ai_request_latency_ms', duration, { type: 'drug_interaction' })
      incCounter('ai_request_total', { type: 'drug_interaction', status: 'success' })
      this.recordSuccess()
    }
  }

  // Geração de resumo médico inteligente
  async generateMedicalSummary(patientData: any, userId?: string): Promise<MedicalSummary> {
    if (!process.env.GOOGLE_AI_API_KEY) {
      throw new Error('Serviço de IA não configurado')
    }
    if (userId) await checkAndConsumeAIQuota(userId, 'medical_summary')
    const redacted = { ...patientData }
    if (redacted.cpf) redacted.cpf = '[REDACTED]'
    if (redacted.email) redacted.email = '[REDACTED]'
    const prompt = `
Você é um médico experiente. Crie um resumo médico inteligente baseado nos dados:

DADOS DO PACIENTE (anonimizados):
${JSON.stringify(redacted, null, 2)}

INSTRUÇÕES:
1. Crie um resumo conciso do estado atual do paciente
2. Identifique achados clínicos relevantes
3. Sugira recomendações específicas
4. Determine se precisa de seguimento

Responda em formato JSON:
{
  "patientId": "${patientData.id}",
  "summary": "Resumo médico detalhado",
  "keyFindings": ["achado1", "achado2"],
  "recommendations": ["recomendação1", "recomendação2"],
  "followUpNeeded": true/false
}
`

  const started = Date.now(); this.ensureCircuit()
    try {
      const result = await startSpan('ai.medical_summary.request', () => this.model.generateContent(prompt))
      const response = result.response.text()
      
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
      
      throw new Error('Formato de resposta inválido')
    } catch (error) {
      incCounter('ai_request_total', { type: 'medical_summary', status: 'error' })
      observeHistogram('ai_request_latency_ms', Date.now() - started, { type: 'medical_summary' })
      console.error('Erro na geração de resumo:', error)
      this.recordFailure()
      throw new Error('Erro ao gerar resumo médico')
    }
    finally {
      const duration = Date.now() - started
      observeHistogram('ai_request_latency_ms', duration, { type: 'medical_summary' })
      incCounter('ai_request_total', { type: 'medical_summary', status: 'success' })
      this.recordSuccess()
    }
  }

  // Análise de sinais vitais com IA
  async analyzeVitalSigns(vitalSigns: any, patientAge: number, userId?: string): Promise<any> {
    if (!process.env.GOOGLE_AI_API_KEY) {
      throw new Error('Serviço de IA não configurado')
    }
    if (userId) await checkAndConsumeAIQuota(userId, 'vital_signs')
    const prompt = `
Analise os seguintes sinais vitais para um paciente de ${patientAge} anos:

SINAIS VITAIS:
${JSON.stringify(vitalSigns, null, 2)}

INSTRUÇÕES:
1. Avalie se os valores estão dentro da normalidade
2. Identifique padrões preocupantes
3. Sugira investigações se necessário
4. Calcule scores de risco quando aplicável

Responda em formato JSON estruturado com sua análise.
`

  const started = Date.now(); this.ensureCircuit()
    try {
      const result = await startSpan('ai.vital_signs.request', () => this.model.generateContent(prompt))
      const response = result.response.text()
      
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
      
      throw new Error('Formato de resposta inválido')
    } catch (error) {
      incCounter('ai_request_total', { type: 'vital_signs', status: 'error' })
      observeHistogram('ai_request_latency_ms', Date.now() - started, { type: 'vital_signs' })
      console.error('Erro na análise de sinais vitais:', error)
      this.recordFailure()
      throw new Error('Erro ao analisar sinais vitais')
    }
    finally {
      const duration = Date.now() - started
      observeHistogram('ai_request_latency_ms', duration, { type: 'vital_signs' })
      incCounter('ai_request_total', { type: 'vital_signs', status: 'success' })
      this.recordSuccess()
    }
  }

  // Sugestão de plano de tratamento
  async suggestTreatmentPlan(diagnosis: string, patientData: any, userId?: string): Promise<any> {
    if (!process.env.GOOGLE_AI_API_KEY) {
      throw new Error('Serviço de IA não configurado')
    }
    if (userId) await checkAndConsumeAIQuota(userId, 'treatment_plan')
    const redacted = { ...patientData }
    if (redacted.cpf) redacted.cpf = '[REDACTED]'
    if (redacted.email) redacted.email = '[REDACTED]'
    const prompt = `
Você é um médico especialista. Sugira um plano de tratamento para:

DIAGNÓSTICO: ${diagnosis}
DADOS DO PACIENTE (anonimizados):
${JSON.stringify(redacted, null, 2)}

INSTRUÇÕES:
1. Sugira tratamento farmacológico apropriado
2. Recomende tratamentos não-farmacológicos
3. Defina cronograma de seguimento
4. Inclua orientações para o paciente
5. Identifique sinais de alarme

Responda em formato JSON estruturado com o plano completo.
`

  const started = Date.now(); this.ensureCircuit()
    try {
      const result = await startSpan('ai.treatment_plan.request', () => this.model.generateContent(prompt))
      const response = result.response.text()
      
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
      
      throw new Error('Formato de resposta inválido')
    } catch (error) {
      incCounter('ai_request_total', { type: 'treatment_plan', status: 'error' })
      observeHistogram('ai_request_latency_ms', Date.now() - started, { type: 'treatment_plan' })
      console.error('Erro na sugestão de tratamento:', error)
      this.recordFailure()
      throw new Error('Erro ao sugerir plano de tratamento')
    }
    finally {
      const duration = Date.now() - started
      observeHistogram('ai_request_latency_ms', duration, { type: 'treatment_plan' })
      incCounter('ai_request_total', { type: 'treatment_plan', status: 'success' })
      this.recordSuccess()
    }
  }
}

export const medicalAI = new AdvancedMedicalAI()
