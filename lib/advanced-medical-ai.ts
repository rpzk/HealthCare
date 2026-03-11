import ollamaClient from './ollama-client'
import { incCounter, observeHistogram, setGauge } from './metrics'
import { startSpan } from './tracing'
import { checkAndConsumeAIQuota } from './ai-quota'
import { logger } from '@/lib/logger'

if (!process.env.OLLAMA_URL) {
  // Silenced in production - Ollama is optional
}

// Tipos para dados de paciente
export interface PatientDataForAI {
  id?: string
  name?: string
  age?: number
  gender?: string
  cpf?: string
  email?: string
  medicalHistory?: string[]
  currentMedications?: string[]
  allergies?: string[]
  consultations?: Array<{ date: string; diagnosis?: string; notes?: string }>
  prescriptions?: Array<{ medication: string; dosage?: string }>
  [key: string]: unknown
}

// Tipos para sinais vitais
export interface VitalSignsForAI {
  temperature?: number
  bloodPressure?: string
  systolicBP?: number
  diastolicBP?: number
  heartRate?: number
  respiratoryRate?: number
  oxygenSaturation?: number
  weight?: number
  height?: number
  [key: string]: unknown
}

// Tipos para resultado de análise
export interface VitalSignsAnalysisResult {
  status: 'normal' | 'attention' | 'critical'
  findings: string[]
  recommendations: string[]
  riskScore?: number
  [key: string]: unknown
}

