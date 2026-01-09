import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Obter insights de questionários analisados
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const severity = searchParams.get('severity') || 'all'

    // Buscar questionários com análise IA completada
    const questionnaires = await prisma.patientQuestionnaire.findMany({
      where: {
        status: 'COMPLETED',
        aiAnalysis: {
          not: undefined as any,
        },
      },
      include: {
        template: true,
        patient: true,
      },
      orderBy: {
        aiAnalyzedAt: 'desc',
      },
      take: 50,
    })

    // Extrair insights das análises
    const insights: any[] = []

    for (const q of questionnaires) {
      if (!q.aiAnalysis) continue

      const analysis = q.aiAnalysis as any

      // Extrair insights da análise
      if (analysis.concerns && Array.isArray(analysis.concerns)) {
        for (const concern of analysis.concerns) {
          insights.push({
            id: `concern-${q.id}-${insights.length}`,
            type: 'CONCERN',
            title: concern.title || 'Preocupação Identificada',
            description: concern.description || concern,
            severity: concern.severity || 'medium',
            patientName: q.patient.name,
            patientId: q.patientId,
            questionnaireId: q.id,
            questionnaireName: q.template.name,
            detectedAt: q.aiAnalyzedAt || new Date(),
            actionable: true,
            suggestedAction: concern.suggestedAction,
            relatedMetrics: concern.metrics,
          })
        }
      }

      if (analysis.improvements && Array.isArray(analysis.improvements)) {
        for (const improvement of analysis.improvements) {
          insights.push({
            id: `improvement-${q.id}-${insights.length}`,
            type: 'IMPROVEMENT',
            title: improvement.title || 'Área de Melhoria',
            description: improvement.description || improvement,
            severity: 'low',
            patientName: q.patient.name,
            patientId: q.patientId,
            questionnaireId: q.id,
            questionnaireName: q.template.name,
            detectedAt: q.aiAnalyzedAt || new Date(),
            actionable: true,
            suggestedAction: improvement.recommendation,
            relatedMetrics: improvement.metrics,
          })
        }
      }

      if (analysis.patterns && Array.isArray(analysis.patterns)) {
        for (const pattern of analysis.patterns) {
          insights.push({
            id: `pattern-${q.id}-${insights.length}`,
            type: 'PATTERN',
            title: pattern.title || 'Padrão Identificado',
            description: pattern.description || pattern,
            severity: pattern.severity || 'medium',
            patientName: q.patient.name,
            patientId: q.patientId,
            questionnaireId: q.id,
            questionnaireName: q.template.name,
            detectedAt: q.aiAnalyzedAt || new Date(),
            actionable: true,
            suggestedAction: pattern.recommendation,
            relatedMetrics: pattern.metrics,
          })
        }
      }

      if (analysis.recommendations && Array.isArray(analysis.recommendations)) {
        for (const rec of analysis.recommendations) {
          insights.push({
            id: `rec-${q.id}-${insights.length}`,
            type: 'RECOMMENDATION',
            title: rec.title || 'Recomendação',
            description: rec.description || rec,
            severity: rec.priority === 'high' ? 'high' : rec.priority === 'low' ? 'low' : 'medium',
            patientName: q.patient.name,
            patientId: q.patientId,
            questionnaireId: q.id,
            questionnaireName: q.template.name,
            detectedAt: q.aiAnalyzedAt || new Date(),
            actionable: true,
            suggestedAction: rec.action,
            relatedMetrics: rec.metrics,
          })
        }
      }
    }

    // Filtrar por severidade
    let filtered = insights
    if (severity !== 'all') {
      filtered = insights.filter(i => i.severity === severity)
    }

    // Ordenar por severidade (high > medium > low)
    const severityOrder = { high: 0, medium: 1, low: 2 }
    filtered.sort(
      (a, b) =>
        severityOrder[a.severity as keyof typeof severityOrder] -
        severityOrder[b.severity as keyof typeof severityOrder]
    )

    return NextResponse.json(filtered)
  } catch (error: any) {
    console.error('Erro ao buscar insights:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar insights' },
      { status: 500 }
    )
  }
}
