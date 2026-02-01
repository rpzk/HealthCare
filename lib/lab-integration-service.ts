/**
 * HL7 FHIR Lab Integration Service
 * 
 * Integração com laboratórios via padrões:
 * - HL7 FHIR R4 (padrão moderno)
 * - HL7 v2.x (legado, muitos labs ainda usam)
 * 
 * Features:
 * - Envio de pedidos de exames (ORM - Order Message)
 * - Recebimento de resultados (ORU - Observation Result)
 * - Parser de mensagens HL7 v2.x
 * - Conversão FHIR <-> HL7v2
 * - Webhook para receber resultados
 */

import { prisma } from '@/lib/prisma'
import { NotificationSender } from '@/lib/notification-sender'
import { logger } from '@/lib/logger'

// ============ TYPES ============

export interface HL7Message {
  type: 'ORM' | 'ORU' | 'ADT' | 'ACK'
  version: string
  timestamp: Date
  sendingApp: string
  sendingFacility: string
  receivingApp: string
  receivingFacility: string
  messageControlId: string
  segments: HL7Segment[]
  raw?: string
}

export interface HL7Segment {
  name: string
  fields: (string | null)[]
}

export interface FHIRServiceRequest {
  resourceType: 'ServiceRequest'
  id?: string
  status: 'draft' | 'active' | 'completed' | 'cancelled'
  intent: 'order' | 'proposal' | 'plan'
  code: {
    coding: Array<{
      system: string
      code: string
      display: string
    }>
  }
  subject: {
    reference: string
    display: string
  }
  requester: {
    reference: string
    display: string
  }
  authoredOn: string
  note?: Array<{ text: string }>
}

export interface FHIRDiagnosticReport {
  resourceType: 'DiagnosticReport'
  id?: string
  status: 'registered' | 'partial' | 'preliminary' | 'final' | 'amended' | 'cancelled'
  code: {
    coding: Array<{
      system: string
      code: string
      display: string
    }>
  }
  subject: {
    reference: string
  }
  effectiveDateTime: string
  issued: string
  result?: Array<{
    reference: string
  }>
  conclusion?: string
  presentedForm?: Array<{
    contentType: string
    data: string // Base64
  }>
}

export interface LabOrder {
  id: string
  patientId: string
  patientName: string
  patientCpf?: string
  patientBirthDate?: Date
  doctorId: string
  doctorName: string
  doctorCRM?: string
  exams: LabExam[]
  priority: 'routine' | 'urgent' | 'stat'
  notes?: string
  createdAt: Date
}

export interface LabExam {
  code: string
  name: string
  instructions?: string
}

export interface LabResult {
  orderId: string
  examCode: string
  examName: string
  status: 'pending' | 'preliminary' | 'final' | 'cancelled'
  resultValue?: string
  unit?: string
  referenceRange?: string
  abnormalFlag?: 'L' | 'H' | 'LL' | 'HH' | 'N' // Low, High, Critical Low, Critical High, Normal
  interpretation?: string
  performedAt: Date
  reportedAt: Date
  performingLab?: string
  pdfReport?: string // Base64 encoded PDF
}

export interface LabWebhookPayload {
  format: 'hl7v2' | 'fhir'
  content: string | FHIRDiagnosticReport
}

// ============ SERVICE CLASS ============

class LabIntegrationServiceClass {
  private readonly fieldSeparator = '|'
  private readonly componentSeparator = '^'
  private readonly subcomponentSeparator = '&'
  private readonly repetitionSeparator = '~'
  private readonly escapeCharacter = '\\'
  
  // ============ HL7 v2.x PARSING ============
  
