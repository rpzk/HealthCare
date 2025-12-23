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
    // Em produção: retornar lista vazia, documentos só com dados reais do banco
    return NextResponse.json({
      documents: [],
      pagination: {
        total: 0,
        limit,
        offset,
        hasMore: false
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

    // ⚠️ APENAS UPLOAD REAL - REMOVER MOCKS
    // Implementar salvamento real no banco de dados
    return NextResponse.json({
      error: 'Funcionalidade sob implementação. Use APIs de dados reais.',
      file: {
        name: file.name,
        size: file.size,
        type: file.type
      }
    }, { status: 501 })

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