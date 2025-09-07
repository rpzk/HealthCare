/**
 * 📄 API para Upload e Processamento de Documentos Médicos
 * Sistema completo de importação inteligente com IA
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuthUnlimited } from '@/lib/advanced-auth'
import { medicalDocumentAI, type MedicalDocument, type DocumentAnalysis } from '@/lib/medical-document-ai'
import { prisma } from '@/lib/prisma'

// Evita execução em build/SSG: rota puramente dinâmica
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

// GET - Listar documentos processados
const getHandler = withAdminAuthUnlimited(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = parseInt(searchParams.get('offset') || '0')

  try {
    const where = status
  ? { status: status.toUpperCase() as any }
      : {}
    
    const [documents, total] = await Promise.all([
      prisma.medicalDocument.findMany({
        where,
        include: {
          patient: {
            select: {
              id: true,
              name: true,
              cpf: true
            }
          },
          analysis: true
        },
        orderBy: { uploadDate: 'desc' },
        take: limit,
        skip: offset
      }),
      prisma.medicalDocument.count({ where })
    ])

    return NextResponse.json({
      documents,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    })
  } catch (error) {
    console.error('Erro ao buscar documentos:', error)
    return NextResponse.json(
      { error: 'Falha ao buscar documentos' },
      { status: 500 }
    )
  }
})

// POST - Upload e análise de documento
const postHandler = withAdminAuthUnlimited(async (request: NextRequest) => {
  try {
  const formData = await request.formData()
  const file = formData.get('file') as File
    const forceReprocess = formData.get('forceReprocess') === 'true'

    if (!file) {
      return NextResponse.json(
        { error: 'Nenhum arquivo enviado' },
        { status: 400 }
      )
    }

  // Validar tipo de arquivo
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/msword', // .doc  
      'application/pdf',
      'text/plain',
      'application/rtf'
    ]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipo de arquivo não suportado. Use: .docx, .doc, .pdf, .txt, .rtf' },
        { status: 400 }
      )
    }

    // Limitar tamanho (ex.: 5MB)
    const MAX_SIZE = 5 * 1024 * 1024
    const buf = Buffer.from(await file.arrayBuffer())
    if (buf.length > MAX_SIZE) {
      return NextResponse.json(
        { error: 'Arquivo muito grande (máx 5MB)' },
        { status: 413 }
      )
    }

    // Sanitizar nome do arquivo
    const safeName = file.name.replace(/[^\w\-.]+/g, '_').slice(0, 120)

    // Ler conteúdo do arquivo
    const content = await extractTextFromSanitizedBuffer(buf, file.type)
    
    if (!content || content.length < 50) {
      return NextResponse.json(
        { error: 'Documento muito pequeno ou não foi possível extrair texto' },
        { status: 400 }
      )
    }

    // Criar registro do documento
  const document = await prisma.medicalDocument.create({
      data: {
    fileName: safeName,
        content,
        fileType: getFileExtension(file.name) as any,
  status: 'ANALYZING' as any,
        uploadDate: new Date()
      }
    })

    // Processar com IA em background
    processDocumentWithAI(document.id, content, forceReprocess)

    return NextResponse.json({
      success: true,
      documentId: document.id,
      message: 'Documento enviado com sucesso. Análise AI em andamento...'
    })

  } catch (error) {
    console.error('Erro no upload:', error)
    return NextResponse.json(
      { error: 'Falha no upload do documento' },
      { status: 500 }
    )
  }
})

// PUT - Confirmar importação após revisão
const putHandler = withAdminAuthUnlimited(async (request: NextRequest) => {
  try {
    const { documentId, confirmedActions, rejectedActions } = await request.json()

    const document = await prisma.medicalDocument.findUnique({
      where: { id: documentId },
      include: { analysis: true }
    })

    if (!document) {
      return NextResponse.json(
        { error: 'Documento não encontrado' },
        { status: 404 }
      )
    }

    // Executar ações confirmadas
    const importResults = []
    for (const action of confirmedActions) {
      try {
        const result = await executeImportAction(action, document)
        importResults.push({ action: action.action, success: true, result })
      } catch (error) {
        console.error(`Erro ao executar ação ${action.action}:`, error)
        importResults.push({ 
          action: action.action, 
          success: false, 
          error: error instanceof Error ? error.message : 'Erro desconhecido' 
        })
      }
    }

    // Atualizar status do documento
    await prisma.medicalDocument.update({
      where: { id: documentId },
      data: { 
  status: 'IMPORTED' as any,
        importResults: JSON.stringify(importResults)
      }
    })

    return NextResponse.json({
      success: true,
      importResults,
      message: 'Documento importado com sucesso!'
    })

  } catch (error) {
    console.error('Erro na confirmação:', error)
    return NextResponse.json(
      { error: 'Falha na importação confirmada' },
      { status: 500 }
    )
  }
})

/**
 * 📄 Extrai texto de diferentes tipos de arquivo
 */
