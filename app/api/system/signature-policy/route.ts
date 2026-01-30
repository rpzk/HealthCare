import { NextResponse } from 'next/server'
import { getSignaturePolicy } from '@/lib/signature-policy'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'

// Public endpoint exposing only non-sensitive signature enforcement flags
export async function GET() {
  try {
    // DEBUG LOG: signature policy requested
    logger.warn('[SignaturePolicy] GET request')
    const policy = await getSignaturePolicy()
    return NextResponse.json({ success: true, policy })
  } catch (error: any) {
    logger.error('Erro ao obter policy de assinatura:', error)
    return NextResponse.json({ error: 'Erro ao obter configurações' }, { status: 500 })
  }
}
