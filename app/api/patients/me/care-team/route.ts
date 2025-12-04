/**
 * API para paciente ver sua própria equipe de cuidado
 * GET /api/patients/me/care-team
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { translateAccessLevel } from '@/lib/patient-access'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Buscar o paciente vinculado ao usuário
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { patientId: true }
    })

    if (!user?.patientId) {
      return NextResponse.json(
        { error: 'Você não possui cadastro de paciente' },
        { status: 404 }
      )
    }

    const patientId = user.patientId

    // Buscar equipe de atendimento
    const careTeam = await prisma.patientCareTeam.findMany({
      where: {
        patientId,
        isActive: true,
        OR: [
          { validUntil: null },
          { validUntil: { gte: new Date() } }
        ]
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            speciality: true,
            phone: true
          }
        }
      },
      orderBy: [
        { isPrimary: 'desc' },
        { createdAt: 'asc' }
      ]
    })

    // Buscar médico responsável (se houver)
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: {
        primaryDoctorId: true,
        primaryDoctor: {
          select: {
            id: true,
            name: true,
            email: true,
            speciality: true,
            phone: true
          }
        }
      }
    })

    // Formatar resposta amigável para o paciente
    const formattedTeam = careTeam.map(member => ({
      id: member.id,
      profissional: {
        id: member.user.id,
        nome: member.user.name,
        email: member.user.email,
        telefone: member.user.phone,
        especialidade: member.user.speciality,
        cargo: translateRole(member.user.role)
      },
      tipo: translateAccessLevel(member.accessLevel),
      principal: member.isPrimary,
      motivo: member.reason,
      desde: member.createdAt
    }))

    // Adicionar médico responsável à lista se não estiver
    let medicoResponsavel = null
    if (patient?.primaryDoctor) {
      medicoResponsavel = {
        id: patient.primaryDoctor.id,
        nome: patient.primaryDoctor.name,
        email: patient.primaryDoctor.email,
        telefone: patient.primaryDoctor.phone,
        especialidade: patient.primaryDoctor.speciality
      }
    }

    return NextResponse.json({
      success: true,
      medicoResponsavel,
      equipeCuidado: formattedTeam,
      totalMembros: formattedTeam.length
    })
  } catch (error) {
    console.error('Error fetching care team:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar equipe de cuidado' },
      { status: 500 }
    )
  }
}

function translateRole(role: string): string {
  const translations: Record<string, string> = {
    DOCTOR: 'Médico(a)',
    NURSE: 'Enfermeiro(a)',
    RECEPTIONIST: 'Recepcionista',
    ADMIN: 'Administrador',
    PATIENT: 'Paciente',
    TECHNICIAN: 'Técnico(a)',
    PHARMACIST: 'Farmacêutico(a)',
    NUTRITIONIST: 'Nutricionista',
    PSYCHOLOGIST: 'Psicólogo(a)',
    PHYSIOTHERAPIST: 'Fisioterapeuta',
    MANAGER: 'Gerente'
  }
  return translations[role] || role
}