async function extractTextFromSanitizedBuffer(buffer: Buffer, mimeType: string): Promise<string> {
  try {
    switch (mimeType) {
      case 'text/plain':
        return new TextDecoder().decode(buffer)
      
      case 'application/pdf':
        {
          const mod = await import('pdf-parse')
          const pdfParse = (mod as any).default || (mod as any)
          const pdfData = await pdfParse(Buffer.from(buffer))
          return pdfData.text
        }
      
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        {
          const mammoth = await import('mammoth')
          const docxResult = await (mammoth as any).extractRawText({ buffer: Buffer.from(buffer) })
          return docxResult.value
        }
        
      case 'application/msword':
        // Para .doc, mammoth tem suporte limitado, mas vamos tentar
        {
          const mammoth = await import('mammoth')
          const docResult = await (mammoth as any).extractRawText({ buffer: Buffer.from(buffer) })
          return docResult.value
        }
      
      case 'application/rtf':
        // RTF como texto simples (implementação básica)
        return new TextDecoder().decode(buffer)
      
      default:
        return new TextDecoder().decode(buffer)
    }
  } catch (error) {
    console.error('Erro ao extrair texto do arquivo:', error)
    throw new Error('Não foi possível extrair texto do arquivo enviado')
  }
}

/**
 * 🧠 Processa documento com IA em background
 */
async function processDocumentWithAI(documentId: string, content: string, forceReprocess: boolean = false) {
  try {
    // Buscar documento
    const document = await prisma.medicalDocument.findUnique({
      where: { id: documentId }
    })

    if (!document) return

    // Criar objeto MedicalDocument para análise
    const medicalDoc: MedicalDocument = {
      id: document.id,
      fileName: document.fileName,
      content,
      uploadDate: document.uploadDate,
      fileType: document.fileType as any,
      status: 'analyzing',
      patientId: document.patientId || undefined
    }

    // Analisar com IA
    const analysis = await medicalDocumentAI.analyzeDocument(medicalDoc)

    // Tentar identificar paciente existente
    let patientId = null
    if (analysis.patientInfo.cpf || analysis.patientInfo.name) {
      const patient = await findPatientByInfo(analysis.patientInfo)
      if (patient) {
        patientId = patient.id
      }
    }

    // Salvar análise no banco
    await prisma.documentAnalysis.create({
      data: {
        documentId,
        confidence: analysis.confidence,
        documentType: analysis.documentType,
        patientInfo: JSON.stringify(analysis.patientInfo),
        extractedData: JSON.stringify(analysis.extractedData),
        suggestedActions: JSON.stringify(analysis.suggestedActions),
        analysisDate: new Date()
      }
    })

    // Atualizar documento
    await prisma.medicalDocument.update({
      where: { id: documentId },
      data: { 
  status: 'CLASSIFIED' as any,
  patientId: patientId ?? undefined
      }
    })

    // Gerar relatório
    const report = medicalDocumentAI.generateAnalysisReport(analysis)
    console.log(`📊 Análise concluída para documento ${documentId}:\n${report}`)

  } catch (error) {
    console.error(`Erro na análise AI do documento ${documentId}:`, error)
    
    await prisma.medicalDocument.update({
      where: { id: documentId },
      data: { 
  status: 'ERROR' as any,
        errorMessage: error instanceof Error ? error.message : 'Erro na análise AI'
      }
    })
  }
}

/**
 * 👤 Busca paciente por informações extraídas
 */
async function findPatientByInfo(patientInfo: DocumentAnalysis['patientInfo']) {
  const conditions = []
  
  if (patientInfo.cpf) {
    conditions.push({ cpf: patientInfo.cpf })
  }
  
  if (patientInfo.name && patientInfo.name.length > 5) {
    conditions.push({ 
      name: { 
        contains: patientInfo.name.split(' ')[0], // Primeiro nome
        mode: 'insensitive' as const
      } 
    })
  }

  if (conditions.length === 0) return null

  try {
    const patient = await prisma.patient.findFirst({
      where: { OR: conditions }
    })
    
    return patient
  } catch (error) {
    console.error('Erro ao buscar paciente:', error)
    return null
  }
}

/**
 * ⚡ Executa ação de importação confirmada
 */
async function executeImportAction(action: DocumentAnalysis['suggestedActions'][0], document: any) {
  switch (action.action) {
    case 'CREATE_PRESCRIPTION':
      return await createPrescriptionFromAnalysis(action.data, document)
    
    case 'ADD_EXAM_RESULT':
      return await addExamResultFromAnalysis(action.data, document)
    
    case 'CREATE_CONSULTATION':
      return await createConsultationFromAnalysis(action.data, document)
    
    case 'CREATE_MEDICAL_RECORD':
      return await createMedicalRecordFromAnalysis(action.data, document)
    
    case 'UPDATE_PATIENT':
      return await updatePatientFromAnalysis(action.data)
    
    default:
      throw new Error(`Ação não implementada: ${action.action}`)
  }
}

