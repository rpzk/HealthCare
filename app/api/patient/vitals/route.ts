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

    // Buscar sinais vitais do paciente
    const vitals = await prisma.vitalSign.findMany({
      where: {
        patientId: patient.id
      },
      orderBy: {
        measuredAt: 'desc'
      },
      take: 100
    })

    const formattedVitals = vitals.map(vital => ({
      id: vital.id,
      type: vital.type,
      value: vital.value,
      unit: vital.unit,
      measuredAt: vital.measuredAt.toISOString(),
      notes: vital.notes
    }))

    return NextResponse.json(formattedVitals)

  } catch (error) {
    console.error('Erro ao buscar sinais vitais:', error)
    return NextResponse.json(
      { error: 'Erro ao carregar sinais vitais' },
      { status: 500 }
    )
  }
}
