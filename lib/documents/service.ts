/**
 * Serviço Unificado de Documentos Médicos
 * 
 * Integra geração, validação e assinatura de documentos médicos
 * em conformidade com CFM 2.299/2021, Portaria 344/98 e Lei 9.787/99
 * 
 * @module lib/documents/service
 */

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { 
  MedicalDocumentType,
  PrescriptionDocument,
  MedicalCertificateDocument,
  ReferralDocument,
  ExamRequestDocument,
  DoctorInfo,
  PatientInfo,
  MedicationItem,
  ExamItem,
  SignatureInfo,
  MedicalReportDocument,
} from './types'
import {
  validatePrescription,
  validateCertificate,
  validateReferral,
  validateExamRequest,
  classifyMedication,
  numberToWords,
} from './validator'
import {
  generatePrescriptionPdf,
  generateCertificatePdf,
  generateReferralPdf,
  generateExamRequestPdf,
} from './pdf-generator'
import {
  signPdfWithPAdES,
  extractCertificateInfo,
  isPdfSigned,
} from './pades-signer'
import { getCertificatePassword } from '@/lib/certificate-session'
import crypto from 'crypto'
import path from 'path'
import fs from 'fs/promises'

// ============================================
// TIPOS INTERNOS
// ============================================

// Opções de assinatura - senha fornecida pelo usuário ou usa sessão ativa
interface SigningCredentials {
  certificatePassword?: string  // Senha explícita (opcional se tiver sessão ativa)
}

interface CreatePrescriptionInput extends SigningCredentials {
  doctorId: string
  patientId: string
  usageType: 'INTERNAL' | 'EXTERNAL' | 'BOTH' | 'TOPICAL'
  medications: {
    genericName: string
    brandName?: string
    concentration: string
    pharmaceuticalForm: string
    quantity: number
    quantityUnit: string
    dosage: string
    route: string
    frequency: string
    duration: string
    maxDailyDose?: string
    instructions?: string
  }[]
  notes?: string
}

interface CreateCertificateInput extends SigningCredentials {
  doctorId: string
  patientId: string
  certificateType: 'MEDICAL_LEAVE' | 'FITNESS' | 'ACCOMPANIMENT' | 'TIME_OFF' | 'CUSTOM'
  title?: string
  content: string
  days?: number
  startDate: Date
  endDate?: Date
  includeCid: boolean  // Obrigatório por lei - paciente deve ser informado
  cidCode?: string
  cidDescription?: string
}

interface CreateReferralInput extends SigningCredentials {
  doctorId: string
  patientId: string
  targetSpecialty: string
  targetDoctor?: string
  targetUnit?: string
  priority: 'ROUTINE' | 'URGENT' | 'EMERGENCY'
  reason: string
  clinicalHistory?: string
  diagnosticHypothesis?: string
  cidCode?: string
  currentMedications?: string
  examsAttached?: string[]
  notes?: string
}

interface CreateExamRequestInput extends SigningCredentials {
  doctorId: string
  patientId: string
  exams: {
    name: string
    code?: string
    material?: string
    notes?: string
  }[]
  priority: 'ROUTINE' | 'URGENT' | 'EMERGENCY'
  clinicalIndication: string
  diagnosticHypothesis?: string
  cidCode?: string
  preparation?: string
  notes?: string
}

