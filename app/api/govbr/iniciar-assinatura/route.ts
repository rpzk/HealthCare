/**
 * API Route: Iniciar sessão de assinatura com Gov.br
 * POST /api/govbr/iniciar-assinatura
 * 
 * Fluxo:
 * 1. Frontend solicita inicialização
 * 2. Backend gera hash do documento
 * 3. Backend prepara URL de autorização
 * 4. Frontend redireciona para Gov.br
 */

import { NextRequest, NextResponse } from 'next/server'
import { generateDocumentHash, generateOAuthState, buildAuthorizationUrl } from '@/lib/govbr-utils'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

interface InitializeSignatureRequest {
  certificateId: string
  patientId?: string
  deviceIdentifier?: string
}

/**
 * Simula busca de documento (em produção viria do DB)
 */
function getMockDocument(certificateId: string): Buffer {
  return Buffer.from(
    JSON.stringify({
      id: certificateId,
      type: 'MEDICAL_CERTIFICATE',
      createdAt: new Date().toISOString(),
      content: 'Documento de teste para assinatura com Gov.br'
    }),
    'utf-8'
  )
}

/**
 * Armazena sessão de assinatura
 * Em produção, isso seria no Redis ou banco de dados
 */
const signatureSessions = new Map<string, {
  state: string
  documentHash: string
  certificateId: string
  createdAt: number
}>()

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as InitializeSignatureRequest
    const { certificateId } = body

    if (!certificateId) {
      return NextResponse.json(
        { error: 'certificateId é obrigatório' },
        { status: 400 }
      )
    }

    // Validar se certificado existe
    const certificate = await prisma.medicalCertificate.findUnique({
      where: { id: certificateId }
    })

    if (!certificate) {
      return NextResponse.json(
        { error: 'Atestado não encontrado' },
        { status: 404 }
      )
    }

    // Gerar estado OAuth (previne CSRF)
    const state = generateOAuthState()

    // Buscar documento (simulado)
    const documentBuffer = getMockDocument(certificateId)

    // Gerar hash SHA-256 do documento
    const documentHash = generateDocumentHash(documentBuffer)

    // Armazenar sessão (com expiração de 10 minutos)
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2)}`
    signatureSessions.set(sessionId, {
      state,
      documentHash,
      certificateId,
      createdAt: Date.now()
    })

    // TODO: Em produção, persistir em Redis ou banco de dados
    // await redis.setex(sessionId, 600, JSON.stringify({ state, documentHash, certificateId }))

    // Construir URL de redirecionamento para Gov.br
    const redirectUri = process.env.GOVBR_REDIRECT_URI || 'http://localhost:3001/api/govbr/callback'
    const clientId = process.env.GOVBR_CLIENT_ID || ''

    if (!clientId) {
      return NextResponse.json(
        { error: 'Gov.br não configurado. Defina GOVBR_CLIENT_ID no .env' },
        { status: 500 }
      )
    }

    const authorizationUrl = buildAuthorizationUrl(
      clientId,
      redirectUri,
      state,
      documentHash
    )

    console.log('[Gov.br] Sessão de assinatura iniciada:', {
      sessionId,
      certificateId,
      state: state.slice(0, 8) + '***',
      documentHash: documentHash.slice(0, 8) + '***'
    })

    return NextResponse.json({
      success: true,
      redirectUrl: authorizationUrl,
      sessionId,
      message: 'Redirecionando para Gov.br...'
    })
  } catch (error) {
    console.error('[Gov.br] Erro ao iniciar assinatura:', error)
    return NextResponse.json(
      { 
        error: 'Falha ao iniciar processo de assinatura',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

// Exportar para uso em outras rotas
export { signatureSessions }