  /**
   * Parse mensagem HL7 v2.x
   */
  parseHL7v2(message: string): HL7Message {
    const lines = message.trim().split(/\r?\n|\r/)
    const segments: HL7Segment[] = []
    
    for (const line of lines) {
      if (!line.trim()) continue
      
      const segmentName = line.substring(0, 3)
      let fields: (string | null)[]
      
      if (segmentName === 'MSH') {
        // MSH segment has special handling - field separator is at position 3
        fields = [this.fieldSeparator, ...line.substring(4).split(this.fieldSeparator)]
      } else {
        fields = line.split(this.fieldSeparator).slice(1) // Remove segment name
      }
      
      segments.push({ name: segmentName, fields })
    }
    
    const msh = segments.find(s => s.name === 'MSH')
    if (!msh) {
      throw new Error('Invalid HL7 message: Missing MSH segment')
    }
    
    // Determinar tipo de mensagem
    const messageType = msh.fields[8]?.split(this.componentSeparator)[0] as 'ORM' | 'ORU' | 'ADT' | 'ACK'
    
    return {
      type: messageType,
      version: msh.fields[11] || '2.5',
      timestamp: this.parseHL7DateTime(msh.fields[6] || ''),
      sendingApp: msh.fields[2]?.split(this.componentSeparator)[0] || '',
      sendingFacility: msh.fields[3]?.split(this.componentSeparator)[0] || '',
      receivingApp: msh.fields[4]?.split(this.componentSeparator)[0] || '',
      receivingFacility: msh.fields[5]?.split(this.componentSeparator)[0] || '',
      messageControlId: msh.fields[9] || '',
      segments,
      raw: message
    }
  }
  
  /**
   * Gera mensagem HL7 ORM (Order Message) para envio ao lab
   */
  generateORM(order: LabOrder): string {
    const timestamp = this.formatHL7DateTime(new Date())
    const messageControlId = `MSG${Date.now()}`
    
    const segments: string[] = []
    
    // MSH - Message Header
    segments.push(
      `MSH|^~\\&|HealthCare|Clinica|LabSystem|Lab|${timestamp}||ORM^O01^ORM_O01|${messageControlId}|P|2.5`
    )
    
    // PID - Patient Identification
    const patientCpf = order.patientCpf || ''
    const birthDate = order.patientBirthDate ? this.formatHL7Date(order.patientBirthDate) : ''
    segments.push(
      `PID|1||${order.patientId}^^^HealthCare||${order.patientName}||${birthDate}|M|||||||||||${patientCpf}`
    )
    
    // PV1 - Patient Visit
    segments.push('PV1|1|O')
    
    // ORC/OBR for each exam
    let sequenceNum = 1
    for (const exam of order.exams) {
      // ORC - Common Order
      segments.push(
        `ORC|NW|${order.id}-${sequenceNum}|||${order.priority === 'stat' ? 'S' : order.priority === 'urgent' ? 'A' : 'R'}|||||||${order.doctorId}^${order.doctorName}^^^^^${order.doctorCRM || ''}`
      )
      
      // OBR - Observation Request
      segments.push(
        `OBR|${sequenceNum}|${order.id}-${sequenceNum}||${exam.code}^${exam.name}||||||||||||${order.doctorId}^${order.doctorName}|||||||||||${order.priority === 'stat' ? 'S' : order.priority === 'urgent' ? 'A' : 'R'}||1`
      )
      
      // NTE - Notes (if any)
      if (order.notes) {
        segments.push(`NTE|1|L|${order.notes}`)
      }
      if (exam.instructions) {
        segments.push(`NTE|2|L|${exam.instructions}`)
      }
      
      sequenceNum++
    }
    
    return segments.join('\r')
  }
  
