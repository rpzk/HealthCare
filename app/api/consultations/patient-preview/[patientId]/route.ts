import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/consultations/patient-preview/[patientId]
 * 
 * Retorna dados básicos do paciente para pré-selecionar em agendamento
 */

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: { patientId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    // Verificar se é profissional de saúde
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    const healthcareProfessionalRoles = [
      'DOCTOR',
      'NURSE',
      'PHYSIOTHERAPIST',
      'PSYCHOLOGIST',
      'DENTIST',
      'NUTRITIONIST',
      'HEALTH_AGENT',
      'TECHNICIAN',
      'PHARMACIST',
      'SOCIAL_WORKER',
      'RECEPTIONIST',
      'ADMIN'
    ]

    if (!user || !healthcareProfessionalRoles.includes(user.role)) {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    // Buscar paciente
    const patient = await prisma.patient.findUnique({
      where: { id: params.patientId }
    })

    if (!patient) {
      return NextResponse.json(
        { error: 'Paciente não encontrado' },
        { status: 404 }
      )
    }

    // Calcular idade
    let age = null
    if (patient.birthDate) {
      const today = new Date()
      const birthDate = new Date(patient.birthDate)
      age = today.getFullYear() - birthDate.getFullYear()
      const monthDiff = today.getMonth() - birthDate.getMonth()
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--
      }
    }

    return NextResponse.json({
      id: patient.id,
      name: patient.name,
      email: patient.email,
      phone: patient.phone,
      age
    })
  } catch (error: any) {
    console.error('Erro:', error.message || error)
    return NextResponse.json(
      { error: 'Erro ao buscar dados do paciente' },
      { status: 500 }
    )
  }
}
