/**
 * Tipos e interfaces para documentos médicos
 * Conformidade: CFM 2.299/2021, Portaria 344/98, Lei 9.787/99
 */

// ============================================
// TIPOS DE DOCUMENTOS MÉDICOS
// ============================================

export type MedicalDocumentType =
  | 'PRESCRIPTION'           // Prescrição comum
  | 'CONTROLLED_PRESCRIPTION' // Receita controlada (Portaria 344/98)
  | 'ANTIMICROBIAL_PRESCRIPTION' // Receita de antimicrobiano
  | 'MEDICAL_CERTIFICATE'    // Atestado médico
  | 'REFERRAL'               // Encaminhamento
  | 'EXAM_REQUEST'           // Solicitação de exame
  | 'MEDICAL_REPORT'         // Relatório médico
  | 'TECHNICAL_OPINION'      // Parecer técnico

// Classificação de receita controlada (Portaria 344/98)
export type ControlledPrescriptionType =
  | 'A1'  // Entorpecentes (amarela)
  | 'A2'  // Entorpecentes (amarela)
  | 'A3'  // Psicotrópicos (amarela)
  | 'B1'  // Psicotrópicos (azul)
  | 'B2'  // Psicotrópicos (azul)
  | 'C1'  // Outras substâncias (branca 2 vias)
  | 'C2'  // Retinoides (branca 2 vias)
  | 'C3'  // Imunossupressores (branca 2 vias)
  | 'C4'  // Antirretrovirais (branca 2 vias)
  | 'C5'  // Anabolizantes (branca 2 vias)
  | 'ANTIMICROBIAL' // Antimicrobianos (branca 2 vias, 10 dias)

// ============================================
// IDENTIFICAÇÃO DO MÉDICO (CFM 2.299/2021 Art. 2º)
// ============================================

export interface DoctorInfo {
  // Obrigatórios (CFM 2.299/2021)
  name: string           // Nome completo
  crm: string            // Número do CRM
  crmState: string       // UF do CRM (2 letras)
  address: string        // Endereço profissional
  
  // Obrigatório se especialista
  rqe?: string           // Registro de Qualificação de Especialista
  specialty?: string     // Nome da especialidade
  
  // Opcionais (melhoram o documento)
  cpf?: string           // CPF do médico
  phone?: string         // Telefone
  email?: string         // E-mail
  clinicName?: string    // Nome da clínica/hospital
  clinicCnpj?: string    // CNPJ da clínica
  city?: string          // Cidade
}

// ============================================
// IDENTIFICAÇÃO DO PACIENTE (CFM 2.299/2021 Art. 2º)
// ============================================

export interface PatientInfo {
  // Obrigatórios (CFM 2.299/2021)
  name: string           // Nome completo
  documentNumber: string // CPF ou outro documento legal
  documentType?: 'CPF' | 'RG' | 'CNS' | 'PASSPORT'
  
  // Recomendados
  birthDate?: Date       // Data de nascimento
  age?: number           // Idade (calculada se birthDate)
  gender?: 'M' | 'F' | 'O'
  address?: string       // Endereço
  phone?: string         // Telefone
  
  // Para prescrições especiais
  responsibleName?: string  // Nome do responsável (menor/incapaz)
  responsibleDocument?: string // Documento do responsável
}

// ============================================
// MEDICAMENTO NA PRESCRIÇÃO
// ============================================

export interface MedicationItem {
  // Identificação (Lei 9.787/99 - DCB obrigatório)
  genericName: string         // Nome genérico (DCB) - OBRIGATÓRIO
  brandName?: string          // Nome comercial (opcional)
  
  // Apresentação
  concentration: string       // Ex: "500mg", "10mg/mL"
  pharmaceuticalForm: PharmaceuticalForm
  
  // Quantidade
  quantity: number            // Quantidade numérica
  quantityUnit: string        // Unidade (comprimido, frasco, etc.)
  quantityWritten?: string    // Por extenso (OBRIGATÓRIO para controlados)
  
  // Posologia (DEVE ser técnica e específica)
  dosage: string              // Ex: "1 comprimido"
  route: AdministrationRoute  // Via de administração
  frequency: string           // Ex: "a cada 8 horas"
  duration: string            // Ex: "por 7 dias"
  maxDailyDose?: string       // Ex: "não exceder 4g/dia"
  
