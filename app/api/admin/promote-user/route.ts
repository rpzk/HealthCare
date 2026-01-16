import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Role } from '@prisma/client'
import {
  assertUserAcceptedTerms,
  getAudienceForRole,
} from '@/lib/terms-enforcement'
import { termsEnforcementErrorResponse } from '@/lib/terms-http'

// POST - Promover usuário para um novo papel (mantendo perfil de paciente se existir)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Verificar se é admin
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (currentUser?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Apenas administradores podem promover usuários' },
        { status: 403 }
      )
    }

    try {
      await assertUserAcceptedTerms({
        prisma,
        userId: session.user.id,
        audience: getAudienceForRole(currentUser?.role),
        gates: ['ADMIN_PRIVILEGED'],
      })
    } catch (e) {
      const res = termsEnforcementErrorResponse(e)
      if (res) return res
      throw e
    }

    const body = await request.json()
    const { userId, newRole, licenseNumber, licenseType, licenseState, speciality } = body

    if (!userId || !newRole) {
      return NextResponse.json(
        { error: 'userId e newRole são obrigatórios' },
        { status: 400 }
      )
    }

    // Validar role
    const validRoles: Role[] = ['ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'PATIENT', 'HEALTH_AGENT', 'TECHNICIAN', 'PHYSIOTHERAPIST', 'PSYCHOLOGIST', 'PHARMACIST', 'DENTIST', 'NUTRITIONIST', 'SOCIAL_WORKER', 'OTHER']
    if (!validRoles.includes(newRole)) {
      return NextResponse.json(
        { error: 'Role inválido' },
        { status: 400 }
      )
    }

    // Buscar usuário alvo
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { patient: true }
    })

    if (!targetUser) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    // Atualizar usuário
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        role: newRole as Role,
        // Dados profissionais (opcional)
        licenseNumber: licenseNumber || targetUser.licenseNumber,
        licenseType: licenseType || targetUser.licenseType,
        licenseState: licenseState || targetUser.licenseState,
        speciality: speciality || targetUser.speciality
      },
      include: { patient: true }
    })

    return NextResponse.json({
      success: true,
      message: `Usuário promovido para ${newRole} com sucesso!`,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        hasPatientProfile: !!updatedUser.patient
      },
      note: updatedUser.patient 
        ? 'O perfil de paciente foi mantido. O usuário pode atuar em ambos os papéis.'
        : null
    })

  } catch (error) {
    console.error('Error promoting user:', error)
    return NextResponse.json(
      { error: 'Erro ao promover usuário' },
      { status: 500 }
    )
  }
}

// GET - Listar usuários que podem ser promovidos
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Verificar se é admin
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (currentUser?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Apenas administradores podem ver esta lista' },
        { status: 403 }
      )
    }

    try {
      await assertUserAcceptedTerms({
        prisma,
        userId: session.user.id,
        audience: getAudienceForRole(currentUser?.role),
        gates: ['ADMIN_PRIVILEGED'],
      })
    } catch (e) {
      const res = termsEnforcementErrorResponse(e)
      if (res) return res
      throw e
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        speciality: true,
        licenseNumber: true,
        licenseType: true,
        isActive: true,
        patient: {
          select: { id: true }
        }
      },
      orderBy: { name: 'asc' }
    })

    return NextResponse.json({
      users: users.map(u => ({
        ...u,
        hasPatientProfile: !!u.patient,
        patient: undefined
      })),
      availableRoles: ['ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'PATIENT', 'HEALTH_AGENT', 'TECHNICIAN', 'PHYSIOTHERAPIST', 'PSYCHOLOGIST', 'PHARMACIST', 'DENTIST', 'NUTRITIONIST', 'SOCIAL_WORKER', 'OTHER']
    })

  } catch (error) {
    console.error('Error listing users:', error)
    return NextResponse.json(
      { error: 'Erro ao listar usuários' },
      { status: 500 }
    )
  }
}
