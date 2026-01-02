import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Listar notificações de questionários
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const filter = searchParams.get('filter') || 'all'

    let where: any = {
      userId: session.user.id,
      type: {
        in: [
          'QUESTIONNAIRE_SENT',
          'QUESTIONNAIRE_COMPLETED',
          'QUESTIONNAIRE_EXPIRED',
          'AI_ANALYSIS_READY',
        ],
      },
    }

    if (filter === 'unread') {
      where.read = false
    } else if (filter === 'read') {
      where.read = true
    }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    // Enriquecer notificações com dados de questionários
    const enrichedNotifications = await Promise.all(
      notifications.map(async (notif) => {
        // Tentar extrair IDs da mensagem ou metadados
        const meta = (notif as any).metadata || {}

        return {
          id: notif.id,
          type: notif.type,
          title: notif.title,
          message: notif.message,
          patientName: meta.patientName || 'Paciente',
          patientId: meta.patientId || '',
          questionnaireName: meta.questionnaireName || '',
          questionnaireId: meta.questionnaireId || '',
          status: meta.status || 'PENDING',
          read: notif.read,
          createdAt: notif.createdAt.toISOString(),
          actionUrl: meta.actionUrl || null,
        }
      })
    )

    return NextResponse.json(enrichedNotifications)
  } catch (error: any) {
    console.error('Erro ao buscar notificações:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar notificações' },
      { status: 500 }
    )
  }
}
