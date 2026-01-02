import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Obter resumo de alertas
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Contar questionários pendentes
    const pending = await prisma.patientQuestionnaire.count({
      where: {
        status: {
          in: ['PENDING', 'IN_PROGRESS'],
        },
      },
    })

    // Contar questionários completados mas não analisados
    const pendingAnalysis = await prisma.patientQuestionnaire.count({
      where: {
        status: 'COMPLETED',
        aiAnalysis: null,
      },
    })

    // Contar insights de alta prioridade
    let highPriority = 0
    const questionnairesWithAnalysis = await prisma.patientQuestionnaire.findMany({
      where: {
        status: 'COMPLETED',
        aiAnalysis: {
          not: null,
        },
      },
      select: {
        aiAnalysis: true,
      },
    })

    for (const q of questionnairesWithAnalysis) {
      if (!q.aiAnalysis) continue
      const analysis = q.aiAnalysis as any
      if (analysis.concerns) {
        highPriority += analysis.concerns.filter(
          (c: any) => c.severity === 'high'
        ).length
      }
      if (analysis.patterns) {
        highPriority += analysis.patterns.filter(
          (p: any) => p.severity === 'high'
        ).length
      }
    }

    return NextResponse.json([
      { count: highPriority, type: 'high_priority' },
      { count: pending, type: 'pending' },
      { count: pendingAnalysis, type: 'pending_analysis' },
    ])
  } catch (error: any) {
    console.error('Erro ao buscar alertas:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar alertas' },
      { status: 500 }
    )
  }
}