  /**
   * Parse resultado ORU (Observation Result)
   */
  parseORU(message: HL7Message): LabResult[] {
    const results: LabResult[] = []
    
    // Find ORC segments to get order ID
    const orcSegments = message.segments.filter(s => s.name === 'ORC')
    const obrSegments = message.segments.filter(s => s.name === 'OBR')
    const obxSegments = message.segments.filter(s => s.name === 'OBX')
    
    for (let i = 0; i < obrSegments.length; i++) {
      const obr = obrSegments[i]
      const orc = orcSegments[i]
      
      // Extract order ID from ORC-2 or OBR-2
      const orderIdRaw = orc?.fields[1] || obr?.fields[1] || ''
      const orderId = orderIdRaw.split('-')[0] // Remove sequence suffix
      
      // Extract exam code/name from OBR-4
      const examCodeField = obr.fields[3]?.split(this.componentSeparator) || []
      const examCode = examCodeField[0] || ''
      const examName = examCodeField[1] || ''
      
      // Find corresponding OBX segments
      const relatedObx = obxSegments.filter((obx, idx) => {
        // Simple association by position - in real scenarios, use set ID
        return true // Include all for now
      })
      
      for (const obx of relatedObx) {
        const valueType = obx.fields[1] || 'ST' // Value type
        const observationId = obx.fields[2]?.split(this.componentSeparator) || []
        const resultValue = obx.fields[4] || ''
        const unit = obx.fields[5]?.split(this.componentSeparator)[0] || ''
        const referenceRange = obx.fields[6] || ''
        const abnormalFlag = obx.fields[7] as LabResult['abnormalFlag'] || 'N'
        const resultStatus = obx.fields[10] || 'F'
        const observationDateTime = obx.fields[13] || ''
        
        results.push({
          orderId,
          examCode: observationId[0] || examCode,
          examName: observationId[1] || examName,
          status: resultStatus === 'F' ? 'final' : resultStatus === 'P' ? 'preliminary' : 'pending',
          resultValue,
          unit,
          referenceRange,
          abnormalFlag: abnormalFlag || undefined,
          performedAt: this.parseHL7DateTime(observationDateTime),
          reportedAt: new Date()
        })
      }
    }
    
    return results
  }
  
  /**
   * Gera ACK (Acknowledgment) para mensagem recebida
   */
  generateACK(originalMessage: HL7Message, accepted: boolean, errorMessage?: string): string {
    const timestamp = this.formatHL7DateTime(new Date())
    const messageControlId = `ACK${Date.now()}`
    
    const segments: string[] = []
    
    // MSH
    segments.push(
      `MSH|^~\\&|HealthCare|Clinica|${originalMessage.sendingApp}|${originalMessage.sendingFacility}|${timestamp}||ACK^${originalMessage.type}|${messageControlId}|P|2.5`
    )
    
    // MSA - Message Acknowledgment
    const ackCode = accepted ? 'AA' : 'AE' // AA=Accept, AE=Error, AR=Reject
    segments.push(
      `MSA|${ackCode}|${originalMessage.messageControlId}${errorMessage ? '|' + errorMessage : ''}`
    )
    
    return segments.join('\r')
  }
  
  // ============ FHIR CONVERSION ============
  
  /**
   * Converte pedido interno para FHIR ServiceRequest
   */
  toFHIRServiceRequest(order: LabOrder): FHIRServiceRequest[] {
    return order.exams.map(exam => ({
      resourceType: 'ServiceRequest',
      id: order.id,
      status: 'active',
      intent: 'order',
      code: {
        coding: [{
          system: 'http://loinc.org', // ou TUSS/CBHPM
          code: exam.code,
          display: exam.name
        }]
      },
      subject: {
        reference: `Patient/${order.patientId}`,
        display: order.patientName
      },
      requester: {
        reference: `Practitioner/${order.doctorId}`,
        display: order.doctorName
      },
      authoredOn: order.createdAt.toISOString(),
      note: order.notes ? [{ text: order.notes }] : undefined
    }))
  }
  
  /**
   * Converte FHIR DiagnosticReport para resultado interno
   */
  fromFHIRDiagnosticReport(report: FHIRDiagnosticReport, orderId: string): LabResult {
    const coding = report.code.coding[0]
    
    // Extract PDF if present
    let pdfReport: string | undefined
    if (report.presentedForm?.length) {
      const pdf = report.presentedForm.find(f => f.contentType === 'application/pdf')
      if (pdf) {
        pdfReport = pdf.data
      }
    }
    
    return {
      orderId,
      examCode: coding?.code || '',
      examName: coding?.display || '',
      status: report.status === 'final' ? 'final' : report.status === 'preliminary' ? 'preliminary' : 'pending',
      interpretation: report.conclusion,
      performedAt: new Date(report.effectiveDateTime),
      reportedAt: new Date(report.issued),
      pdfReport
    }
  }
  
