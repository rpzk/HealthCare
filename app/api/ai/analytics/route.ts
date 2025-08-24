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

    // Buscar parâmetros da query
    const { searchParams } = new URL(request.url)
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const doctorId = searchParams.get('doctorId')

    let analytics

    // Se for solicitação específica de um médico
    if (doctorId) {
      const doctorStats = await AIAnalyticsService.getDoctorAIStats(doctorId)
      return NextResponse.json(doctorStats)
    }

    // Buscar analytics gerais
    analytics = await AIAnalyticsService.getAIAnalytics(
      dateFrom ? new Date(dateFrom) : undefined,
      dateTo ? new Date(dateTo) : undefined
    )

    return NextResponse.json(analytics)

  } catch (error) {
    console.error('Erro na API de analytics:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// Endpoint para registrar uso da IA
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { type, patientId, responseTime, metadata } = body

    if (!type) {
      return NextResponse.json(
        { error: 'Tipo de análise é obrigatório' },
        { status: 400 }
      )
    }

    const result = await AIAnalyticsService.logAIUsage(
      type,
      patientId,
      session.user.id,
      responseTime,
      metadata
    )

    if (result) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json(
        { error: 'Falha ao registrar uso' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Erro ao registrar uso da IA:', error)
    return NextResponse.json(
      { error: 'Erro ao registrar uso' },
      { status: 500 }
    )
  }
}
