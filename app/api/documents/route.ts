/**
 * API Unificada para Documentos Médicos
 * 
 * Endpoints para criação, visualização e verificação de documentos
 * em conformidade com CFM 2.299/2021
 * 
 * @route POST /api/documents
 * @route GET /api/documents/[id]
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'
import {
  createPrescription,
  createCertificate,
  createReferral,
  createExamRequest,
  getSignedDocument,
  verifyDocument,
} from '@/lib/documents/service'
import { logger } from '@/lib/logger'

// ============================================
// SCHEMAS DE VALIDAÇÃO
// ============================================

const MedicationSchema = z.object({
  genericName: z.string().min(1, 'Nome do medicamento obrigatório'),
  brandName: z.string().optional(),
  concentration: z.string().min(1, 'Concentração obrigatória'),
  pharmaceuticalForm: z.string().min(1, 'Forma farmacêutica obrigatória'),
  quantity: z.number().min(1, 'Quantidade deve ser pelo menos 1'),
  quantityUnit: z.string().min(1, 'Unidade obrigatória'),
  dosage: z.string().min(1, 'Posologia obrigatória'),
  route: z.string().min(1, 'Via de administração obrigatória'),
  frequency: z.string().min(1, 'Frequência obrigatória'),
  duration: z.string().min(1, 'Duração obrigatória'),
  maxDailyDose: z.string().optional(),
  instructions: z.string().optional(),
})

const ExamSchema = z.object({
  name: z.string().min(1, 'Nome do exame obrigatório'),
  code: z.string().optional(),
  material: z.string().optional(),
  notes: z.string().optional(),
})

// Schema base com credenciais de assinatura (opcional)
const SigningCredentialsSchema = z.object({
  certificatePassword: z.string().optional(), // Senha para assinar digitalmente
})

const PrescriptionInputSchema = SigningCredentialsSchema.extend({
  type: z.literal('PRESCRIPTION'),
  patientId: z.string(),
  usageType: z.enum(['INTERNAL', 'EXTERNAL', 'BOTH', 'TOPICAL']).default('INTERNAL'),
  medications: z.array(MedicationSchema).min(1, 'Ao menos um medicamento é obrigatório'),
  notes: z.string().optional(),
})

const CertificateInputSchema = SigningCredentialsSchema.extend({
  type: z.literal('CERTIFICATE'),
  patientId: z.string(),
  certificateType: z.enum(['MEDICAL_LEAVE', 'FITNESS', 'ACCOMPANIMENT', 'TIME_OFF', 'CUSTOM']),
  title: z.string().optional(),
  content: z.string().min(10, 'Conteúdo do atestado obrigatório'),
  days: z.number().optional(),
  startDate: z.string().transform(v => new Date(v)),
  endDate: z.string().optional().transform(v => v ? new Date(v) : undefined),
  includeCid: z.boolean().default(false),
  cidCode: z.string().optional(),
  cidDescription: z.string().optional(),
})

const ReferralInputSchema = SigningCredentialsSchema.extend({
  type: z.literal('REFERRAL'),
  patientId: z.string(),
  targetSpecialty: z.string().min(1, 'Especialidade de destino obrigatória'),
  targetDoctor: z.string().optional(),
  targetUnit: z.string().optional(),
  priority: z.enum(['ROUTINE', 'URGENT', 'EMERGENCY']),
  reason: z.string().min(10, 'Motivo do encaminhamento obrigatório'),
  clinicalHistory: z.string().optional(),
  diagnosticHypothesis: z.string().optional(),
  cidCode: z.string().optional(),
  currentMedications: z.string().optional(),
  examsAttached: z.array(z.string()).optional(),
  notes: z.string().optional(),
})

const ExamRequestInputSchema = SigningCredentialsSchema.extend({
  type: z.literal('EXAM_REQUEST'),
  patientId: z.string(),
  exams: z.array(ExamSchema).min(1, 'Ao menos um exame é obrigatório'),
  priority: z.enum(['ROUTINE', 'URGENT', 'EMERGENCY']),
  clinicalIndication: z.string().min(10, 'Indicação clínica obrigatória'),
  diagnosticHypothesis: z.string().optional(),
  cidCode: z.string().optional(),
  preparation: z.string().optional(),
  notes: z.string().optional(),
})

const DocumentInputSchema = z.discriminatedUnion('type', [
  PrescriptionInputSchema,
  CertificateInputSchema,
  ReferralInputSchema,
  ExamRequestInputSchema,
])

// ============================================
// POST - CRIAR DOCUMENTO
// ============================================

export async function POST(req: NextRequest) {
  try {
    // Autenticação
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }
    
    // Verificar se é médico
    const userRole = session.user.role
    if (!['DOCTOR', 'ADMIN', 'OWNER'].includes(userRole as string)) {
      return NextResponse.json(
        { error: 'Acesso não autorizado. Apenas médicos podem criar documentos.' },
        { status: 403 }
      )
    }
    
    // Parse e validação
    const body = await req.json()
    const validation = DocumentInputSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Dados inválidos',
          details: validation.error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 }
      )
    }
    
    const data = validation.data
    const doctorId = session.user.id
    
    // Criar documento de acordo com o tipo
    let result
    
    switch (data.type) {
      case 'PRESCRIPTION':
        result = await createPrescription({
          doctorId,
          patientId: data.patientId,
          usageType: data.usageType,
          medications: data.medications,
          notes: data.notes,
          certificatePassword: data.certificatePassword,
        })
        break
        
      case 'CERTIFICATE':
        result = await createCertificate({
          doctorId,
          patientId: data.patientId,
          certificateType: data.certificateType,
          title: data.title,
          content: data.content,
          days: data.days,
          startDate: data.startDate,
          endDate: data.endDate,
          includeCid: data.includeCid,
          cidCode: data.cidCode,
          cidDescription: data.cidDescription,
          certificatePassword: data.certificatePassword,
        })
        break
        
      case 'REFERRAL':
        result = await createReferral({
          doctorId,
          patientId: data.patientId,
          targetSpecialty: data.targetSpecialty,
          targetDoctor: data.targetDoctor,
          targetUnit: data.targetUnit,
          priority: data.priority,
          reason: data.reason,
          clinicalHistory: data.clinicalHistory,
          diagnosticHypothesis: data.diagnosticHypothesis,
          cidCode: data.cidCode,
          currentMedications: data.currentMedications,
          examsAttached: data.examsAttached,
          notes: data.notes,
          certificatePassword: data.certificatePassword,
        })
        break
        
      case 'EXAM_REQUEST':
        result = await createExamRequest({
          doctorId,
          patientId: data.patientId,
          exams: data.exams,
          priority: data.priority,
          clinicalIndication: data.clinicalIndication,
          diagnosticHypothesis: data.diagnosticHypothesis,
          cidCode: data.cidCode,
          preparation: data.preparation,
          notes: data.notes,
          certificatePassword: data.certificatePassword,
        })
        break
        
      default:
        return NextResponse.json(
          { error: 'Tipo de documento não suportado' },
          { status: 400 }
        )
    }
    
    // Verificar resultado
    if (!result.success) {
      return NextResponse.json(
        {
          error: 'Falha ao criar documento',
          details: result.errors,
        },
        { status: 422 }
      )
    }
    
    // Sucesso - retornar PDF como base64
    return NextResponse.json({
      success: true,
      documentId: result.documentId,
      documentType: data.type,
      verificationUrl: result.verificationUrl,
      pdf: result.signedPdf?.toString('base64'),
    })
    
  } catch (error) {
    logger.error('Erro na API de documentos:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// ============================================
// GET - INFORMAÇÕES DA API
// ============================================

export async function GET(req: NextRequest) {
  return NextResponse.json({
    name: 'API de Documentos Médicos',
    version: '2.0.0',
    compliance: ['CFM 2.299/2021', 'Portaria 344/98', 'Lei 9.787/99', 'RDC 20/2011'],
    endpoints: {
      'POST /api/documents': 'Criar documento (prescrição, atestado, encaminhamento, exames)',
      'GET /api/documents/[id]': 'Obter documento por ID',
      'GET /api/documents/[id]/verify': 'Verificar assinatura do documento',
      'GET /api/documents/[id]/pdf': 'Download do PDF assinado',
    },
    documentTypes: ['PRESCRIPTION', 'CERTIFICATE', 'REFERRAL', 'EXAM_REQUEST'],
    signature: {
      algorithm: 'PAdES-B (PDF Advanced Electronic Signatures)',
      validation: 'validar.iti.gov.br',
      certificateType: 'ICP-Brasil A1',
    },
  })
}