export interface TreatmentPlanResult {
  pharmacological: Array<{ medication: string; dosage: string; frequency: string }>
  nonPharmacological: string[]
  followUp: { interval: string; tests?: string[] }
  patientGuidelines: string[]
  warningSign: string[]
  [key: string]: unknown
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
  private model = ollamaClient.getGenerativeModel({ model: process.env.OLLAMA_MODEL || "qwen2.5:3b" })
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
  setGauge('ai_circuit_open', this.OPEN ? 1 : 0, { model: process.env.OLLAMA_MODEL || 'qwen2.5:3b' })
  }

  // Análise avançada de sintomas com IA
  async analyzeSymptoms(request: SymptomAnalysisRequest & { userId?: string }): Promise<DiagnosisResult> {
    if (!process.env.GOOGLE_AI_API_KEY && !process.env.OLLAMA_URL) {
      throw new Error('Serviço de IA não configurado. Defina GOOGLE_AI_API_KEY ou OLLAMA_URL.')
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
      logger.error('Erro na análise de sintomas:', error)
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
    if (!process.env.GOOGLE_AI_API_KEY && !process.env.OLLAMA_URL) {
      throw new Error('Serviço de IA não configurado. Defina GOOGLE_AI_API_KEY ou OLLAMA_URL.')
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
      logger.error('Erro na verificação de interações:', error)
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
  async generateMedicalSummary(patientData: PatientDataForAI, userId?: string): Promise<MedicalSummary> {
    if (!process.env.GOOGLE_AI_API_KEY && !process.env.OLLAMA_URL) {
      throw new Error('Serviço de IA não configurado. Defina GOOGLE_AI_API_KEY ou OLLAMA_URL.')
    }
    if (userId) await checkAndConsumeAIQuota(userId, 'medical_summary')
    const redacted: PatientDataForAI = { ...patientData }
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
      logger.error('Erro na geração de resumo:', error)
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
  async analyzeVitalSigns(vitalSigns: VitalSignsForAI, patientAge: number, userId?: string): Promise<VitalSignsAnalysisResult> {
    if (!process.env.GOOGLE_AI_API_KEY && !process.env.OLLAMA_URL) {
      throw new Error('Serviço de IA não configurado. Defina GOOGLE_AI_API_KEY ou OLLAMA_URL.')
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
      logger.error('Erro na análise de sinais vitais:', error)
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
  async suggestTreatmentPlan(diagnosis: string, patientData: PatientDataForAI, userId?: string): Promise<TreatmentPlanResult> {
    if (!process.env.GOOGLE_AI_API_KEY && !process.env.OLLAMA_URL) {
      throw new Error('Serviço de IA não configurado. Defina GOOGLE_AI_API_KEY ou OLLAMA_URL.')
    }
    if (userId) await checkAndConsumeAIQuota(userId, 'treatment_plan')
    const redacted: PatientDataForAI = { ...patientData }
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
      logger.error('Erro na sugestão de tratamento:', error)
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

  // Expansão de protocolos por sigla (TARV, RIPE, etc.)
  async expandProtocol(
    sigla: string,
    options?: {
      patientAge?: number
      patientSex?: 'M' | 'F'
      context?: string
      userId?: string
    }
  ): Promise<ProtocolExpansionResult> {
    const hasAI = !!process.env.GROQ_API_KEY || !!process.env.OLLAMA_URL || !!process.env.GOOGLE_AI_API_KEY
    if (!hasAI) {
      throw new Error('Serviço de IA não configurado. Defina GROQ_API_KEY ou OLLAMA_URL em Configurações > IA.')
    }
    if (options?.userId) await checkAndConsumeAIQuota(options.userId, 'protocol_expansion')

    const siglaUpper = sigla.trim().toUpperCase()

    const ctx = []
    if (options?.patientAge) ctx.push(`Idade: ${options.patientAge} anos`)
    if (options?.patientSex) ctx.push(`Sexo: ${options.patientSex === 'M' ? 'Masculino' : 'Feminino'}`)
    if (options?.context) ctx.push(`Contexto: ${options.context}`)

    const prompt = `
Você é um especialista em protocolos clínicos brasileiros. Expanda a sigla/protocolo "${siglaUpper}" em uma lista completa de medicamentos para prescrição.

${ctx.length ? `DADOS DO PACIENTE:\n${ctx.join('\n')}\n` : ''}

INSTRUÇÕES:
1. Reconheça siglas: TARV (terapia antirretroviral), RIPE (tuberculose), HAS (hipertensão), DM2 (diabetes tipo 2), entre outras.
2. Se NÃO tiver alta confiança no significado, NÃO invente, NÃO estime e NÃO chute.
3. Em caso de dúvida, retorne recognized=false, confidence="low", medications=[] e description explicando "sigla não reconhecida com segurança".
4. Para nomes de medicamentos (ex: melatonina, dipirona): retorne 1 item com dosagem e posologia padrão.
5. Para siglas de protocolo reconhecidas com segurança: retorne todos os medicamentos do esquema.
6. TOLERÂNCIA A ERROS: Corrija erros comuns de digitação em nomes de medicamentos (ex: "lorazepan"→Lorazepam, "diazepan"→Diazepam, "amoxilina"→Amoxicilina, "omeprasol"→Omeprazol, "captopril"→Captopril, "rivotril"→Clonazepam). Se o nome é claramente uma variação de escrita de um medicamento conhecido, CORRIJA automaticamente e retorne o medicamento com o nome correto na DCB. Sempre trate a entrada como uma tentativa de prescrever um medicamento real.
7. Responda APENAS com um objeto JSON válido, sem texto antes ou depois, sem \`\`\`json.

Formato exato:
{"protocolName":"Nome","recognized":true,"confidence":"high","description":"Opcional","medications":[{"name":"Nome","dosage":"Ex: 10mg","frequency":"Ex: 1x ao dia","duration":"Ex: 30 dias","instructions":"Opcional","form":"comprimido"}]}
`

    const started = Date.now()
    this.ensureCircuit()
    try {
      const result = await startSpan('ai.protocol_expansion.request', () =>
        this.model.generateContent(prompt)
      )
      const raw = result.response.text().trim()
      let jsonStr = raw
      const codeBlock = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (codeBlock) jsonStr = codeBlock[1].trim()
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        logger.warn({ raw: raw.slice(0, 500) }, 'Resposta da IA sem JSON válido')
        return {
          protocolName: siglaUpper,
          recognized: false,
          confidence: 'low',
          description: 'A IA não retornou um formato válido para este termo.',
          medications: [],
        }
      }
      let parsed: ProtocolExpansionResult
      try {
        parsed = JSON.parse(jsonMatch[0]) as ProtocolExpansionResult
      } catch {
        logger.warn({ raw: jsonMatch[0].slice(0, 500) }, 'Falha ao parsear JSON da expansão de protocolo')
        return {
          protocolName: siglaUpper,
          recognized: false,
          confidence: 'low',
          description: 'Não foi possível interpretar a resposta da IA com segurança.',
          medications: [],
        }
      }
      if (!Array.isArray(parsed.medications)) parsed.medications = []
      if (!parsed.protocolName || typeof parsed.protocolName !== 'string') parsed.protocolName = siglaUpper

      const normalizedMedications = parsed.medications
        .filter((m) => m && typeof m.name === 'string')
        .map((m) => ({
          name: String(m.name || '').trim(),
          dosage: String(m.dosage || '').trim(),
          frequency: String(m.frequency || '').trim(),
          duration: String(m.duration || '').trim(),
          instructions: m.instructions ? String(m.instructions).trim() : undefined,
          form: m.form ? String(m.form).trim() : undefined,
        }))
        .filter((m) => m.name && m.dosage && m.frequency && m.duration)
      parsed.medications = normalizedMedications

      // Compatibilidade: se a IA não trouxer flags de reconhecimento, inferir pelos dados válidos.
      if (typeof parsed.recognized !== 'boolean') parsed.recognized = parsed.medications.length > 0
      if (!parsed.confidence || !['high', 'medium', 'low'].includes(parsed.confidence)) {
        parsed.confidence = parsed.recognized ? 'medium' : 'low'
      }

      if (!parsed.recognized || parsed.confidence === 'low') {
        parsed.medications = []
        if (!parsed.description) {
          parsed.description = 'Sigla não reconhecida com segurança. Revise a sigla informada.'
        }
      }

      if (parsed.recognized && parsed.medications.length === 0) {
        parsed.recognized = false
        parsed.confidence = 'low'
        parsed.description =
          parsed.description || 'Não foi possível extrair um protocolo válido com segurança.'
      }
      this.recordSuccess()
      return parsed
    } catch (error) {
      incCounter('ai_request_total', { type: 'protocol_expansion', status: 'error' })
      observeHistogram('ai_request_latency_ms', Date.now() - started, { type: 'protocol_expansion' })
      this.recordFailure()
      const msg = error instanceof Error ? error.message : ''
      if (
        msg.includes('não configurado') ||
        msg.includes('GROQ_API_KEY') ||
        msg.includes('Configure em Configurações > IA') ||
        msg.includes('IA local indisponível') ||
        msg.includes('circuit breaker') ||
        msg.includes('indisponível') ||
        msg.includes('não retornou')
      ) {
        throw error
      }
      logger.error({ err: error, sigla: siglaUpper }, 'Erro ao expandir protocolo')
      throw new Error('Erro ao expandir protocolo. Verifique se a sigla está correta ou use "Adicionar não cadastrado".')
    } finally {
      const duration = Date.now() - started
      observeHistogram('ai_request_latency_ms', duration, { type: 'protocol_expansion' })
      incCounter('ai_request_total', { type: 'protocol_expansion', status: 'success' })
    }
  }
}

export interface ProtocolMedication {
  name: string
  dosage: string
  frequency: string
  duration: string
  instructions?: string
  form?: string
}

export interface ProtocolExpansionResult {
  protocolName: string
  description?: string
  recognized: boolean
  confidence?: 'high' | 'medium' | 'low'
  medications: ProtocolMedication[]
}

export const medicalAI = new AdvancedMedicalAI()
