/**
 * HL7 FHIR Laboratory Integration Service
 * 
 * Serviço de integração com laboratórios usando padrões HL7 FHIR R4
 * Suporta recebimento de resultados de exames e envio de pedidos
 */

import prisma from '@/lib/prisma'
import { logger } from '@/lib/logger'
import crypto from 'crypto'

// ============ TIPOS FHIR R4 ============

// Bundle de transação FHIR
interface FHIRBundle {
  resourceType: 'Bundle'
  type: 'transaction' | 'batch' | 'searchset' | 'collection' | 'message'
  timestamp?: string
  total?: number
  entry?: FHIRBundleEntry[]
}

interface FHIRBundleEntry {
  fullUrl?: string
  resource: FHIRResource
  request?: {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE'
    url: string
  }
  response?: {
    status: string
    location?: string
  }
}

type FHIRResource = 
  | FHIRPatient 
  | FHIRDiagnosticReport 
  | FHIRObservation 
  | FHIRServiceRequest
  | FHIRSpecimen
  | FHIRPractitioner
  | FHIROrganization

// Patient Resource
interface FHIRPatient {
  resourceType: 'Patient'
  id?: string
  identifier?: FHIRIdentifier[]
  name?: FHIRHumanName[]
  gender?: 'male' | 'female' | 'other' | 'unknown'
  birthDate?: string
  telecom?: FHIRContactPoint[]
  address?: FHIRAddress[]
}

// DiagnosticReport Resource (Resultado de Exame)
interface FHIRDiagnosticReport {
  resourceType: 'DiagnosticReport'
  id?: string
  identifier?: FHIRIdentifier[]
  status: 'registered' | 'partial' | 'preliminary' | 'final' | 'amended' | 'corrected' | 'appended' | 'cancelled' | 'entered-in-error' | 'unknown'
  category?: FHIRCodeableConcept[]
  code: FHIRCodeableConcept
  subject: FHIRReference
  encounter?: FHIRReference
  effectiveDateTime?: string
  issued?: string
  performer?: FHIRReference[]
  result?: FHIRReference[]
  conclusion?: string
  conclusionCode?: FHIRCodeableConcept[]
  presentedForm?: FHIRAttachment[]
}

// Observation Resource (Resultado individual)
interface FHIRObservation {
  resourceType: 'Observation'
  id?: string
  identifier?: FHIRIdentifier[]
  status: 'registered' | 'preliminary' | 'final' | 'amended' | 'corrected' | 'cancelled' | 'entered-in-error' | 'unknown'
  category?: FHIRCodeableConcept[]
  code: FHIRCodeableConcept
  subject: FHIRReference
  effectiveDateTime?: string
  issued?: string
  performer?: FHIRReference[]
  valueQuantity?: FHIRQuantity
  valueString?: string
  valueBoolean?: boolean
  valueCodeableConcept?: FHIRCodeableConcept
  interpretation?: FHIRCodeableConcept[]
  referenceRange?: FHIRObservationReferenceRange[]
  note?: FHIRAnnotation[]
}

// ServiceRequest Resource (Pedido de Exame)
interface FHIRServiceRequest {
  resourceType: 'ServiceRequest'
  id?: string
  identifier?: FHIRIdentifier[]
  status: 'draft' | 'active' | 'on-hold' | 'revoked' | 'completed' | 'entered-in-error' | 'unknown'
  intent: 'proposal' | 'plan' | 'directive' | 'order' | 'original-order' | 'reflex-order' | 'filler-order' | 'instance-order' | 'option'
  category?: FHIRCodeableConcept[]
  priority?: 'routine' | 'urgent' | 'asap' | 'stat'
  code: FHIRCodeableConcept
  subject: FHIRReference
  encounter?: FHIRReference
  requester?: FHIRReference
  performer?: FHIRReference[]
  reasonCode?: FHIRCodeableConcept[]
  note?: FHIRAnnotation[]
  authoredOn?: string
}

// Specimen Resource
interface FHIRSpecimen {
  resourceType: 'Specimen'
  id?: string
  identifier?: FHIRIdentifier[]
  status?: 'available' | 'unavailable' | 'unsatisfactory' | 'entered-in-error'
  type?: FHIRCodeableConcept
  subject: FHIRReference
  receivedTime?: string
  collection?: {
    collectedDateTime?: string
    quantity?: FHIRQuantity
    method?: FHIRCodeableConcept
    bodySite?: FHIRCodeableConcept
  }
}

