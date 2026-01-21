import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// GET - Listar questionários de um paciente específico
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const questionnaires = await prisma.patientQuestionnaire.findMany({
      where: {
        patientId: params.id
      },
      include: {
        template: {
          select: {
            id: true,
            name: true,
            iconEmoji: true,
            therapeuticSystem: true,
            themeColor: true
          }
        },
        sentBy: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        sentAt: 'desc'
      }
    })

    return NextResponse.json(questionnaires)

  } catch (error: any) {
    logger.error('Error fetching patient questionnaires:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
