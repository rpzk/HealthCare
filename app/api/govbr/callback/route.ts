/**
 * API Route: Callback do Gov.br após assinatura
 * GET /api/govbr/callback
 * 
 * Fluxo:
 * 1. Gov.br redireciona usuário com código de autorização
 * 2. Trocamos código por access_token
 * 3. Usamos token para finalizar assinatura
 * 4. Redirecionamos para página de sucesso
 */

import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'
import { buildTokenRequestBody } from '@/lib/govbr-utils'
import { prisma } from '@/lib/prisma'
import { signatureSessions } from '../iniciar-assinatura/route'

export const dynamic = 'force-dynamic'

/**
 * Simula finalização de assinatura
 * Em produção, isso chamaria a API do Gov.br
 */
async function finalizeSignature(
  accessToken: string,
  certificateId: string,
  documentHash: string
): Promise<{
  success: boolean
  signatureData: string
  timestamp: string
}> {
  console.log('[Gov.br] Finalizando assinatura com token:', accessToken.slice(0, 8) + '***')
  
  // TODO: Fazer requisição real para API de assinatura do Gov.br
  // const response = await axios.post(
  //   `${process.env.GOVBR_SIGNATURE_API_URL}/sign`,
  //   { documentHash },
  //   { headers: { Authorization: `Bearer ${accessToken}` } }
  // )

  // Simulação de resposta bem-sucedida
  return {
    success: true,
    signatureData: Buffer.from(
      JSON.stringify({
        certificateId,
        documentHash,
        signedAt: new Date().toISOString(),
        method: 'GOV_BR_OAUTH'
      })
    ).toString('base64'),
    timestamp: new Date().toISOString()
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')

    console.log('[Gov.br] Callback recebido:', {
      code: code?.slice(0, 8) + '***',
      state: state?.slice(0, 8) + '***',
      error
    })

    // Verificar se houve erro na autorização
    if (error) {
      console.error('[Gov.br] Erro retornado por Gov.br:', error, errorDescription)
      const errorUrl = new URL(`${process.env.APP_FRONTEND_URL}/govbr/erro`)
      errorUrl.searchParams.append('error', error)
      errorUrl.searchParams.append('description', errorDescription || 'Erro desconhecido')
      return NextResponse.redirect(errorUrl)
    }

    // Validar code e state
    if (!code || !state) {
      throw new Error('Parâmetros code ou state ausentes')
    }

    // Recuperar sessão de assinatura
    const sessionData = Array.from(signatureSessions.values()).find(
      (session) => session.state === state && Date.now() - session.createdAt < 600000
    )

    if (!sessionData) {
      throw new Error('Sessão inválida ou expirada')
    }

    const { certificateId, documentHash } = sessionData

    // Trocar código por access_token com Gov.br
    console.log('[Gov.br] Trocando código por token...')

    const tokenUrl = process.env.GOVBR_TOKEN_URL || 'https://sso.staging.acesso.gov.br/token'
    const clientId = process.env.GOVBR_CLIENT_ID || ''
    const clientSecret = process.env.GOVBR_CLIENT_SECRET || ''
    const redirectUri = process.env.GOVBR_REDIRECT_URI || ''

    if (!clientId || !clientSecret) {
      throw new Error('Credenciais Gov.br não configuradas')
    }

    const tokenBody = buildTokenRequestBody(code, clientId, clientSecret, redirectUri)

    let accessToken: string
    try {
      const tokenResponse = await axios.post(tokenUrl, tokenBody, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        }
      })

      accessToken = tokenResponse.data.access_token

      if (!accessToken) {
        throw new Error('Nenhum token retornado pelo Gov.br')
      }

      console.log('[Gov.br] Token obtido com sucesso:', accessToken.slice(0, 8) + '***')
    } catch (tokenError) {
      console.error('[Gov.br] Erro ao trocar token:', tokenError)
      
      // Se Gov.br não estiver configurado, simular sucesso para testes
      if (process.env.NODE_ENV === 'development') {
        console.warn('[Gov.br] Usando simulação em desenvolvimento')
        accessToken = `mock_token_${Date.now()}`
      } else {
        throw tokenError
      }
    }

    // Finalizar assinatura
    const signatureResult = await finalizeSignature(accessToken, certificateId, documentHash)

    if (!signatureResult.success) {
      throw new Error('Falha ao finalizar assinatura')
    }

    // Atualizar certificado no banco com assinatura Gov.br
    await prisma.medicalCertificate.update({
      where: { id: certificateId },
      data: {
        signature: signatureResult.signatureData,
        signatureMethod: 'GOV_BR',
        timestamp: new Date(signatureResult.timestamp)
      }
    })

    console.log('[Gov.br] Assinatura finalizada e armazenada:', {
      certificateId,
      method: 'GOV_BR',
      timestamp: signatureResult.timestamp
    })

    // Limpar sessão
    signatureSessions.delete(
      Array.from(signatureSessions.entries()).find(
        ([_, session]) => session.state === state
      )?.[0] || ''
    )

    // Redirecionar para página de sucesso
    const successUrl = new URL(`${process.env.APP_FRONTEND_URL}/govbr/sucesso`)
    successUrl.searchParams.append('certificateId', certificateId)
    
    return NextResponse.redirect(successUrl)
  } catch (error) {
    console.error('[Gov.br] Erro no callback:', error)
    
    const errorUrl = new URL(`${process.env.APP_FRONTEND_URL}/govbr/erro`)
    errorUrl.searchParams.append('error', error instanceof Error ? error.message : 'Erro desconhecido')
    
    return NextResponse.redirect(errorUrl)
  }
}
