/**
 * Serviço de Alertas de Alergia
 * 
 * Verifica interações e alertas de alergia durante prescrição de medicamentos.
 * 
 * Funcionalidades:
 * - Verifica alergias conhecidas do paciente contra medicamentos prescritos
 * - Detecta palavras-chave de substâncias alergênicas
 * - Retorna alertas com níveis de severidade
 * - Integra com histórico de reações adversas
 */

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// ============ TIPOS ============

export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export interface AllergyAlert {
  severity: AlertSeverity
  type: 'ALLERGY_MATCH' | 'CROSS_REACTIVITY' | 'DRUG_CLASS' | 'ADVERSE_HISTORY'
  medicationName: string
  medicationId?: string
  allergen: string
  message: string
  recommendation: string
}

export interface AllergyCheckResult {
  hasAlerts: boolean
  alerts: AllergyAlert[]
  patientAllergies: string[]
  checkedMedications: string[]
}

// ============ BASE DE CONHECIMENTO ============

// Grupos de reatividade cruzada (cross-reactivity)
const CROSS_REACTIVITY_GROUPS: Record<string, string[]> = {
  // Penicilinas e cefalosporinas
  'PENICILINA': [
    'amoxicilina', 'ampicilina', 'penicilina', 'oxacilina', 'piperacilina',
    'benzilpenicilina', 'fenoximetilpenicilina', 'amoxacilina', 'amoxilina'
  ],
  'CEFALOSPORINA': [
    'cefalexina', 'cefazolina', 'ceftriaxona', 'cefuroxima', 'cefalotina',
    'cefadroxila', 'cefaclor', 'cefixima', 'ceftazidima', 'cefepima'
  ],
  // Sulfonamidas
  'SULFONAMIDA': [
    'sulfametoxazol', 'sulfadiazina', 'sulfassalazina', 'sulfadoxina',
    'trimetoprim', 'cotrimoxazol', 'bactrim', 'sulfanilamida'
  ],
  // AINEs
  'AINE': [
    'ibuprofeno', 'naproxeno', 'diclofenaco', 'cetoprofeno', 'piroxicam',
    'meloxicam', 'nimesulida', 'tenoxicam', 'indometacina', 'aspirina',
    'ácido acetilsalicílico', 'aas', 'dipirona', 'metamizol'
  ],
  // Opioides
  'OPIOIDE': [
    'morfina', 'codeína', 'tramadol', 'metadona', 'fentanil',
    'oxicodona', 'buprenorfina', 'naltrexona', 'naloxona'
  ],
  // Quinolonas
  'QUINOLONA': [
    'ciprofloxacino', 'levofloxacino', 'norfloxacino', 'ofloxacino',
    'moxifloxacino', 'gatifloxacino', 'gemifloxacino'
  ],
  // Macrolídeos
  'MACROLIDEOS': [
    'azitromicina', 'claritromicina', 'eritromicina', 'roxitromicina',
    'espiramicina', 'telitromicina'
  ],
  // Anestésicos locais tipo amida
  'ANESTESICO_AMIDA': [
    'lidocaína', 'bupivacaína', 'ropivacaína', 'mepivacaína', 'prilocaína',
    'articaína', 'etidocaína'
  ],
  // Anestésicos locais tipo éster
  'ANESTESICO_ESTER': [
    'procaína', 'benzocaína', 'tetracaína', 'cocaína', 'cloroprocaína'
  ],
  // Contraste iodado
  'CONTRASTE_IODADO': [
    'iodo', 'iodado', 'contraste', 'iopamidol', 'iohexol', 'iodixanol',
    'ioversol', 'amidotrizoato', 'diatrizoato'
  ],
  // Látex (cross com frutas)
  'LATEX': [
    'látex', 'latex', 'banana', 'kiwi', 'abacate', 'castanha', 'mamão'
  ],
  // Insulinas
  'INSULINA': [
    'insulina', 'glargina', 'detemir', 'degludeca', 'lispro', 'aspart',
    'glulisina', 'nph', 'regular'
  ]
}

// Penicilina -> risco de reação com cefalosporinas (5-10%)
const CROSS_CLASS_RISK: Record<string, { class: string; risk: number; message: string }[]> = {
  'PENICILINA': [
    { class: 'CEFALOSPORINA', risk: 0.10, message: 'Risco de ~10% de reação cruzada entre penicilinas e cefalosporinas (especialmente de 1ª geração)' }
  ],
  'CEFALOSPORINA': [
    { class: 'PENICILINA', risk: 0.05, message: 'Paciente com alergia a cefalosporina pode ter risco de 5% com penicilinas' }
  ],
  'SULFONAMIDA': [
    { class: 'SULFONAMIDA', risk: 1.0, message: 'Evitar todas as sulfonamidas em paciente com alergia conhecida' }
  ],
  'AINE': [
    { class: 'AINE', risk: 0.30, message: 'Pacientes com alergia a um AINE podem reagir a outros (até 30% de reação cruzada)' }
  ]
}

