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

    // Buscar consultas como histórico
    const consultations = await prisma.consultation.findMany({
      where: {
        patientId: patient.id,
        status: { in: ['COMPLETED', 'CONFIRMED', 'IN_PROGRESS'] }
      },
      include: {
        professional: {
          select: {
            name: true,
            specialty: true
          }
        }
      },
      orderBy: {
        date: 'desc'
      },
      take: 50
    })

    // Buscar prescrições
    const prescriptions = await prisma.prescription.findMany({
      where: {
        patientId: patient.id
      },
      include: {
        prescriber: {
          select: {
            name: true,
            specialty: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50
    })

    // Buscar exames
    const exams = await prisma.examRequest.findMany({
      where: {
        patientId: patient.id,
        status: 'COMPLETED'
      },
      include: {
        exam: {
          select: { name: true }
        },
        requestedBy: {
          select: { name: true }
        }
      },
      orderBy: {
        performedAt: 'desc'
      },
      take: 50
    })

    // Combinar todos os registros
    const records = [
      ...consultations.map(c => ({
        id: c.id,
        type: 'CONSULTATION' as const,
        title: c.type || 'Consulta Médica',
        description: c.notes?.substring(0, 200) || null,
        date: c.date.toISOString(),
        professional: c.professional ? {
          name: c.professional.name,
          specialty: c.professional.specialty
        } : null
      })),
      ...prescriptions.map(p => ({
        id: p.id,
        type: 'PRESCRIPTION' as const,
        title: 'Prescrição Médica',
        description: p.notes?.substring(0, 200) || null,
        date: p.createdAt.toISOString(),
        professional: p.prescriber ? {
          name: p.prescriber.name,
          specialty: p.prescriber.specialty
        } : null
      })),
      ...exams.map(e => ({
        id: e.id,
        type: 'EXAM' as const,
        title: e.exam?.name || 'Exame',
        description: e.notes?.substring(0, 200) || null,
        date: e.performedAt?.toISOString() || e.requestedAt.toISOString(),
        professional: e.requestedBy ? {
          name: e.requestedBy.name,
          specialty: null
        } : null
      }))
    ]

    // Ordenar por data
    records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return NextResponse.json(records)

  } catch (error) {
    console.error('Erro ao buscar histórico médico:', error)
    return NextResponse.json(
      { error: 'Erro ao carregar histórico' },
      { status: 500 }
    )
  }
}
