import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const userId = session.user.id
    const userEmail = session.user.email

    // Buscar o paciente vinculado a este usuário
    const patient = await prisma.patient.findFirst({
      where: {
        OR: [
          { userId: userId },
          { email: userEmail }
        ]
      }
    })

    if (!patient) {
      return NextResponse.json([])
    }

    // Buscar exames do paciente
    const examRequests = await prisma.examRequest.findMany({
      where: {
        patientId: patient.id
      },
      include: {
        exam: {
          select: {
            name: true,
            type: true,
            category: true
          }
        },
        requestedBy: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        requestedAt: 'desc'
      },
      take: 50
    })

    const exams = examRequests.map(req => ({
      id: req.id,
      name: req.exam?.name || 'Exame',
      type: req.exam?.type || 'LABORATORY',
      status: req.status,
      requestedAt: req.requestedAt.toISOString(),
      performedAt: req.performedAt?.toISOString() || null,
      resultAvailable: req.status === 'COMPLETED',
      resultUrl: null,
      notes: req.notes,
      professional: req.requestedBy ? {
        name: req.requestedBy.name
      } : null
    }))

    return NextResponse.json(exams)

  } catch (error) {
    console.error('Erro ao buscar exames do paciente:', error)
    return NextResponse.json(
      { error: 'Erro ao carregar exames' },
      { status: 500 }
    )
  }
}
