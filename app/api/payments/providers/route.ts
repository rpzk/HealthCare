import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { paymentGateway } from '@/lib/payment-gateway-service'

export const runtime = 'nodejs'

/**
 * GET /api/payments/providers
 * Lista os provedores de pagamento disponíveis (configurados)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const providers = paymentGateway.getAvailableProviders()
    
    // Filtrar apenas os configurados para usuários não-admin
    const isAdmin = session.user.role === 'ADMIN' || session.user.role === 'OWNER'
    const filteredProviders = isAdmin 
      ? providers 
      : providers.filter(p => p.isConfigured)

    return NextResponse.json({
      providers: filteredProviders,
      summary: {
        total: providers.length,
        configured: providers.filter(p => p.isConfigured).length,
      }
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
