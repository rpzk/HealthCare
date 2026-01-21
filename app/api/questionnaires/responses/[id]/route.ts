import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const response = await prisma.patientQuestionnaire.findUnique({
      where: { id: params.id },
      include: {
        template: {
          select: {
            name: true,
            iconEmoji: true,
            therapeuticSystem: true,
            themeColor: true
          }
        },
        patient: {
          select: {
            id: true,
            name: true,
            email: true,
            birthDate: true,
            gender: true
          }
        },
        answers: {
          include: {
            question: {
              include: {
                category: {
                  select: {
                    name: true,
                    iconEmoji: true
                  }
                }
              }
            },
            selectedOption: true
          },
          orderBy: {
            question: {
              order: 'asc'
            }
          }
        }
      }
    })

    if (!response) {
      return NextResponse.json({ error: 'Resposta não encontrada' }, { status: 404 })
    }

    return NextResponse.json(response)
  } catch (error) {
    logger.error('Error fetching response:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar resposta' },
      { status: 500 }
    )
  }
}

// Update professional notes
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { professionalNotes } = body

    const response = await prisma.patientQuestionnaire.update({
      where: { id: params.id },
      data: { professionalNotes }
    })

    return NextResponse.json(response)
  } catch (error) {
    logger.error('Error updating response:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar resposta' },
      { status: 500 }
    )
  }
}
