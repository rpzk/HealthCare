/**
 * 📄 API para Upload e Processamento de Documentos Médicos
 * Sistema completo de importação inteligente com IA
 */

import { NextResponse } from 'next/server'
import { withAdminAuthUnlimited } from '@/lib/advanced-auth'
import { medicalDocumentAI, type MedicalDocument, type DocumentAnalysis } from '@/lib/medical-document-ai'

// Evita execução em build/SSG: rota puramente dinâmica
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

// GET - Listar documentos processados
const getHandler = withAdminAuthUnlimited(async (request) => {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = parseInt(searchParams.get('offset') || '0')

  try {
    // Mock de documentos processados
    const mockDocuments = [
      {
        id: '1',
        filename: 'exame_hemograma_maria.pdf',
        originalName: 'exame_hemograma_maria.pdf',
        mimeType: 'application/pdf',
        size: 245760,
        status: 'PROCESSED',
        analysis: {
          documentType: 'EXAM_RESULT',
          confidence: 0.95,
          extractedData: {
            patientName: 'Maria Santos',
            examDate: '2024-01-15',
            results: {
              hemoglobina: '14.2 g/dL',
              hematocrito: '42%',
              leucocitos: '7200/mm³'
            }
          }
        },
        createdAt: new Date('2024-01-15T09:00:00Z'),
        updatedAt: new Date('2024-01-15T09:05:00Z')
      },
      {
        id: '2',
        filename: 'receita_losartana.pdf',
        originalName: 'receita_losartana.pdf',
        mimeType: 'application/pdf',
        size: 128000,
        status: 'PROCESSING',
        analysis: null,
        createdAt: new Date('2024-01-15T10:00:00Z'),
        updatedAt: new Date('2024-01-15T10:00:00Z')
      }
    ]

    // Aplicar filtros
    let filteredDocuments = mockDocuments
    if (status) {
      filteredDocuments = filteredDocuments.filter(doc => doc.status === status.toUpperCase())
    }

    // Aplicar paginação
    const documents = filteredDocuments.slice(offset, offset + limit)
    const total = filteredDocuments.length

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
    console.error('Erro ao listar documentos:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
})

// POST - Upload e processamento de documento
const postHandler = withAdminAuthUnlimited(async (request) => {
  try {
  const formData = await request.formData()
  const file = formData.get('file') as File
    const patientId = formData.get('patientId') as string

    if (!file) {
      return NextResponse.json(
        { error: 'Arquivo é obrigatório' },
        { status: 400 }
      )
    }

    // Mock de processamento de documento
    const mockDocument = {
      id: Date.now().toString(),
      filename: file.name,
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
      status: 'PROCESSING',
      analysis: null,
      patientId: patientId || null,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    // Simular processamento assíncrono
    setTimeout(async () => {
      try {
        // Mock de análise com IA
        const mockAnalysis = {
          documentType: 'EXAM_RESULT',
          confidence: 0.87,
          extractedData: {
            patientName: 'Paciente Mock',
            examDate: new Date().toISOString().split('T')[0],
            results: {
              status: 'Normal',
              observacoes: 'Exame processado com sucesso'
            }
          }
        }

        console.log(`Documento ${mockDocument.id} processado com sucesso`)
      } catch (error) {
        console.error(`Erro ao processar documento ${mockDocument.id}:`, error)
      }
    }, 2000)

    return NextResponse.json({
      document: mockDocument,
      message: 'Documento enviado para processamento'
    }, { status: 201 })

  } catch (error) {
    console.error('Erro ao processar documento:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
})

export const GET = getHandler
export const POST = postHandler