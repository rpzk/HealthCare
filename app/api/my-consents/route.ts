import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { BiometricDataType, ConsentAction } from '@prisma/client'

// GET - Listar consentimentos do paciente logado
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Buscar paciente vinculado ao usuário
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { patient: true }
    })

    if (!user?.patient) {
      return NextResponse.json(
        { error: 'Usuário não é um paciente' },
        { status: 400 }
      )
    }

    const consents = await prisma.patientBiometricConsent.findMany({
      where: { patientId: user.patient.id },
      orderBy: { dataType: 'asc' }
    })

    // Buscar histórico de alterações
    const auditLogs = await prisma.consentAuditLog.findMany({
      where: { patientId: user.patient.id },
      orderBy: { createdAt: 'desc' },
      take: 20
    })

    return NextResponse.json({
      consents,
      auditLogs,
      patientId: user.patient.id
    })
  } catch (error) {
    console.error('Error fetching consents:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar permissões' },
      { status: 500 }
    )
  }
}

// POST - Atualizar consentimentos
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Buscar paciente vinculado ao usuário
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { patient: true }
    })

    if (!user?.patient) {
      return NextResponse.json(
        { error: 'Usuário não é um paciente' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { dataType, isGranted, reason } = body

    if (!dataType || typeof isGranted !== 'boolean') {
      return NextResponse.json(
        { error: 'Dados inválidos' },
        { status: 400 }
      )
    }

    // Obter IP e User Agent para auditoria
    const ipAddress = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Buscar consentimento atual
    const existingConsent = await prisma.patientBiometricConsent.findUnique({
      where: {
        patientId_dataType: {
          patientId: user.patient.id,
          dataType: dataType as BiometricDataType
        }
      }
    })

    const previousValue = existingConsent?.isGranted ?? false
    const now = new Date()

    // Atualizar ou criar consentimento
    await prisma.patientBiometricConsent.upsert({
      where: {
        patientId_dataType: {
          patientId: user.patient.id,
          dataType: dataType as BiometricDataType
        }
      },
      create: {
        patientId: user.patient.id,
        dataType: dataType as BiometricDataType,
        isGranted,
        grantedAt: isGranted ? now : null,
        revokedAt: !isGranted ? now : null,
        purpose: 'Monitoramento de saúde',
        ipAddress,
        userAgent
      },
      update: {
        isGranted,
        grantedAt: isGranted ? now : existingConsent?.grantedAt,
        revokedAt: !isGranted ? now : null,
        ipAddress,
        userAgent,
        updatedAt: now
      }
    })

    // Criar log de auditoria
    let action: ConsentAction = 'MODIFIED'
    if (!previousValue && isGranted) action = 'GRANTED'
    else if (previousValue && !isGranted) action = 'REVOKED'

    await prisma.consentAuditLog.create({
      data: {
        patientId: user.patient.id,
        dataType: dataType as BiometricDataType,
        action,
        previousValue,
        newValue: isGranted,
        ipAddress,
        userAgent,
        reason: reason || (isGranted ? 'Permissão concedida pelo paciente' : 'Permissão revogada pelo paciente')
      }
    })

    return NextResponse.json({
      success: true,
      message: isGranted 
        ? 'Permissão concedida com sucesso' 
        : 'Permissão revogada com sucesso'
    })
  } catch (error) {
    console.error('Error updating consent:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar permissão' },
      { status: 500 }
    )
  }
}

// DELETE - Revogar todos os consentimentos
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Buscar paciente vinculado ao usuário
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { patient: true }
    })

    if (!user?.patient) {
      return NextResponse.json(
        { error: 'Usuário não é um paciente' },
        { status: 400 }
      )
    }

    // Obter IP e User Agent para auditoria
    const ipAddress = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    const now = new Date()

    // Buscar todos os consentimentos ativos
    const activeConsents = await prisma.patientBiometricConsent.findMany({
      where: {
        patientId: user.patient.id,
        isGranted: true
      }
    })

    // Revogar todos
    await prisma.patientBiometricConsent.updateMany({
      where: { patientId: user.patient.id },
      data: {
        isGranted: false,
        revokedAt: now
      }
    })

    // Criar logs de auditoria para cada revogação
    for (const consent of activeConsents) {
      await prisma.consentAuditLog.create({
        data: {
          patientId: user.patient.id,
          dataType: consent.dataType,
          action: 'REVOKED',
          previousValue: true,
          newValue: false,
          ipAddress,
          userAgent,
          reason: 'Revogação em massa solicitada pelo paciente'
        }
      })
    }

    return NextResponse.json({
      success: true,
      message: `${activeConsents.length} permissões foram revogadas`
    })
  } catch (error) {
    console.error('Error revoking all consents:', error)
    return NextResponse.json(
      { error: 'Erro ao revogar permissões' },
      { status: 500 }
    )
  }
}