/**
 * 💊 Cria prescrição a partir da análise
 */
async function createPrescriptionFromAnalysis(data: any, document: any) {
  // Implementação simplificada - expandir conforme necessário
  const prescription = await prisma.prescription.create({
    data: {
      patientId: document.patientId,
      doctorId: data.doctorId || (await getAnyDoctorId()),
      medication: data.medications?.[0]?.name || data.medication || 'Medicamento',
      dosage: data.medications?.[0]?.dosage || data.dosage || 'Conforme orientação',
      frequency: data.medications?.[0]?.frequency || data.frequency || '12/12h',
      duration: data.medications?.[0]?.duration || data.duration || '7 dias',
      instructions: data.instructions || 'Importado via IA',
      startDate: data.date || new Date()
    }
  })
  
  return { prescriptionId: prescription.id }
}

/**
 * 🧪 Adiciona resultado de exame
 */
async function addExamResultFromAnalysis(data: any, document: any) {
  const examResult = await prisma.examResult.create({
    data: {
      patientId: document.patientId,
      examType: 'Múltiplos Exames',
      results: JSON.stringify(data.results),
      examDate: data.date || new Date(),
      sourceDocument: document.fileName
    }
  })
  
  return { examResultId: examResult.id }
}

/**
 * 🏥 Cria consulta a partir da análise
 */
async function createConsultationFromAnalysis(data: any, document: any) {
  const consultation = await prisma.consultation.create({
    data: {
      patientId: document.patientId,
      doctorId: data.doctorId || (await getAnyDoctorId()),
      type: 'FOLLOW_UP',
      scheduledDate: data.date || new Date(),
      status: 'COMPLETED',
      notes: data.observations || 'Importado via IA'
    }
  })
  
  return { consultationId: consultation.id }
}

/**
 * 📋 Cria registro médico
 */
async function createMedicalRecordFromAnalysis(data: any, document: any) {
  const medicalRecord = await prisma.medicalRecord.create({
    data: {
      patientId: document.patientId,
      doctorId: data.doctorId || (await getAnyDoctorId()),
      title: data.title || 'Registro clínico importado',
      description: data.content || '',
      recordType: 'CONSULTATION',
      notes: `Fonte: ${document.fileName}`
    }
  })
  
  return { medicalRecordId: medicalRecord.id }
}

/**
 * 👤 Atualiza informações do paciente
 */
async function updatePatientFromAnalysis(data: DocumentAnalysis['patientInfo']) {
  if (!data.cpf && !data.name) {
    throw new Error('Informações insuficientes para atualizar paciente')
  }

  // Buscar ou criar paciente
  let patient = null
  
  if (data.cpf) {
    patient = await prisma.patient.findUnique({ where: { cpf: data.cpf } })
  }
  
  if (!patient && data.name) {
    patient = await prisma.patient.findFirst({
      where: {
        name: {
          contains: data.name.split(' ')[0],
          mode: 'insensitive'
        }
      }
    })
  }

  if (patient) {
    // Atualizar paciente existente
    const updated = await prisma.patient.update({
      where: { id: patient.id },
      data: {
        name: data.name || patient.name,
        cpf: data.cpf || patient.cpf,
        birthDate: data.birthDate ? new Date(data.birthDate) : patient.birthDate
      }
    })
    return { patientId: updated.id, action: 'updated' }
  } else {
    // Criar novo paciente
  const created = await prisma.patient.create({
      data: {
        name: data.name || 'Nome não identificado',
        cpf: data.cpf,
        // BirthDate é obrigatório no schema; usar uma data padrão caso ausente
        birthDate: data.birthDate ? new Date(data.birthDate) : new Date('1970-01-01'),
  gender: 'OTHER' as any,
        email: '',
        phone: ''
      }
    })
    return { patientId: created.id, action: 'created' }
  }
}

// Utilitário: obter um médico qualquer para relações obrigatórias
async function getAnyDoctorId(): Promise<string> {
  const anyDoctor = await prisma.user.findFirst({ where: { role: 'DOCTOR' as any } })
  if (anyDoctor) return anyDoctor.id
  // Se não houver, criar um placeholder
  const created = await prisma.user.create({
    data: {
      email: `doctor+${Date.now()}@example.com`,
      name: 'Médico Importação',
      role: 'DOCTOR' as any,
      isActive: true
    }
  })
  return created.id
}

/**
 * 📁 Obtém extensão do arquivo
 */
function getFileExtension(fileName: string): string {
  const parts = fileName.split('.')
  return parts[parts.length - 1].toLowerCase()
}

export { getHandler as GET, postHandler as POST, putHandler as PUT }