  // Instruções
  instructions?: string       // Orientações adicionais
  
  // Classificação (preenchido automaticamente)
  isControlled?: boolean
  controlledType?: ControlledPrescriptionType
  isAntimicrobial?: boolean
}

export type PharmaceuticalForm =
  | 'comprimido'
  | 'cápsula'
  | 'drágea'
  | 'solução'
  | 'suspensão'
  | 'xarope'
  | 'injeção'
  | 'ampola'
  | 'pomada'
  | 'creme'
  | 'gel'
  | 'colírio'
  | 'spray'
  | 'adesivo'
  | 'supositório'
  | 'óvulo'
  | 'pó'
  | 'sachê'
  | 'aerosol'

export type AdministrationRoute =
  | 'oral'
  | 'sublingual'
  | 'intramuscular'
  | 'intravenosa'
  | 'subcutânea'
  | 'tópica'
  | 'retal'
  | 'vaginal'
  | 'oftálmica'
  | 'nasal'
  | 'inalatória'
  | 'transdérmica'
  | 'intradérmica'

// ============================================
// DOCUMENTO DE PRESCRIÇÃO
// ============================================

export interface PrescriptionDocument {
  type: 'PRESCRIPTION' | 'CONTROLLED_PRESCRIPTION' | 'ANTIMICROBIAL_PRESCRIPTION'
  
  // Identificação
  prescriptionId: string      // ID único
  sequenceNumber?: number     // Número sequencial
  
  // Partes
  doctor: DoctorInfo
  patient: PatientInfo
  
  // Medicamentos
  medications: MedicationItem[]
  
  // Indicação de uso
  usageType: 'INTERNAL' | 'EXTERNAL' | 'BOTH' | 'TOPICAL'
  
  // Observações
  notes?: string
  
  // Para controlados
  controlledType?: ControlledPrescriptionType
  notificationType?: 'A' | 'B' | 'SPECIAL' // Tipo da notificação de receita
  
  // Metadados
  issuedAt: Date
  validUntil?: Date           // Validade (10 dias para antimicrobianos)
  
  // Assinatura
  signatureInfo?: SignatureInfo
}

// ============================================
// ATESTADO MÉDICO
// ============================================

export interface MedicalCertificateDocument {
  type: 'MEDICAL_CERTIFICATE'
  
  // Identificação
  certificateId: string
  sequenceNumber: number
  year: number
  
  // Partes
  doctor: DoctorInfo
  patient: PatientInfo
  
  // Tipo de atestado
  certificateType: CertificateType
  
  // Conteúdo
  title: string
  content: string
  
  // Período (se afastamento)
  startDate: Date
  endDate?: Date
  days?: number
  
  // CID (opcional - paciente pode recusar)
  includeCid: boolean
  cidCode?: string
  cidDescription?: string
  
  // Metadados
  issuedAt: Date
  
  // Assinatura
  signatureInfo?: SignatureInfo
}

export type CertificateType =
  | 'MEDICAL_LEAVE'       // Afastamento
  | 'FITNESS'             // Aptidão física
  | 'ACCOMPANIMENT'       // Acompanhante
  | 'TIME_OFF'            // Comparecimento
  | 'CUSTOM'              // Personalizado

// ============================================
// ENCAMINHAMENTO MÉDICO
// ============================================

export interface ReferralDocument {
  type: 'REFERRAL'
  
  // Identificação
  referralId: string
  
  // Partes
  doctor: DoctorInfo          // Médico solicitante
  patient: PatientInfo
  
  // Destino
  targetSpecialty: string     // Especialidade de destino
  targetDoctor?: string       // Médico específico (opcional)
  targetUnit?: string         // Unidade de saúde
  
  // Motivo
  reason: string              // Motivo do encaminhamento
  clinicalHistory?: string    // Resumo clínico
  currentMedications?: string // Medicações em uso
  
  // Prioridade
  priority: 'ROUTINE' | 'URGENT' | 'EMERGENCY'
  
  // Hipótese diagnóstica
  diagnosticHypothesis?: string
  cidCode?: string
  
  // Metadados
  issuedAt: Date
  
  // Assinatura
  signatureInfo?: SignatureInfo
}