  // ============ DATABASE OPERATIONS ============
  
  /**
   * Envia pedido de exame para o laboratório
   */
  async sendOrder(examRequestId: string, labEndpoint?: string): Promise<{ success: boolean; messageId: string; error?: string }> {
    try {
      // Buscar pedido no banco
      const examRequest = await prisma.examRequest.findUnique({
        where: { id: examRequestId },
        include: {
          patient: {
            select: { id: true, name: true, cpf: true, birthDate: true }
          },
          doctor: {
            select: { id: true, name: true }
          }
        }
      })
      
      if (!examRequest) {
        throw new Error('Pedido de exame não encontrado')
      }
      
      // Montar estrutura LabOrder
      const order: LabOrder = {
        id: examRequest.id,
        patientId: examRequest.patient.id,
        patientName: examRequest.patient.name,
        patientCpf: examRequest.patient.cpf || undefined,
        patientBirthDate: examRequest.patient.birthDate || undefined,
        doctorId: examRequest.doctor.id,
        doctorName: examRequest.doctor.name,
        exams: [{
          code: examRequest.examType,
          name: examRequest.description || examRequest.examType,
          instructions: examRequest.notes || undefined
        }],
        priority: examRequest.urgency === 'EMERGENCY' ? 'stat' : examRequest.urgency === 'URGENT' ? 'urgent' : 'routine',
        notes: examRequest.notes || undefined,
        createdAt: examRequest.createdAt
      }
      
      // Gerar mensagem HL7
      const hl7Message = this.generateORM(order)
      
      // Se endpoint configurado, enviar (placeholder)
      if (labEndpoint) {
        // TODO: Implementar envio real via MLLP ou HTTP
        logger.info(`[LabIntegration] Enviando pedido ${examRequest.id} para ${labEndpoint}`)
      }
      
      // Atualizar status do pedido
      await prisma.examRequest.update({
        where: { id: examRequestId },
        data: { status: 'REQUESTED' }
      })
      
      return {
        success: true,
        messageId: `MSG${Date.now()}`
      }
    } catch (error) {
      logger.error(`[LabIntegration] Erro ao enviar pedido:`, error)
      return {
        success: false,
        messageId: '',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }
    }
  }
  
  /**
   * Processa resultado recebido do laboratório
   */
  async processResult(payload: LabWebhookPayload): Promise<{ success: boolean; processedCount: number; error?: string }> {
    try {
      let results: LabResult[] = []
      
      if (payload.format === 'hl7v2') {
        // Parse HL7 v2.x
        const message = this.parseHL7v2(payload.content as string)
        
        if (message.type !== 'ORU') {
          throw new Error(`Tipo de mensagem não suportado: ${message.type}`)
        }
        
        results = this.parseORU(message)
      } else if (payload.format === 'fhir') {
        // Parse FHIR DiagnosticReport
        const report = payload.content as FHIRDiagnosticReport
        const orderId = report.id || 'unknown'
        results = [this.fromFHIRDiagnosticReport(report, orderId)]
      }
      
      // Processar cada resultado
      let processedCount = 0
      for (const result of results) {
        try {
          const saved = await this.saveResult(result)
          await this.notifyPatient(saved)
          processedCount++
        } catch (err) {
          logger.error(`[LabIntegration] Erro ao processar resultado:`, err)
        }
      }
      
      return { success: true, processedCount }
    } catch (error) {
      logger.error(`[LabIntegration] Erro ao processar payload:`, error)
      return {
        success: false,
        processedCount: 0,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }
    }
  }
  