// Practitioner Resource
interface FHIRPractitioner {
  resourceType: 'Practitioner'
  id?: string
  identifier?: FHIRIdentifier[]
  name?: FHIRHumanName[]
  telecom?: FHIRContactPoint[]
  qualification?: {
    identifier?: FHIRIdentifier[]
    code: FHIRCodeableConcept
    issuer?: FHIRReference
  }[]
}

// Organization Resource
interface FHIROrganization {
  resourceType: 'Organization'
  id?: string
  identifier?: FHIRIdentifier[]
  name?: string
  type?: FHIRCodeableConcept[]
  telecom?: FHIRContactPoint[]
  address?: FHIRAddress[]
}

// Tipos auxiliares FHIR
interface FHIRIdentifier {
  system?: string
  value?: string
  use?: 'usual' | 'official' | 'temp' | 'secondary' | 'old'
}

interface FHIRHumanName {
  use?: 'usual' | 'official' | 'temp' | 'nickname' | 'anonymous' | 'old' | 'maiden'
  family?: string
  given?: string[]
  text?: string
}

interface FHIRContactPoint {
  system?: 'phone' | 'fax' | 'email' | 'pager' | 'url' | 'sms' | 'other'
  value?: string
  use?: 'home' | 'work' | 'temp' | 'old' | 'mobile'
}

interface FHIRAddress {
  use?: 'home' | 'work' | 'temp' | 'old' | 'billing'
  type?: 'postal' | 'physical' | 'both'
  line?: string[]
  city?: string
  state?: string
  postalCode?: string
  country?: string
}

interface FHIRCodeableConcept {
  coding?: FHIRCoding[]
  text?: string
}

interface FHIRCoding {
  system?: string
  code?: string
  display?: string
}

interface FHIRReference {
  reference?: string
  type?: string
  identifier?: FHIRIdentifier
  display?: string
}

interface FHIRQuantity {
  value?: number
  comparator?: '<' | '<=' | '>=' | '>'
  unit?: string
  system?: string
  code?: string
}

interface FHIRAttachment {
  contentType?: string
  language?: string
  data?: string // base64
  url?: string
  size?: number
  hash?: string // base64 SHA-1
  title?: string
  creation?: string
}

interface FHIRAnnotation {
  authorReference?: FHIRReference
  authorString?: string
  time?: string
  text: string
}

interface FHIRObservationReferenceRange {
  low?: FHIRQuantity
  high?: FHIRQuantity
  type?: FHIRCodeableConcept
  text?: string
}

// ============ TIPOS INTERNOS ============

interface LabResult {
  id: string
  externalId: string
  patientId: string
  examType: string
  examCode: string
  status: string
  resultDate: Date
  observations: LabObservation[]
  conclusion?: string
  pdfUrl?: string
  labName: string
  labCode: string
}

interface LabObservation {
  code: string
  name: string
  value: string
  unit?: string
  referenceRange?: string
  interpretation?: 'normal' | 'high' | 'low' | 'critical' | 'abnormal'
}

interface LabOrderRequest {
  patientId: string
  doctorId: string
  exams: {
    code: string
    name: string
    priority?: 'routine' | 'urgent' | 'stat'
    notes?: string
  }[]
  clinicalInfo?: string
}

// ============ CONSTANTES ============

// Sistemas de codificação
const CODING_SYSTEMS = {
  LOINC: 'http://loinc.org',
  SNOMED_CT: 'http://snomed.info/sct',
  TUSS: 'http://www.ans.gov.br/tuss',
  CBHPM: 'http://www.cbhpm.org.br',
  CPT: 'http://www.ama-assn.org/go/cpt',
  CPF: 'http://rnds.saude.gov.br/fhir/r4/NamingSystem/cpf',
  CNS: 'http://rnds.saude.gov.br/fhir/r4/NamingSystem/cns',
  CNES: 'http://rnds.saude.gov.br/fhir/r4/NamingSystem/cnes'
}

// Mapeamento de interpretações
const INTERPRETATION_MAP: Record<string, LabObservation['interpretation']> = {
  'N': 'normal',
  'H': 'high',
  'L': 'low',
  'HH': 'critical',
  'LL': 'critical',
  'A': 'abnormal'
}

// ============ SERVIÇO PRINCIPAL ============

export class HL7FHIRLabService {
  
