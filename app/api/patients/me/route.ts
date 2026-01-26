import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { decrypt } from '@/lib/crypto'
import { formatCPF, parseAllergies, serializeBirthDateToIsoNoonUtc } from '@/lib/patient-schemas'

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

    const lookup = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { patientId: true, email: true },
    })

    const patient = lookup?.patientId
      ? await prisma.patient.findUnique({
          where: { id: lookup.patientId },
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
          },
        })
      : lookup?.email
        ? await prisma.patient.findFirst({
            where: { email: { equals: lookup.email, mode: 'insensitive' } },
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
            },
          })
        : null

    if (!patient) {
      return NextResponse.json(
        { error: 'Paciente não encontrado para este usuário' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      ...patient,
      cpf: formatCPF(decrypt(patient.cpf as string | null)),
      birthDate: serializeBirthDateToIsoNoonUtc(patient.birthDate),
      allergies: parseAllergies(decrypt(patient.allergies as string | null)),
      medicalHistory: decrypt(patient.medicalHistory as string | null),
      currentMedications: decrypt(patient.currentMedications as string | null),
    })
  } catch (error) {
    logger.error('Erro ao buscar dados do paciente:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