// ============================================
// SOLICITAÇÃO DE EXAME
// ============================================

export interface ExamRequestDocument {
  type: 'EXAM_REQUEST'
  
  // Identificação
  requestId: string
  
  // Partes
  doctor: DoctorInfo
  patient: PatientInfo
  
  // Exames solicitados
  exams: ExamItem[]
  
  // Indicação clínica
  clinicalIndication: string
  diagnosticHypothesis?: string
  cidCode?: string
  
  // Prioridade
  priority: 'ROUTINE' | 'URGENT' | 'EMERGENCY'
  
  // Observações
  notes?: string
  preparation?: string        // Instruções de preparo
  
  // Metadados
  issuedAt: Date
  
  // Assinatura
  signatureInfo?: SignatureInfo
}

export interface ExamItem {
  name: string                // Nome do exame
  code?: string               // Código SIGTAP/TUSS
  quantity?: number           // Quantidade (se aplicável)
  material?: string           // Material a ser coletado
  notes?: string              // Observações específicas
}

// ============================================
// RELATÓRIO MÉDICO
// ============================================

export interface MedicalReportDocument {
  type: 'MEDICAL_REPORT' | 'TECHNICAL_OPINION'
  
  // Identificação
  reportId: string
  
  // Partes
  doctor: DoctorInfo
  patient: PatientInfo
  
  // Solicitante (se for para terceiros)
  requester?: string          // Quem solicitou
  purpose?: string            // Finalidade
  
  // Conteúdo
  title: string
  content: string
  
  // Diagnóstico
  diagnosis?: string
  cidCodes?: string[]
  
  // Tratamento
  treatment?: string
  prognosis?: string
  
  // Metadados
  issuedAt: Date
  
  // Assinatura
  signatureInfo?: SignatureInfo
}

// ============================================
// ASSINATURA DIGITAL
// ============================================

export interface SignatureInfo {
  // Certificado
  certificateSubject: string    // CN do certificado
  certificateIssuer: string     // Emissor (AC)
  certificateSerial: string     // Número de série
  certificateValidFrom: Date
  certificateValidTo: Date
  
  // Assinatura
  signatureAlgorithm: string    // Ex: SHA256withRSA
  signatureValue: string        // Base64 da assinatura
  signedAt: Date
  
  // Hash do documento
  documentHash: string          // SHA-256 do conteúdo
  hashAlgorithm: 'SHA-256' | 'SHA-384' | 'SHA-512'
  
  // Timestamp (PAdES-T)
  timestampAuthority?: string
  timestampToken?: string
  timestampedAt?: Date
  
  // Verificação
  verificationUrl?: string
  qrCodeData?: string
}

// ============================================
// RESULTADO DA GERAÇÃO DE DOCUMENTO
// ============================================

export interface GeneratedDocument {
  // PDF
  pdfBuffer: Buffer
  pdfHash: string
  
  // Identificação
  documentId: string
  documentType: MedicalDocumentType
  
  // Assinatura
  isSigned: boolean
  signatureInfo?: SignatureInfo
  
  // Verificação
  verificationUrl: string
  qrCodeDataUrl?: string
  
  // Metadados
  generatedAt: Date
  fileName: string
  fileSize: number
  
  // Conformidade
  cfmCompliant: boolean
  complianceNotes?: string[]
}

// ============================================
// OPÇÕES DE GERAÇÃO
// ============================================

export interface DocumentGenerationOptions {
  // Assinatura
  signDocument: boolean
  certificatePath?: string
  certificatePassword?: string
  
  // Timestamp
  includeTimestamp?: boolean
  timestampUrl?: string
  
  // QR Code
  includeQrCode?: boolean
  
  // Formato
  pdfFormat?: 'PDF/A-1b' | 'PDF/A-2b' | 'PDF/A-3b'
  
  // Branding
  includeLogo?: boolean
  logoUrl?: string
  includeHeader?: boolean
  includeFooter?: boolean
  footerText?: string
}

// ============================================
// VALIDAÇÃO
// ============================================

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
}

export interface ValidationError {
  code: string
  field?: string
  message: string
  regulation?: string   // Ex: "CFM 2.299/2021 Art. 2º"
}

export interface ValidationWarning {
  code: string
  field?: string
  message: string
  suggestion?: string
}