interface DocumentResult<T> {
  success: boolean
  document?: T
  signedPdf?: Buffer
  unsigned?: boolean     // Indica se documento foi gerado mas não assinado
  errors?: string[]
  documentId?: string
  verificationUrl?: string
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

async function getDoctorInfo(doctorId: string): Promise<DoctorInfo | null> {
  const user = await prisma.user.findUnique({
    where: { id: doctorId },
    include: {
      digitalCertificates: {
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  })
  
  if (!user) return null
  
  // Extrair CRM e estado
  let crm = user.crmNumber || user.licenseNumber || ''
  let crmState = user.licenseState || ''
  
  // Tentar extrair do formato "CRM-XX 12345" ou "12345/XX"
  const crmMatch = crm.match(/CRM[-\s]?([A-Z]{2})[\s-]?(\d+)/i) || crm.match(/(\d+)[\/\s-]([A-Z]{2})/i)
  if (crmMatch) {
    if (crmMatch[1].length === 2 && isNaN(Number(crmMatch[1]))) {
      crmState = crmMatch[1].toUpperCase()
      crm = crmMatch[2]
    } else {
      crm = crmMatch[1]
      crmState = crmMatch[2].toUpperCase()
    }
  }
  
  // Se não conseguiu extrair o estado, usar padrão
  if (!crmState) {
    crmState = 'SP' // Padrão, deveria vir do cadastro
  }
  
  // Obter certificado digital
  const cert = user.digitalCertificates?.[0]
  
  return {
    name: user.name || 'Médico',
    crm: crm.replace(/\D/g, ''),
    crmState,
    specialty: user.speciality || undefined,
    rqe: undefined, // Adicionar ao User model se necessário
    cpf: undefined, // Adicionar ao User model se necessário
    address: '', // Deve vir do perfil ou clínica
    city: '', // Deve vir do perfil ou clínica
    phone: user.phone || undefined,
    email: user.email || undefined,
    clinicName: undefined, // Deve vir da organização
    clinicCnpj: undefined,
    // Dados do certificado (usado internamente, não faz parte de DoctorInfo exposto)
    _certificatePath: cert?.pfxFilePath || undefined,
  } as DoctorInfo & { _certificatePath?: string }
}

async function getPatientInfo(patientId: string): Promise<PatientInfo | null> {
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
  })
  
  if (!patient) return null
  
  return {
    name: patient.name,
    documentType: 'CPF',
    documentNumber: patient.cpf || '',
    birthDate: patient.birthDate ? new Date(patient.birthDate) : undefined,
    age: patient.birthDate ? calculateAge(new Date(patient.birthDate)) : undefined,
    address: patient.address || undefined,
    phone: patient.phone || undefined,
  }
}

function calculateAge(birthDate: Date): number {
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return age
}

function generateDocumentId(): string {
  return crypto.randomUUID()
}

function generateSequenceNumber(): string {
  // Gera um número sequencial baseado no timestamp
  const now = new Date()
  const year = now.getFullYear()
  const seq = Math.floor(Date.now() / 1000) % 1000000
  return `${seq}/${year}`
}

function getVerificationUrl(documentId: string, documentType: MedicalDocumentType): string {
  const baseUrl = process.env.NEXTAUTH_URL || process.env.APP_URL || 'http://localhost:3000'
  return `${baseUrl}/verify/${documentType.toLowerCase()}/${documentId}`
}

async function getDoctorCertificate(doctorId: string, password?: string): Promise<{
  pfxFilePath: string
  passphrase: string
  certificateId: string
} | null> {
  const cert = await prisma.digitalCertificate.findFirst({
    where: { userId: doctorId, isActive: true },
    orderBy: { createdAt: 'desc' },
  })
  
  if (!cert?.pfxFilePath) {
    return null
  }
  
  // 1. Se senha fornecida explicitamente, validar e usar
  if (password) {
    const passwordHash = crypto
      .createHash('sha256')
      .update(password)
      .digest('hex')
    
    if (cert.pfxPasswordHash && passwordHash !== cert.pfxPasswordHash) {
      logger.warn('Senha do certificado incorreta')
      return null
    }
    
    return {
      pfxFilePath: cert.pfxFilePath,
      passphrase: password,
      certificateId: cert.id,
    }
  }
  
  // 2. Tentar usar sessão de certificado ativa
  const sessionPassword = await getCertificatePassword(doctorId)
  
  if (sessionPassword) {
    logger.info('Usando sessão de certificado ativa')
    return {
      pfxFilePath: cert.pfxFilePath,
      passphrase: sessionPassword,
      certificateId: cert.id,
    }
  }
  
  // 3. Sem senha e sem sessão - não pode assinar
  logger.info('Certificado encontrado mas sem sessão ativa - documento não será assinado')
  return null
}

// ============================================
// SERVIÇO DE PRESCRIÇÃO
// ============================================

export async function createPrescription(
  input: CreatePrescriptionInput
): Promise<DocumentResult<PrescriptionDocument>> {
  try {
    // Obter dados do médico e paciente
    const [doctor, patient] = await Promise.all([
      getDoctorInfo(input.doctorId),
      getPatientInfo(input.patientId),
    ])
    
    if (!doctor) {
      return { success: false, errors: ['Médico não encontrado'] }
    }
    
    if (!patient) {
      return { success: false, errors: ['Paciente não encontrado'] }
    }
    
    // Preparar medicamentos com quantidade por extenso para controlados
    const medications: MedicationItem[] = input.medications.map(med => {
      const classification = classifyMedication(med.genericName)
      return {
        genericName: med.genericName,
        brandName: med.brandName,
        concentration: med.concentration,
        pharmaceuticalForm: med.pharmaceuticalForm as MedicationItem['pharmaceuticalForm'],
        quantity: med.quantity,
        quantityUnit: med.quantityUnit,
        quantityWritten: classification.isControlled ? numberToWords(med.quantity) : undefined,
        dosage: med.dosage,
        route: med.route as MedicationItem['route'],
        frequency: med.frequency,
        duration: med.duration,
        maxDailyDose: med.maxDailyDose,
        instructions: med.instructions,
        isControlled: classification.isControlled,
        controlledType: classification.controlledType,
        isAntimicrobial: classification.isAntimicrobial,
      }
    })
    
    // Montar documento
    const prescriptionId = generateDocumentId()
    const now = new Date()
    
    // Determinar tipo da prescrição
    const hasControlled = medications.some(m => m.isControlled)
    const hasAntimicrobial = medications.some(m => m.isAntimicrobial)
    const prescriptionType: 'PRESCRIPTION' | 'CONTROLLED_PRESCRIPTION' | 'ANTIMICROBIAL_PRESCRIPTION' = 
      hasControlled ? 'CONTROLLED_PRESCRIPTION' :
      hasAntimicrobial ? 'ANTIMICROBIAL_PRESCRIPTION' : 'PRESCRIPTION'
    
    const prescription: PrescriptionDocument = {
      type: prescriptionType,
      prescriptionId,
      doctor,
      patient,
      issuedAt: now,
      usageType: input.usageType,
      medications,
      notes: input.notes,
      validUntil: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 dias
    }
    
    // Validar documento
    const validation = validatePrescription(prescription)
    if (!validation.valid) {
      return { 
        success: false, 
        errors: validation.errors?.map(e => e.message),
        document: prescription,
      }
    }
    
    // Gerar PDF
    const verificationUrl = getVerificationUrl(prescriptionId, 'PRESCRIPTION')
    const pdfBuffer = await generatePrescriptionPdf(prescription, verificationUrl)
    
    // Verificar se tem certificado para assinar
    let signedPdf = pdfBuffer
    let documentSigned = false
    const certificate = await getDoctorCertificate(input.doctorId, input.certificatePassword)
    
    if (certificate) {
      try {
        const signResult = await signPdfWithPAdES(
          pdfBuffer,
          certificate.pfxFilePath,
          certificate.passphrase,
          {
            reason: 'Prescrição médica assinada digitalmente',
            location: doctor.city || 'Brasil',
            name: doctor.name,
          }
        )
        
        if (signResult.signedPdf) {
          signedPdf = signResult.signedPdf
          documentSigned = true
          
          // Atualizar estatísticas de uso do certificado
          await prisma.digitalCertificate.update({
            where: { id: certificate.certificateId },
            data: {
              lastUsedAt: new Date(),
              usageCount: { increment: 1 },
            },
          })
        } else {
          logger.warn('Falha ao assinar prescrição')
        }
      } catch (error) {
        logger.error('Erro ao assinar prescrição:', error)
      }
    }
    
    // Salvar no banco - o modelo Prescription é simples
    // Para múltiplos medicamentos, criar uma prescrição para cada ou usar PrescriptionItem
    const firstMed = input.medications[0]
    
    const dbPrescription = await prisma.prescription.create({
      data: {
        id: prescriptionId,
        patientId: input.patientId,
        doctorId: input.doctorId,
        status: 'ACTIVE',
        medication: firstMed.genericName,
        dosage: firstMed.dosage,
        frequency: firstMed.frequency,
        duration: firstMed.duration,
        instructions: input.notes || firstMed.instructions,
        startDate: now,
        endDate: prescription.validUntil,
        digitalSignature: signedPdf.toString('base64').substring(0, 500), // Salvar início como referência
      },
    })
    
    // Salvar medicamentos adicionais em PrescriptionItem
    for (const med of input.medications) {
      await prisma.prescriptionItem.create({
        data: {
          prescriptionId,
          customName: `${med.genericName}${med.brandName ? ` (${med.brandName})` : ''} - ${med.concentration} ${med.pharmaceuticalForm}`,
          quantity: med.quantity,
          dosage: med.dosage,
          frequency: med.frequency,
          duration: med.duration,
          instructions: med.instructions,
        },
      })
    }
    
    // Salvar documento assinado
    await saveSignedDocument(prescriptionId, 'PRESCRIPTION', signedPdf, input.doctorId)
    
    return {
      success: true,
      document: prescription,
      signedPdf,
      unsigned: !documentSigned,
      documentId: prescriptionId,
      verificationUrl,
    }
    
  } catch (error) {
    logger.error('Erro ao criar prescrição:', error)
    return { 
      success: false, 
      errors: ['Erro interno ao criar prescrição'] 
    }
  }
}

// ============================================
// SERVIÇO DE ATESTADO
// ============================================

export async function createCertificate(
  input: CreateCertificateInput
): Promise<DocumentResult<MedicalCertificateDocument>> {
  try {
    const [doctor, patient] = await Promise.all([
      getDoctorInfo(input.doctorId),
      getPatientInfo(input.patientId),
    ])
    
    if (!doctor) {
      return { success: false, errors: ['Médico não encontrado'] }
    }
    
    if (!patient) {
      return { success: false, errors: ['Paciente não encontrado'] }
    }
    
    const certificateId = generateDocumentId()
    const now = new Date()
    const seq = generateSequenceNumber()
    
    // Título padrão por tipo
    const defaultTitles: Record<string, string> = {
      MEDICAL_LEAVE: 'ATESTADO MÉDICO',
      FITNESS: 'ATESTADO DE APTIDÃO',
      ACCOMPANIMENT: 'ATESTADO DE ACOMPANHANTE',
      TIME_OFF: 'ATESTADO DE COMPARECIMENTO',
      CUSTOM: input.title || 'ATESTADO MÉDICO',
    }
    
    const certificate: MedicalCertificateDocument = {
      type: 'MEDICAL_CERTIFICATE',
      certificateId,
      doctor,
      patient,
      issuedAt: now,
      certificateType: input.certificateType,
      title: input.title || defaultTitles[input.certificateType],
      sequenceNumber: parseInt(seq.split('/')[0]),
      year: now.getFullYear(),
      content: input.content,
      days: input.days,
      startDate: input.startDate,
      endDate: input.endDate,
      includeCid: input.includeCid,
      cidCode: input.cidCode,
      cidDescription: input.cidDescription,
    }
    
    // Validar
    const validation = validateCertificate(certificate)
    if (!validation.valid) {
      return {
        success: false,
        errors: validation.errors?.map(e => e.message),
        document: certificate,
      }
    }
    
    // Gerar PDF
    const verificationUrl = getVerificationUrl(certificateId, 'MEDICAL_CERTIFICATE')
    const pdfBuffer = await generateCertificatePdf(certificate, verificationUrl)
    
    // Assinar
    let signedPdf = pdfBuffer
    const digitalCert = await getDoctorCertificate(input.doctorId, input.certificatePassword)
    
    if (digitalCert) {
      try {
        const signResult = await signPdfWithPAdES(
          pdfBuffer,
          digitalCert.pfxFilePath,
          digitalCert.passphrase,
          {
            reason: 'Atestado médico assinado digitalmente',
            location: doctor.city || 'Brasil',
            name: doctor.name,
          }
        )
        
        if (signResult.signedPdf) {
          signedPdf = signResult.signedPdf
        }
      } catch (error) {
        logger.error('Erro ao assinar atestado:', error)
      }
    }
    
    // Salvar no banco
    // Obter próximo número sequencial
    const lastCert = await prisma.medicalCertificate.findFirst({
      where: { year: now.getFullYear() },
      orderBy: { sequenceNumber: 'desc' },
    })
    const nextSequence = (lastCert?.sequenceNumber || 0) + 1
    
    await prisma.medicalCertificate.create({
      data: {
        id: certificateId,
        patientId: input.patientId,
        doctorId: input.doctorId,
        sequenceNumber: nextSequence,
        year: now.getFullYear(),
        type: input.certificateType,
        title: certificate.title,
        content: input.content,
        days: input.days,
        startDate: input.startDate,
        endDate: input.endDate,
        includeCid: input.includeCid,
        cidCode: input.cidCode,
        cidDescription: input.cidDescription,
        issuedAt: now,
        pdfPath: `documents/${certificateId}.pdf`,
        pdfHash: crypto.createHash('sha256').update(signedPdf).digest('hex'),
        signatureMethod: digitalCert ? 'ICP_BRASIL' : 'NONE',
        digitalSignature: signedPdf.toString('base64'),
      },
    })
    
    await saveSignedDocument(certificateId, 'MEDICAL_CERTIFICATE', signedPdf, input.doctorId)
    
    return {
      success: true,
      document: certificate,
      signedPdf,
      documentId: certificateId,
      verificationUrl,
    }
    
  } catch (error) {
    logger.error('Erro ao criar atestado:', error)
    return { success: false, errors: ['Erro interno ao criar atestado'] }
  }
}

// ============================================
// SERVIÇO DE ENCAMINHAMENTO
// ============================================

export async function createReferral(
  input: CreateReferralInput
): Promise<DocumentResult<ReferralDocument>> {
  try {
    const [doctor, patient] = await Promise.all([
      getDoctorInfo(input.doctorId),
      getPatientInfo(input.patientId),
    ])
    
    if (!doctor) {
      return { success: false, errors: ['Médico não encontrado'] }
    }
    
    if (!patient) {
      return { success: false, errors: ['Paciente não encontrado'] }
    }
    
    const referralId = generateDocumentId()
    const now = new Date()
    
    const referral: ReferralDocument = {
      type: 'REFERRAL',
      referralId,
      doctor,
      patient,
      issuedAt: now,
      targetSpecialty: input.targetSpecialty,
      targetDoctor: input.targetDoctor,
      targetUnit: input.targetUnit,
      priority: input.priority,
      reason: input.reason,
      clinicalHistory: input.clinicalHistory,
      diagnosticHypothesis: input.diagnosticHypothesis,
      cidCode: input.cidCode,
      currentMedications: input.currentMedications,
    }
    
    // Validar
    const validation = validateReferral(referral)
    if (!validation.valid) {
      return {
        success: false,
        errors: validation.errors?.map(e => e.message),
        document: referral,
      }
    }
    
    // Gerar PDF
    const verificationUrl = getVerificationUrl(referralId, 'REFERRAL')
    const pdfBuffer = await generateReferralPdf(referral, verificationUrl)
    
    // Assinar
    let signedPdf = pdfBuffer
    const digitalCert = await getDoctorCertificate(input.doctorId, input.certificatePassword)
    
    if (digitalCert) {
      try {
        const signResult = await signPdfWithPAdES(
          pdfBuffer,
          digitalCert.pfxFilePath,
          digitalCert.passphrase,
          {
            reason: 'Encaminhamento médico assinado digitalmente',
            location: doctor.city || 'Brasil',
            name: doctor.name,
          }
        )
        
        if (signResult.signedPdf) {
          signedPdf = signResult.signedPdf
        }
      } catch (error) {
        logger.error('Erro ao assinar encaminhamento:', error)
      }
    }
    
    // Salvar no banco
    await prisma.referral.create({
      data: {
        id: referralId,
        patientId: input.patientId,
        doctorId: input.doctorId,
        specialty: input.targetSpecialty,
        destinationDoctorId: undefined, // Seria preciso buscar pelo nome
        priority: input.priority,
        description: input.reason,
        notes: input.clinicalHistory,
        urgencyLevel: input.priority,
        status: 'PENDING',
      },
    })
    
    await saveSignedDocument(referralId, 'REFERRAL', signedPdf, input.doctorId)
    
    return {
      success: true,
      document: referral,
      signedPdf,
      documentId: referralId,
      verificationUrl,
    }
    
  } catch (error) {
    logger.error('Erro ao criar encaminhamento:', error)
    return { success: false, errors: ['Erro interno ao criar encaminhamento'] }
  }
}

// ============================================
// SERVIÇO DE SOLICITAÇÃO DE EXAMES
// ============================================

export async function createExamRequest(
  input: CreateExamRequestInput
): Promise<DocumentResult<ExamRequestDocument>> {
  try {
    const [doctor, patient] = await Promise.all([
      getDoctorInfo(input.doctorId),
      getPatientInfo(input.patientId),
    ])
    
    if (!doctor) {
      return { success: false, errors: ['Médico não encontrado'] }
    }
    
    if (!patient) {
      return { success: false, errors: ['Paciente não encontrado'] }
    }
    
    const requestId = generateDocumentId()
    const now = new Date()
    
    const examRequest: ExamRequestDocument = {
      type: 'EXAM_REQUEST',
      requestId,
      doctor,
      patient,
      issuedAt: now,
      exams: input.exams.map(e => ({
        name: e.name,
        code: e.code,
        material: e.material,
        notes: e.notes,
      })),
      priority: input.priority,
      clinicalIndication: input.clinicalIndication,
      diagnosticHypothesis: input.diagnosticHypothesis,
      cidCode: input.cidCode,
    }
    
    // Validar
    const validation = validateExamRequest(examRequest)
    if (!validation.valid) {
      return {
        success: false,
        errors: validation.errors?.map(e => e.message),
        document: examRequest,
      }
    }
    
    // Gerar PDF
    const verificationUrl = getVerificationUrl(requestId, 'EXAM_REQUEST')
    const pdfBuffer = await generateExamRequestPdf(examRequest, verificationUrl)
    
    // Assinar
    let signedPdf = pdfBuffer
    const digitalCert = await getDoctorCertificate(input.doctorId, input.certificatePassword)
    
    if (digitalCert) {
      try {
        const signResult = await signPdfWithPAdES(
          pdfBuffer,
          digitalCert.pfxFilePath,
          digitalCert.passphrase,
          {
            reason: 'Solicitação de exames assinada digitalmente',
            location: doctor.city || 'Brasil',
            name: doctor.name,
          }
        )
        
        if (signResult.signedPdf) {
          signedPdf = signResult.signedPdf
        }
      } catch (error) {
        logger.error('Erro ao assinar solicitação:', error)
      }
    }
    
    // Salvar no banco - criar ExamRequest para cada exame
    // O modelo usa 'urgency' com enum Urgency e 'status' com enum ExamStatus
    const urgencyMap: Record<string, string> = {
      'ROUTINE': 'ROUTINE',
      'URGENT': 'URGENT', 
      'EMERGENCY': 'EMERGENCY',
    }
    
    for (const exam of input.exams) {
      await prisma.examRequest.create({
        data: {
          patientId: input.patientId,
          doctorId: input.doctorId,
          examType: exam.name,
          description: input.clinicalIndication,
          urgency: urgencyMap[input.priority] as 'ROUTINE' | 'URGENT' | 'EMERGENCY',
          status: 'REQUESTED',
          notes: exam.notes,
        },
      })
    }
    
    await saveSignedDocument(requestId, 'EXAM_REQUEST', signedPdf, input.doctorId)
    
    return {
      success: true,
      document: examRequest,
      signedPdf,
      documentId: requestId,
      verificationUrl,
    }
    
  } catch (error) {
    logger.error('Erro ao criar solicitação de exames:', error)
    return { success: false, errors: ['Erro interno ao criar solicitação'] }
  }
}

// ============================================
// SALVAR DOCUMENTO ASSINADO
// ============================================

async function saveSignedDocument(
  documentId: string,
  documentType: MedicalDocumentType,
  pdfBuffer: Buffer,
  doctorId: string
): Promise<string | null> {
  try {
    // Salvar arquivo em disco
    const uploadsDir = path.join(process.cwd(), 'uploads', 'documents', documentType.toLowerCase())
    await fs.mkdir(uploadsDir, { recursive: true })
    
    const filename = `${documentId}.pdf`
    const filepath = path.join(uploadsDir, filename)
    await fs.writeFile(filepath, pdfBuffer)
    
    // Hash do documento
    const hash = crypto.createHash('sha256').update(pdfBuffer).digest('hex')
    
    // Verificar se tem certificado digital
    const certificate = await prisma.digitalCertificate.findFirst({
      where: { userId: doctorId, isActive: true },
      orderBy: { createdAt: 'desc' },
    })
    
    if (!certificate) {
      logger.warn(`Médico ${doctorId} não tem certificado digital ativo`)
      return filepath // Retorna só o caminho, sem registro de assinatura
    }
    
    // Mapear tipo de documento para enum do Prisma
    const docTypeMap: Record<string, string> = {
      'PRESCRIPTION': 'PRESCRIPTION',
      'MEDICAL_CERTIFICATE': 'MEDICAL_CERTIFICATE',
      'REFERRAL': 'REFERRAL',
      'EXAM_REQUEST': 'EXAM_REQUEST',
      'MEDICAL_REPORT': 'MEDICAL_REPORT',
    }
    
    // Salvar registro no banco
    await prisma.signedDocument.create({
      data: {
        documentType: (docTypeMap[documentType] || 'OTHER') as any,
        documentId,
        certificateId: certificate.id,
        signerId: doctorId,
        signatureAlgorithm: 'SHA256withRSA',
        signatureValue: pdfBuffer.toString('base64').substring(0, 1000), // Apenas início para referência
        signatureHash: hash,
        signedAt: new Date(),
        isValid: true,
      },
    })
    
    logger.info(`Documento salvo: ${documentType} ${documentId}`)
    return filepath
    
  } catch (error) {
    logger.error('Erro ao salvar documento:', error)
    // Não throw - permite continuar mesmo sem salvar assinatura
    return null
  }
}

// ============================================
// VERIFICAR DOCUMENTO
// ============================================

export async function verifyDocument(documentId: string): Promise<{
  valid: boolean
  document?: {
    type: MedicalDocumentType
    signedAt: Date
    signerName: string
    signatureValid: boolean
  }
  error?: string
}> {
  try {
    const doc = await prisma.signedDocument.findFirst({
      where: { documentId },
      include: {
        signer: { select: { name: true } },
      },
    })
    
    if (!doc) {
      return { valid: false, error: 'Documento não encontrado' }
    }
    
    // Tentar ler o arquivo
    const uploadsDir = path.join(process.cwd(), 'uploads', 'documents', doc.documentType.toLowerCase())
    const filepath = path.join(uploadsDir, `${documentId}.pdf`)
    
    let fileValid = false
    try {
      const fileBuffer = await fs.readFile(filepath)
      const currentHash = crypto.createHash('sha256').update(fileBuffer).digest('hex')
      fileValid = currentHash === doc.signatureHash
    } catch {
      // Arquivo não encontrado
    }
    
    return {
      valid: doc.isValid && fileValid,
      document: {
        type: doc.documentType as MedicalDocumentType,
        signedAt: doc.signedAt,
        signerName: doc.signer?.name || 'Desconhecido',
        signatureValid: doc.isValid,
      },
    }
    
  } catch (error) {
    logger.error('Erro ao verificar documento:', error)
    return { valid: false, error: 'Erro ao verificar documento' }
  }
}

// ============================================
// OBTER DOCUMENTO ASSINADO
// ============================================

export async function getSignedDocument(
  documentId: string, 
  userId?: string
): Promise<{
  success: boolean
  pdf?: Buffer
  fileName?: string
  documentType?: string
  error?: string
}> {
  try {
    const doc = await prisma.signedDocument.findFirst({
      where: { documentId },
      include: {
        signer: { select: { id: true, name: true } },
      },
    })
    
    if (!doc) {
      return { success: false, error: 'Documento não encontrado' }
    }
    
    // Verificar acesso: deve ser o médico que assinou
    // (paciente pode acessar via link de verificação público)
    if (userId && doc.signer.id !== userId) {
      // Verificar se é admin ou owner
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      })
      
      if (!user || !['ADMIN', 'OWNER'].includes(user.role)) {
        return { success: false, error: 'Acesso não autorizado' }
      }
    }
    
    const uploadsDir = path.join(process.cwd(), 'uploads', 'documents', doc.documentType.toLowerCase())
    const filepath = path.join(uploadsDir, `${documentId}.pdf`)
    
    const pdf = await fs.readFile(filepath)
    
    // Gerar nome do arquivo
    const signerName = doc.signer.name.replace(/\s+/g, '_').substring(0, 20)
    const dateStr = new Date().toISOString().split('T')[0]
    const fileName = `${doc.documentType.toLowerCase()}_${signerName}_${dateStr}.pdf`
    
    return {
      success: true,
      pdf,
      fileName,
      documentType: doc.documentType,
    }
    
  } catch (error) {
    logger.error('Erro ao obter documento:', error)
    return { success: false, error: 'Erro ao acessar documento' }
  }
}

// ============================================
// EXPORTS
// ============================================

export {
  getDoctorInfo,
  getPatientInfo,
  generateDocumentId,
  getVerificationUrl,
}

