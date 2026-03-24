import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { grantEmergencyAccess, checkPatientAccess } from '@/lib/patient-access'

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
    const userId = session.user.id
    
    // Check if user is a healthcare professional
    const role = (session.user as { role?: string })?.role || ''
    if (['ADMIN', 'MANAGER', 'RECEPTIONIST', 'PATIENT'].includes(role)) {
      return NextResponse.json({ error: 'Ação permitida apenas para profissionais de saúde' }, { status: 403 })
    }

    const { reason, durationMinutes } = await request.json()

    if (!reason || reason.length < 5) {
      return NextResponse.json({ error: 'É necessário fornecer uma justificativa médica válida' }, { status: 400 })
    }

    // Verify patient exists
    const patient = await prisma.patient.findUnique({ where: { id: patientId } })
    if (!patient) {
      return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })
    }

    // Check if they already have access
    const currentAccess = await checkPatientAccess(userId, patientId, role)
    if (currentAccess.hasAccess && currentAccess.accessLevel !== 'VIEW_ONLY') {
      return NextResponse.json({ success: true, message: 'Você já possui acesso a este paciente' })
    }

    const duration = durationMinutes || 120 // 2 hours default

    // Grant emergency access (self-granted)
    const result = await grantEmergencyAccess(patientId, userId, userId, duration)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    // CREATE AUDIT LOG FOR EMERGENCY ACCESS
    await prisma.auditLog.create({
      data: {
        userId: userId,
        userEmail: session.user.email || '',
        userRole: role,
        action: 'EMERGENCY_ACCESS_GRANTED',
        resourceId: patientId,
        resourceType: 'PATIENT_RECORD',
        success: true,
        metadata: {
          reason: reason,
          durationMinutes: duration,
          selfGranted: true
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Acesso de emergência concedido com sucesso'
    })
  } catch (error) {
    logger.error('Error granting emergency access:', error)
    return NextResponse.json(
      { error: 'Erro ao processar solicitação de acesso' },
      { status: 500 }
    )
  }
}
