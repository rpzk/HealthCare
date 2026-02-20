/**
 * Módulo Unificado de Documentos Médicos
 * 
 * Sistema de geração, validação e assinatura digital de documentos médicos
 * em conformidade com a legislação brasileira.
 * 
 * ## Legislação Atendida
 * - CFM 2.299/2021 - Prescrição eletrônica e telemedicina
 * - Portaria 344/98 - Medicamentos controlados
 * - Lei 9.787/99 - Medicamentos genéricos (DCB)
 * - RDC 20/2011 - Antimicrobianos
 * - ICP-Brasil - Certificação digital
 * 
 * ## Estrutura do Módulo
 * 
 * ```
 * lib/documents/
 * ├── index.ts         # Este arquivo (exports centralizados)
 * ├── types.ts         # Definições de tipos TypeScript
 * ├── validator.ts     # Validação conforme legislação
 * ├── pades-signer.ts  # Assinatura digital PAdES
 * ├── pdf-generator.ts # Geração de PDFs
 * └── service.ts       # Serviço unificado
 * ```
 * 
 * ## Uso Básico
 * 
 * ```typescript
 * import { 
 *   createPrescription,
 *   createCertificate,
 *   createReferral,
 *   createExamRequest,
 *   verifyDocument,
 * } from '@/lib/documents'
 * 
 * // Criar prescrição
 * const result = await createPrescription({
 *   doctorId: 'uuid-do-medico',
 *   patientId: 'uuid-do-paciente',
 *   usageType: 'INTERNAL',
 *   medications: [{
 *     genericName: 'Amoxicilina',
 *     concentration: '500mg',
 *     pharmaceuticalForm: 'Cápsula',
 *     quantity: 21,
 *     quantityUnit: 'cápsulas',
 *     dosage: '1 cápsula',
 *     route: 'oral',
 *     frequency: 'de 8 em 8 horas',
 *     duration: 'por 7 dias',
 *   }],
 * })
 * 
 * if (result.success) {
 *   // result.signedPdf contém o PDF assinado
 *   // result.documentId é o ID para verificação
 *   // result.verificationUrl é a URL para verificar
 * }
 * ```
 * 
 * ## Verificação de Documentos
 * 
 * ```typescript
 * const verification = await verifyDocument('document-uuid')
 * if (verification.valid) {
 *   console.log('Documento válido!')
 *   console.log('Assinante:', verification.document.signerName)
 * }
 * ```
 * 
 * @module lib/documents
 * @version 2.0.0
 */

// ============================================
// TIPOS
// ============================================
export type {
  // Tipos de documentos
  MedicalDocumentType,
  
  // Interfaces de dados
  DoctorInfo,
  PatientInfo,
  MedicationItem,
  ExamItem,
  SignatureInfo,
  
  // Documentos
  PrescriptionDocument,
  MedicalCertificateDocument,
  ReferralDocument,
  ExamRequestDocument,
  MedicalReportDocument,
  
  // Resultados
  ValidationResult,
  ValidationError,
} from './types'

// ============================================
// VALIDAÇÃO
// ============================================
export {
  // Validadores
  validatePrescription,
  validateCertificate,
  validateReferral,
  validateExamRequest,
  validateDoctor,
  validatePatient,
  validateMedication,
  
  // Classificação de medicamentos
  classifyMedication,
  
  // Utilitários
  numberToWords,
} from './validator'

// ============================================
// ASSINATURA DIGITAL
// ============================================
export {
  // Assinatura
  signPdfWithPAdES,
  signPdfWithPAdESFromBuffer,
  signPdfWithPAdESAndOptionalTimestamp,
  
  // Validação de certificado / cadeia
  validateCertificate as validateDigitalCertificate,
  extractCertificateInfo,
  getCertificateChainCount,
  
  // Verificação
  isPdfSigned,
  getSignatureInfo,
} from './pades-signer'

export { appendDocTimeStampToPdf } from './doc-timestamp'

// ============================================
// GERAÇÃO DE PDF
// ============================================
export {
  generatePrescriptionPdf,
  generateCertificatePdf,
  generateReferralPdf,
  generateExamRequestPdf,
} from './pdf-generator'

// ============================================
// SERVIÇO UNIFICADO
// ============================================
export {
  // Criação de documentos
  createPrescription,
  createCertificate,
  createReferral,
  createExamRequest,
  
  // Verificação
  verifyDocument,
  getSignedDocument,
  
  // Utilitários
  getDoctorInfo,
  getPatientInfo,
  generateDocumentId,
  getVerificationUrl,
} from './service'