  /**
   * Processar Bundle FHIR recebido de laboratório
   */
  static async processIncomingBundle(bundle: FHIRBundle): Promise<{
    processed: number
    errors: string[]
    results: LabResult[]
  }> {
    const errors: string[] = []
    const results: LabResult[] = []
    let processed = 0

    if (bundle.resourceType !== 'Bundle') {
      throw new Error('Recurso inválido: esperado Bundle FHIR')
    }

    logger.info(`[HL7FHIR] Processando bundle com ${bundle.entry?.length || 0} entradas`)

    // Extrair recursos por tipo
    const diagnosticReports = bundle.entry
      ?.filter(e => e.resource.resourceType === 'DiagnosticReport')
      .map(e => e.resource as FHIRDiagnosticReport) || []

    const observations = bundle.entry
      ?.filter(e => e.resource.resourceType === 'Observation')
      .map(e => e.resource as FHIRObservation) || []

    const organizations = bundle.entry
      ?.filter(e => e.resource.resourceType === 'Organization')
      .map(e => e.resource as FHIROrganization) || []

    // Processar cada DiagnosticReport
    for (const report of diagnosticReports) {
      try {
        const result = await this.processDiagnosticReport(report, observations, organizations)
        if (result) {
          results.push(result)
          processed++
        }
      } catch (error: any) {
        errors.push(`Erro ao processar relatório ${report.id}: ${error.message}`)
        logger.error(`[HL7FHIR] Erro processando relatório:`, error)
      }
    }

    logger.info(`[HL7FHIR] Bundle processado: ${processed} resultados, ${errors.length} erros`)

    return { processed, errors, results }
  }

  /**
   * Processar DiagnosticReport individual
   */
  private static async processDiagnosticReport(
    report: FHIRDiagnosticReport,
    allObservations: FHIRObservation[],
    organizations: FHIROrganization[]
  ): Promise<LabResult | null> {
    // Extrair identificador do paciente
    const patientRef = report.subject.reference
    const patientIdentifier = report.subject.identifier

    // Buscar paciente no sistema
    let patient = null
    
    if (patientIdentifier?.value) {
      // Buscar por CPF
      patient = await prisma.patient.findFirst({
        where: { cpf: patientIdentifier.value }
      })
    }

    if (!patient && patientRef) {
      // Tentar extrair ID do reference
      const refId = patientRef.split('/').pop()
      if (refId) {
        patient = await prisma.patient.findFirst({
          where: {
            OR: [
              { id: refId },
              { cpf: refId }
            ]
          }
        })
      }
    }

    if (!patient) {
      logger.warn(`[HL7FHIR] Paciente não encontrado: ${patientRef || patientIdentifier?.value}`)
      return null
    }

    // Extrair observações relacionadas
    const reportObservations = report.result
      ?.map(ref => {
        const obsId = ref.reference?.split('/').pop()
        return allObservations.find(o => o.id === obsId)
      })
      .filter(Boolean) as FHIRObservation[]

    // Converter observações
    const labObservations: LabObservation[] = reportObservations.map(obs => ({
      code: obs.code.coding?.[0]?.code || 'unknown',
      name: obs.code.coding?.[0]?.display || obs.code.text || 'Exame',
      value: this.extractObservationValue(obs),
      unit: obs.valueQuantity?.unit,
      referenceRange: this.formatReferenceRange(obs.referenceRange),
      interpretation: this.mapInterpretation(obs.interpretation)
    }))

    // Extrair laboratório
    const labOrg = organizations[0]
    const labName = labOrg?.name || 'Laboratório Externo'
    const labCode = labOrg?.identifier?.[0]?.value || 'EXT'

    // Criar resultado
    const result: LabResult = {
      id: crypto.randomUUID(),
      externalId: report.id || report.identifier?.[0]?.value || crypto.randomUUID(),
      patientId: patient.id,
      examType: report.category?.[0]?.coding?.[0]?.display || 'Exame Laboratorial',
      examCode: report.code.coding?.[0]?.code || 'LAB',
      status: this.mapReportStatus(report.status),
      resultDate: new Date(report.effectiveDateTime || report.issued || Date.now()),
      observations: labObservations,
      conclusion: report.conclusion,
      pdfUrl: report.presentedForm?.[0]?.url,
      labName,
      labCode
    }

    // Salvar no banco de dados
    await this.saveLabResult(result)

    return result
  }

  /**
   * Extrair valor de uma Observation
   */
  private static extractObservationValue(obs: FHIRObservation): string {
    if (obs.valueQuantity) {
      return `${obs.valueQuantity.value} ${obs.valueQuantity.unit || ''}`.trim()
    }
    if (obs.valueString) {
      return obs.valueString
    }
    if (obs.valueBoolean !== undefined) {
      return obs.valueBoolean ? 'Positivo' : 'Negativo'
    }
    if (obs.valueCodeableConcept) {
      return obs.valueCodeableConcept.text || 
             obs.valueCodeableConcept.coding?.[0]?.display || 
             'N/A'
    }
    return 'N/A'
  }