  /**
   * Salva resultado no banco
   */
  private async saveResult(result: LabResult): Promise<{ id: string; patientId: string; patientName: string; patientEmail?: string; patientPhone?: string }> {
    // Buscar pedido original pelo ID
    const examRequest = await prisma.examRequest.findFirst({
      where: {
        id: result.orderId
      },
      include: {
        patient: {
          select: { id: true, name: true, email: true, phone: true }
        }
      }
    })

    if (!examRequest) {
      logger.warn(`[LabIntegration] Pedido ${result.orderId} não encontrado`)
      throw new Error('Pedido não encontrado')
    }

    // Criar ExamResult com campos existentes no schema
    const examResult = await prisma.examResult.create({
      data: {
        patientId: examRequest.patientId,
        examType: result.examName,
        results: JSON.stringify({
          value: result.resultValue,
          unit: result.unit,
          referenceRange: result.referenceRange,
          abnormalFlag: result.abnormalFlag,
          interpretation: result.interpretation,
          performingLab: result.performingLab
        }),
        examDate: result.performedAt,
        sourceDocument: result.pdfReport ? 'PDF_ATTACHED' : undefined
      }
    })

    // Atualizar status do pedido
    await prisma.examRequest.update({
      where: { id: examRequest.id },
      data: { 
        status: 'COMPLETED',
        completedDate: new Date(),
        results: result.resultValue || 'Ver detalhes'
      }
    })

    return {
      id: examResult.id,
      patientId: examRequest.patient.id,
      patientName: examRequest.patient.name,
      patientEmail: examRequest.patient.email || undefined,
      patientPhone: examRequest.patient.phone || undefined
    }
  }

  /**
   * Notifica paciente sobre resultado disponível
   */
  private async notifyPatient(exam: { id: string; patientId: string; patientName: string; patientEmail?: string; patientPhone?: string }): Promise<void> {
    try {
      await NotificationSender.sendExamResultReady({
        patientId: exam.patientId,
        patientName: exam.patientName,
        patientEmail: exam.patientEmail,
        patientPhone: exam.patientPhone,
        examName: 'Resultado de Exame',
        examDate: new Date(),
        resultId: exam.id
      })
    } catch (error) {
      logger.error(`[LabIntegration] Erro ao notificar paciente:`, error)
    }
  }
  
  // ============ HELPER METHODS ============
  
  private parseHL7DateTime(value: string): Date {
    if (!value || value.length < 8) return new Date()
    
    const year = parseInt(value.substring(0, 4))
    const month = parseInt(value.substring(4, 6)) - 1
    const day = parseInt(value.substring(6, 8))
    const hour = value.length >= 10 ? parseInt(value.substring(8, 10)) : 0
    const minute = value.length >= 12 ? parseInt(value.substring(10, 12)) : 0
    const second = value.length >= 14 ? parseInt(value.substring(12, 14)) : 0
    
    return new Date(year, month, day, hour, minute, second)
  }
  
  private formatHL7DateTime(date: Date): string {
    return date.toISOString().replace(/[-:T]/g, '').substring(0, 14)
  }
  
  private formatHL7Date(date: Date): string {
    return date.toISOString().replace(/-/g, '').substring(0, 8)
  }
  
  /**
   * Verifica conectividade com laboratório via MLLP (placeholder)
   */
  async checkConnection(_labEndpoint: string): Promise<{ connected: boolean; latency?: number; error?: string }> {
    // TODO: Implementar verificação MLLP real
    return {
      connected: false,
      error: 'Verificação MLLP não implementada'
    }
  }
  
  /**
   * Lista resultados pendentes de sincronização
   */
  async getPendingResults(): Promise<number> {
    return await prisma.examRequest.count({
      where: {
        status: 'REQUESTED'
      }
    })
  }
}

// Singleton export
export const LabIntegrationService = new LabIntegrationServiceClass()

// Default export
export default LabIntegrationService