// ============ SERVIÇO ============

class AllergyAlertServiceClass {
  /**
   * Verifica alergias do paciente contra uma lista de medicamentos
   */
  async checkAllergies(
    patientId: string,
    medications: Array<{ name: string; id?: string }>
  ): Promise<AllergyCheckResult> {
    const alerts: AllergyAlert[] = []

    try {
      // Buscar paciente e suas alergias
      const patient = await prisma.patient.findUnique({
        where: { id: patientId },
        select: {
          allergies: true
        }
      })

      if (!patient) {
        return {
          hasAlerts: false,
          alerts: [],
          patientAllergies: [],
          checkedMedications: medications.map(m => m.name)
        }
      }

      // Buscar prontuários separadamente para extrair menções de alergia
      const medicalRecords = await prisma.medicalRecord.findMany({
        where: {
          patientId,
          recordType: { in: ['CONSULTATION', 'FOLLOW_UP'] }
        },
        select: {
          description: true,
          notes: true
        },
        take: 10,
        orderBy: { createdAt: 'desc' }
      })

      // Extrair alergias do campo de texto
      const allergiesText = patient.allergies || ''
      const patientAllergies = this.parseAllergies(allergiesText)

      // Também verificar alergias mencionadas em prontuários recentes
      const recordAllergies = this.extractAllergiesFromRecords(
        medicalRecords.map(r => ({ content: `${r.description || ''} ${r.notes || ''}` }))
      )
      const allAllergies = [...new Set([...patientAllergies, ...recordAllergies])]

      if (allAllergies.length === 0) {
        return {
          hasAlerts: false,
          alerts: [],
          patientAllergies: [],
          checkedMedications: medications.map(m => m.name)
        }
      }

      // Verificar cada medicamento
      for (const medication of medications) {
        const medAlerts = this.checkMedicationAgainstAllergies(
          medication.name,
          medication.id,
          allAllergies
        )
        alerts.push(...medAlerts)
      }

      // Ordenar por severidade
      alerts.sort((a, b) => {
        const order: Record<AlertSeverity, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }
        return order[a.severity] - order[b.severity]
      })

      return {
        hasAlerts: alerts.length > 0,
        alerts,
        patientAllergies: allAllergies,
        checkedMedications: medications.map(m => m.name)
      }
    } catch (error) {
      logger.error('[AllergyAlert] Erro ao verificar alergias:', error)
      return {
        hasAlerts: false,
        alerts: [],
        patientAllergies: [],
        checkedMedications: medications.map(m => m.name)
      }
    }
  }

  /**
   * Verifica um medicamento específico contra lista de alergias
   */
  private checkMedicationAgainstAllergies(
    medicationName: string,
    medicationId: string | undefined,
    allergies: string[]
  ): AllergyAlert[] {
    const alerts: AllergyAlert[] = []
    const medNameLower = medicationName.toLowerCase()

    for (const allergen of allergies) {
      const allergenLower = allergen.toLowerCase()

      // 1. Match direto
      if (medNameLower.includes(allergenLower) || allergenLower.includes(medNameLower)) {
        alerts.push({
          severity: 'CRITICAL',
          type: 'ALLERGY_MATCH',
          medicationName,
          medicationId,
          allergen,
          message: `Alergia CONFIRMADA: Paciente tem alergia registrada a "${allergen}" e o medicamento prescrito é "${medicationName}"`,
          recommendation: 'NÃO prescrever este medicamento. Considerar alternativas terapêuticas.'
        })
        continue
      }

      // 2. Verificar classe do medicamento e reatividade cruzada
      const medClass = this.getMedicationClass(medNameLower)
      const allergenClass = this.getMedicationClass(allergenLower)

      if (medClass && allergenClass) {
        // Mesmo grupo de reatividade
        if (medClass === allergenClass) {
          alerts.push({
            severity: 'HIGH',
            type: 'DRUG_CLASS',
            medicationName,
            medicationId,
            allergen,
            message: `Risco ALTO: "${medicationName}" pertence ao mesmo grupo farmacológico (${medClass}) que a substância alérgica "${allergen}"`,
            recommendation: 'Evitar prescrição. Se necessário, monitorar de perto e ter medidas de emergência disponíveis.'
          })
        }

        // Verificar risco cruzado entre classes
        const crossRisks = CROSS_CLASS_RISK[allergenClass] || []
        for (const crossRisk of crossRisks) {
          if (crossRisk.class === medClass) {
            alerts.push({
              severity: crossRisk.risk >= 0.20 ? 'HIGH' : 'MEDIUM',
              type: 'CROSS_REACTIVITY',
              medicationName,
              medicationId,
              allergen,
              message: `Reatividade cruzada: ${crossRisk.message}`,
              recommendation: crossRisk.risk >= 0.20
                ? 'Considerar alternativa terapêutica. Se indispensável, fazer teste cutâneo antes.'
                : 'Prescrever com cautela. Orientar paciente sobre sinais de reação alérgica.'
            })
          }
        }
      }

      // 3. Verificar palavras-chave específicas
      const keywordMatch = this.checkKeywordMatch(medNameLower, allergenLower)
      if (keywordMatch) {
        alerts.push({
          severity: 'MEDIUM',
          type: 'ALLERGY_MATCH',
          medicationName,
          medicationId,
          allergen,
          message: `Possível relação: Medicamento "${medicationName}" pode conter ou ser relacionado a "${allergen}"`,
          recommendation: 'Verificar bula do medicamento. Confirmar com paciente se a alergia é à substância ativa ou excipientes.'
        })
      }
    }

    return alerts
  }

  /**
   * Identifica a classe farmacológica de um medicamento
   */
  private getMedicationClass(name: string): string | null {
    for (const [className, medications] of Object.entries(CROSS_REACTIVITY_GROUPS)) {
      if (medications.some(med => name.includes(med) || med.includes(name))) {
        return className
      }
    }
    return null
  }

  /**
   * Verifica match por palavras-chave relacionadas
   */
  private checkKeywordMatch(medicationName: string, allergen: string): boolean {
    // Palavras-chave comuns em alergias
    const keywords: Record<string, string[]> = {
      'ovo': ['vacina', 'albumina'],
      'gelatina': ['cápsula', 'vacina'],
      'lactose': ['comprimido', 'cápsula'],
      'glúten': ['comprimido'],
      'corante': ['amarelo', 'tartrazina', 'vermelho'],
      'conservante': ['parabeno', 'propileno']
    }

    for (const [allergenKey, relatedTerms] of Object.entries(keywords)) {
      if (allergen.includes(allergenKey)) {
        if (relatedTerms.some(term => medicationName.includes(term))) {
          return true
        }
      }
    }

    return false
  }

  /**
   * Parse do campo de texto de alergias
   */
  private parseAllergies(text: string): string[] {
    if (!text || text.trim() === '') return []
    if (['nega', 'nenhuma', 'não possui', 'não tem', 'ndn', 'n/a', '-'].some(
      term => text.toLowerCase().includes(term)
    )) {
      return []
    }

    // Separar por vírgula, ponto-e-vírgula, quebra de linha, "e", "+"
    const separators = /[,;\n\r]+|\s+e\s+|\s*\+\s*/gi
    const parts = text.split(separators)
      .map(p => p.trim())
      .filter(p => p.length > 1 && !['a', 'o', 'de', 'da', 'do', 'ao'].includes(p.toLowerCase()))

    return parts
  }

  /**
   * Extrai alergias mencionadas em prontuários
   */
  private extractAllergiesFromRecords(records: Array<{ content: string | null }>): string[] {
    const allergies: string[] = []
    
    // Padrões para detectar menções de alergia
    const patterns = [
      /alergia\s*(?:a|à|ao)?\s*[:=]?\s*([^,.\n]+)/gi,
      /alérgico\s*(?:a|à|ao)?\s*[:=]?\s*([^,.\n]+)/gi,
      /hipersensibilidade\s*(?:a|à|ao)?\s*[:=]?\s*([^,.\n]+)/gi,
      /reação\s+alérgica\s*(?:a|à|ao)?\s*[:=]?\s*([^,.\n]+)/gi
    ]

    for (const record of records) {
      const content = record.content || ''
      
      for (const pattern of patterns) {
        let match
        while ((match = pattern.exec(content)) !== null) {
          if (match[1]) {
            const allergen = match[1].trim()
            if (allergen.length > 2 && allergen.length < 50) {
              allergies.push(allergen)
            }
          }
        }
      }
    }

    return [...new Set(allergies)]
  }

  /**
   * Retorna resumo das alergias do paciente formatado
   */
  async getPatientAllergySummary(patientId: string): Promise<{
    hasAllergies: boolean
    allergiesList: string[]
    formattedText: string
    lastUpdated?: Date
  }> {
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: {
        allergies: true,
        updatedAt: true
      }
    })

    if (!patient || !patient.allergies) {
      return {
        hasAllergies: false,
        allergiesList: [],
        formattedText: 'Nenhuma alergia registrada'
      }
    }

    const allergiesList = this.parseAllergies(patient.allergies)

    return {
      hasAllergies: allergiesList.length > 0,
      allergiesList,
      formattedText: allergiesList.length > 0 
        ? allergiesList.join(', ')
        : 'Nenhuma alergia registrada',
      lastUpdated: patient.updatedAt
    }
  }
}

// Singleton
export const AllergyAlertService = new AllergyAlertServiceClass()