  /**
   * Formatar intervalo de referência
   */
  private static formatReferenceRange(ranges?: FHIRObservationReferenceRange[]): string | undefined {
    if (!ranges || ranges.length === 0) return undefined

    const range = ranges[0]
    if (range.text) return range.text

    const low = range.low?.value
    const high = range.high?.value
    const unit = range.low?.unit || range.high?.unit || ''

    if (low !== undefined && high !== undefined) {
      return `${low} - ${high} ${unit}`.trim()
    }
    if (low !== undefined) {
      return `> ${low} ${unit}`.trim()
    }
    if (high !== undefined) {
      return `< ${high} ${unit}`.trim()
    }

    return undefined
  }

  /**
   * Mapear interpretação FHIR para interno
   */
  private static mapInterpretation(
    interpretations?: FHIRCodeableConcept[]
  ): LabObservation['interpretation'] | undefined {
    if (!interpretations || interpretations.length === 0) return undefined

    const code = interpretations[0].coding?.[0]?.code
    if (code) {
      return INTERPRETATION_MAP[code]
    }
    return undefined
  }

  /**
   * Mapear status do relatório
   */
  private static mapReportStatus(status: FHIRDiagnosticReport['status']): string {
    const statusMap: Record<string, string> = {
      'registered': 'PENDENTE',
      'partial': 'PARCIAL',
      'preliminary': 'PRELIMINAR',
      'final': 'FINAL',
      'amended': 'ALTERADO',
      'corrected': 'CORRIGIDO',
      'appended': 'ANEXADO',
      'cancelled': 'CANCELADO',
      'entered-in-error': 'ERRO',
      'unknown': 'DESCONHECIDO'
    }
    return statusMap[status] || 'DESCONHECIDO'
  }

  /**
   * Salvar resultado no banco de dados
   */
  private static async saveLabResult(result: LabResult): Promise<void> {
    // Buscar ou criar registro de exame
    const existingExam = await prisma.exam.findFirst({
      where: {
        patientId: result.patientId,
        fhirResourceId: result.externalId
      }
    })

    if (existingExam) {
      // Atualizar exame existente
      await prisma.exam.update({
        where: { id: existingExam.id },
        data: {
          status: result.status,
          resultAt: result.resultDate,
          result: JSON.stringify(result.observations),
          interpretation: result.conclusion,
          notes: result.pdfUrl,
          updatedAt: new Date()
        }
      })
      logger.info(`[HL7FHIR] Exame atualizado: ${existingExam.id}`)
    } else {
      // Criar novo exame
      await prisma.exam.create({
        data: {
          patientId: result.patientId,
          fhirResourceId: result.externalId,
          examType: result.examType,
          examCode: result.examCode,
          status: result.status,
          requestedAt: result.resultDate,
          resultAt: result.resultDate,
          result: JSON.stringify(result.observations),
          interpretation: result.conclusion,
          notes: result.pdfUrl,
          labName: result.labName,
          labCode: result.labCode
        }
      })
      logger.info(`[HL7FHIR] Novo exame criado para paciente: ${result.patientId}`)
    }

    // Criar notificação para o médico/paciente
    await this.notifyNewResult(result)
  }

  /**
   * Notificar sobre novo resultado
   */
  private static async notifyNewResult(result: LabResult): Promise<void> {
    // Buscar última consulta do paciente para notificar o médico
    const lastConsultation = await prisma.consultation.findFirst({
      where: { patientId: result.patientId },
      orderBy: { scheduledDate: 'desc' },
      include: { doctor: true }
    })

    if (lastConsultation?.doctorId) {
      await prisma.notification.create({
        data: {
          userId: lastConsultation.doctorId,
          type: 'EXAM_RESULT',
          title: 'Novo Resultado de Exame',
          message: `Resultado de ${result.examType} disponível para paciente`,
          read: false
        }
      })
    }
  }

