import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

// GET /api/patients/me - Buscar paciente vinculado ao usuário logado
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    // Buscar paciente vinculado ao usuário logado
    const patient = await prisma.patient.findFirst({
      where: {
        userId: session.user.id
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        birthDate: true,
        cpf: true,
        address: true,
        allergies: true,
        emergencyContact: true,
        createdAt: true,
        gender: true,
        riskLevel: true,
        medicalHistory: true,
        currentMedications: true,
      }
    })

    if (!patient) {
      return NextResponse.json(
        { error: 'Paciente não encontrado para este usuário' },
        { status: 404 }
      )
    }

    return NextResponse.json(patient)
  } catch (error) {
    logger.error('Erro ao buscar dados do paciente:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
