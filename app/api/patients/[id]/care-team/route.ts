/**
 * API para gerenciar equipe de atendimento do paciente
 * POST /api/patients/[id]/care-team - Adicionar membro
 * GET /api/patients/[id]/care-team - Listar membros
 * DELETE /api/patients/[id]/care-team - Remover membro
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  checkPatientAccess,
  addToCareTeam,
  removeFromCareTeam,
  grantEmergencyAccess,
  translateAccessLevel
} from '@/lib/patient-access'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const patientId = params.id

    // Verificar se o usuário tem acesso ao paciente
    const access = await checkPatientAccess(session.user.id, patientId, session.user.role)
    if (!access.hasAccess) {
      return NextResponse.json({ error: access.reason }, { status: 403 })
    }

    // Buscar equipe de atendimento
    const careTeam = await prisma.patientCareTeam.findMany({
      where: {
        patientId,
        isActive: true
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            speciality: true
          }
        }
      },
      orderBy: [
        { isPrimary: 'desc' },
        { accessLevel: 'asc' },
        { createdAt: 'asc' }
      ]
    })

    // Buscar médico responsável
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: {
        primaryDoctorId: true,
        primaryDoctor: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            speciality: true
          }
        }
      }
    })

    // Formatar resposta
    const formattedTeam = careTeam.map(member => ({
      id: member.id,
      userId: member.userId,
      userName: member.user.name,
      userEmail: member.user.email,
      userRole: member.user.role,
      userSpecialty: member.user.speciality,
      accessLevel: member.accessLevel,
      accessLevelLabel: translateAccessLevel(member.accessLevel),
      isPrimary: member.isPrimary,
      reason: member.reason,
      validUntil: member.validUntil,
      isExpiring: member.validUntil && member.validUntil < new Date(Date.now() + 24 * 60 * 60 * 1000),
      addedAt: member.createdAt
    }))

    return NextResponse.json({
      success: true,
      responsibleDoctor: patient?.primaryDoctor,
      careTeam: formattedTeam,
      totalMembers: formattedTeam.length
    })
  } catch (error) {
    console.error('Error fetching care team:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar equipe de atendimento' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const patientId = params.id
    const body = await request.json()
    const { userId, accessLevel, reason, validUntil, isPrimary, isEmergency, emergencyDuration } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'ID do profissional é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar se quem está adicionando tem acesso FULL
    const access = await checkPatientAccess(session.user.id, patientId, session.user.role)
    
    // Apenas quem tem acesso FULL ou é admin pode adicionar membros
    if (!access.hasAccess || (access.accessLevel !== 'FULL' && !access.isAdmin)) {
      return NextResponse.json(
        { error: 'Apenas o médico responsável ou administradores podem gerenciar a equipe' },
        { status: 403 }
      )
    }

    // Verificar se o usuário a ser adicionado existe e é um profissional de saúde
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, role: true }
    })

    if (!targetUser) {
      return NextResponse.json(
        { error: 'Profissional não encontrado' },
        { status: 404 }
      )
    }

    // Se for acesso de emergência
    if (isEmergency) {
      const result = await grantEmergencyAccess(
        patientId,
        userId,
        session.user.id,
        emergencyDuration || 60
      )
      
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 500 })
      }
      
      return NextResponse.json({
        success: true,
        message: `Acesso de emergência concedido para ${targetUser.name}`
      })
    }

    // Adicionar à equipe normalmente
    const result = await addToCareTeam(patientId, userId, session.user.id, {
      accessLevel: accessLevel || 'CONSULTATION',
      reason,
      validUntil: validUntil ? new Date(validUntil) : undefined,
      isPrimary
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `${targetUser.name} adicionado à equipe de atendimento`
    })
  } catch (error) {
    console.error('Error adding to care team:', error)
    return NextResponse.json(
      { error: 'Erro ao adicionar à equipe de atendimento' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const patientId = params.id
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'ID do profissional é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar se quem está removendo tem permissão
    const access = await checkPatientAccess(session.user.id, patientId, session.user.role)
    
    if (!access.hasAccess || (access.accessLevel !== 'FULL' && !access.isAdmin)) {
      return NextResponse.json(
        { error: 'Apenas o médico responsável ou administradores podem remover membros da equipe' },
        { status: 403 }
      )
    }

    // Não pode remover o médico responsável
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { primaryDoctorId: true }
    })

    if (patient?.primaryDoctorId === userId) {
      return NextResponse.json(
        { error: 'Não é possível remover o médico responsável. Altere o médico responsável primeiro.' },
        { status: 400 }
      )
    }

    const result = await removeFromCareTeam(patientId, userId)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Profissional removido da equipe de atendimento'
    })
  } catch (error) {
    console.error('Error removing from care team:', error)
    return NextResponse.json(
      { error: 'Erro ao remover da equipe de atendimento' },
      { status: 500 }
    )
  }
}