  /**
   * Gerar ServiceRequest (pedido de exame) em FHIR
   */
  static async createLabOrder(request: LabOrderRequest): Promise<FHIRBundle> {
    // Buscar dados do paciente e médico
    const [patient, doctor] = await Promise.all([
      prisma.patient.findUnique({ where: { id: request.patientId } }),
      prisma.user.findUnique({ where: { id: request.doctorId } })
    ])

    if (!patient) throw new Error('Paciente não encontrado')
    if (!doctor) throw new Error('Médico não encontrado')

    const bundle: FHIRBundle = {
      resourceType: 'Bundle',
      type: 'transaction',
      timestamp: new Date().toISOString(),
      entry: []
    }

    // Adicionar Patient
    const patientResource: FHIRPatient = {
      resourceType: 'Patient',
      id: patient.id,
      identifier: [
        { system: CODING_SYSTEMS.CPF, value: patient.cpf ?? undefined }
      ],
      name: [{ text: patient.name }],
      gender: patient.gender?.toLowerCase() as any || 'unknown',
      birthDate: patient.birthDate?.toISOString().split('T')[0]
    }

    bundle.entry!.push({
      fullUrl: `urn:uuid:${patient.id}`,
      resource: patientResource,
      request: { method: 'POST', url: 'Patient' }
    })

    // Adicionar Practitioner
    const practitionerResource: FHIRPractitioner = {
      resourceType: 'Practitioner',
      id: doctor.id,
      identifier: [
        { system: 'http://www.cfm.org.br/crm', value: doctor.licenseNumber ?? doctor.crmNumber ?? '' }
      ],
      name: [{ text: doctor.name }]
    }

    bundle.entry!.push({
      fullUrl: `urn:uuid:${doctor.id}`,
      resource: practitionerResource,
      request: { method: 'POST', url: 'Practitioner' }
    })

    // Adicionar ServiceRequests para cada exame
    for (const exam of request.exams) {
      const serviceRequest: FHIRServiceRequest = {
        resourceType: 'ServiceRequest',
        id: crypto.randomUUID(),
        identifier: [{ value: crypto.randomUUID() }],
        status: 'active',
        intent: 'order',
        priority: exam.priority || 'routine',
        code: {
          coding: [
            { system: CODING_SYSTEMS.TUSS, code: exam.code, display: exam.name }
          ],
          text: exam.name
        },
        subject: { reference: `urn:uuid:${patient.id}` },
        requester: { reference: `urn:uuid:${doctor.id}` },
        authoredOn: new Date().toISOString(),
        reasonCode: request.clinicalInfo ? [{ text: request.clinicalInfo }] : undefined,
        note: exam.notes ? [{ text: exam.notes }] : undefined
      }

      bundle.entry!.push({
        fullUrl: `urn:uuid:${serviceRequest.id}`,
        resource: serviceRequest,
        request: { method: 'POST', url: 'ServiceRequest' }
      })
    }

    logger.info(`[HL7FHIR] Bundle de pedido criado com ${bundle.entry!.length} recursos`)

    return bundle
  }

  /**
   * Converter paciente interno para FHIR Patient
   */
  static patientToFHIR(patient: any): FHIRPatient {
    return {
      resourceType: 'Patient',
      id: patient.id,
      identifier: [
        ...(patient.cpf ? [{ system: CODING_SYSTEMS.CPF, value: patient.cpf }] : []),
        ...(patient.susCard ? [{ system: CODING_SYSTEMS.CNS, value: patient.susCard }] : [])
      ],
      name: [{ text: patient.name }],
      gender: this.mapGender(patient.gender),
      birthDate: patient.birthDate?.toISOString().split('T')[0],
      telecom: [
        ...(patient.phone ? [{ system: 'phone' as const, value: patient.phone }] : []),
        ...(patient.email ? [{ system: 'email' as const, value: patient.email }] : [])
      ],
      address: patient.address ? [{
        line: [patient.address],
        city: patient.city,
        state: patient.state,
        postalCode: patient.zipCode
      }] : undefined
    }
  }

  private static mapGender(gender?: string): FHIRPatient['gender'] {
    const map: Record<string, FHIRPatient['gender']> = {
      'MALE': 'male',
      'FEMALE': 'female',
      'OTHER': 'other',
      'M': 'male',
      'F': 'female'
    }
    return map[gender?.toUpperCase() || ''] || 'unknown'
  }

  /**
   * Validar Bundle FHIR
   */
  static validateBundle(bundle: any): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!bundle || typeof bundle !== 'object') {
      errors.push('Bundle inválido: não é um objeto')
      return { valid: false, errors }
    }

    if (bundle.resourceType !== 'Bundle') {
      errors.push(`resourceType inválido: esperado 'Bundle', recebido '${bundle.resourceType}'`)
    }

    if (!['transaction', 'batch', 'searchset', 'collection', 'message'].includes(bundle.type)) {
      errors.push(`type inválido: '${bundle.type}'`)
    }

    if (bundle.entry && !Array.isArray(bundle.entry)) {
      errors.push('entry deve ser um array')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}

export default HL7FHIRLabService
