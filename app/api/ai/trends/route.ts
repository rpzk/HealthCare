import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { AIAnalyticsService } from '@/lib/ai-analytics'

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') as 'week' | 'month' | 'quarter' || 'month'

    const trends = await AIAnalyticsService.getDiagnosisTrends(period)
    return NextResponse.json(trends)

  } catch (error) {
    console.error('Erro ao buscar tendências:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
