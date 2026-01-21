import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'
import { BiometricDataType } from '@prisma/client'
import { BIOMETRIC_DATA_INFO } from '@/lib/biometric-data-info'
import { emailService } from '@/lib/email-service'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'

// GET - Listar convites enviados
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    const invites = await prisma.patientInvite.findMany({
      where: {
        invitedById: session.user.id,
        ...(status && { status: status as 'PENDING' | 'USED' | 'EXPIRED' })
      },
      include: {
        biometricConsents: true,
        patient: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(invites)
  } catch (error) {
    logger.error('Error fetching invites:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar convites' },
      { status: 500 }
    )
  }
}

// POST - Criar novo convite para paciente
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const {
      email,
      phone,
      patientName,
      birthDate,
      cpf,
      allergies,
      gender,
      emergencyContact,
      customMessage,
      // Accept legacy keys from older UIs as well
      message,
      requestedBiometrics, // Array de BiometricDataType
      requestedPermissions,
      assignedDoctorId,
      expiresInDays = 7
    } = body

    const resolvedMessage = customMessage ?? message
    const resolvedRequestedBiometrics = requestedBiometrics ?? requestedPermissions

    const sessionRole = (session.user as any)?.role as string | undefined
    const effectiveAssignedDoctorId =
      typeof assignedDoctorId === 'string' && assignedDoctorId.trim()
        ? assignedDoctorId.trim()
        : sessionRole === 'DOCTOR'
          ? session.user.id
          : null

    if (effectiveAssignedDoctorId) {
      const doctor = await prisma.user.findUnique({
        where: { id: effectiveAssignedDoctorId },
        select: { id: true, role: true, isActive: true },
      })
      if (!doctor || !doctor.isActive || doctor.role !== 'DOCTOR') {
        return NextResponse.json({ error: 'Médico responsável inválido' }, { status: 400 })
      }
    }

    if (!email || !patientName) {
      return NextResponse.json(
        { error: 'Email e nome são obrigatórios' },
        { status: 400 }
      )
    }

    // Verificar se já existe convite pendente (do mesmo profissional)
    const existingInvite = await prisma.patientInvite.findFirst({
      where: {
        email,
        invitedById: session.user.id,
        status: 'PENDING',
        expiresAt: { gt: new Date() },
      },
      include: {
        biometricConsents: true,
        invitedBy: {
          select: {
            name: true,
            speciality: true,
          },
        },
      },
    })

    // Gerar link de convite
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'

    if (existingInvite) {
      const existingInviteLink = `${baseUrl}/invite/${existingInvite.token}`

      // Tentar reenviar o convite por e-mail usando as configurações globais do sistema (ADMIN)
      let emailSent = false
      let emailEnabled = false
      let emailError: string | undefined
      try {
        const config = await emailService.getConfig()
        emailEnabled = Boolean(config.enabled)
        if (emailEnabled) {
          const inviterName = existingInvite.invitedBy?.name || 'Profissional'
          const inviterSpeciality = existingInvite.invitedBy?.speciality
          const subject = `Convite para cadastro no HealthCare`
          const safeMessage = existingInvite.customMessage ? String(existingInvite.customMessage).trim() : ''

          const result = await emailService.sendEmail({
            to: email,
            subject,
            html: `
              <div style="font-family: Arial, sans-serif; color: #111; line-height: 1.4;">
                <h2 style="margin: 0 0 8px;">Você recebeu um convite</h2>
                <p style="margin: 0 0 12px;">
                  <strong>${inviterName}</strong>${inviterSpeciality ? ` (${inviterSpeciality})` : ''}
                  convidou você para se cadastrar no sistema HealthCare.
                </p>
                ${safeMessage ? `
                  <div style="margin: 12px 0; padding: 12px; background: #f7f7f7; border-left: 4px solid #2563eb;">
                    <div style="font-size: 12px; color: #555; margin-bottom: 6px;">Mensagem:</div>
                    <div>${safeMessage.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
                  </div>
                ` : ''}
                <p style="margin: 16px 0;">
                  <a href="${existingInviteLink}" style="display: inline-block; background: #2563eb; color: #fff; text-decoration: none; padding: 10px 16px; border-radius: 6px;">Aceitar convite</a>
                </p>
                <p style="margin: 0; font-size: 12px; color: #666;">Se preferir, copie e cole este link no navegador:</p>
                <p style="margin: 6px 0 0; font-size: 12px; color: #2563eb; word-break: break-all;">${existingInviteLink}</p>
                <p style="margin: 16px 0 0; font-size: 12px; color: #666;">Este link expira em 7 dias.</p>
              </div>
            `,
            text: `Você recebeu um convite para se cadastrar no HealthCare. Acesse: ${existingInviteLink}`,
          })

          emailSent = Boolean(result.success)
          if (!emailSent && result.error) {
            emailError = result.error instanceof Error ? result.error.message : String(result.error)
          }
        }
      } catch (err) {
        emailSent = false
        emailError = err instanceof Error ? err.message : String(err)
      }

      return NextResponse.json({
        invite: existingInvite,
        inviteLink: existingInviteLink,
        inviteUrl: existingInviteLink,
        biometricInfo: BIOMETRIC_DATA_INFO,
        existingInvite: true,
        emailEnabled,
        emailSent,
        ...(emailError ? { emailError } : {}),
      })
    }

    // Gerar token único
    const token = randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + expiresInDays)

    const allowedBiometricTypes = new Set<string>(Object.values(BiometricDataType))
    const requestedList = Array.isArray(resolvedRequestedBiometrics)
      ? resolvedRequestedBiometrics.map((v: unknown) => String(v))
      : []

    const invalidRequested = requestedList.filter((t) => !allowedBiometricTypes.has(t))
    if (invalidRequested.length > 0) {
      return NextResponse.json(
        { error: `Tipo(s) de dado biométrico inválido(s): ${invalidRequested.join(', ')}` },
        { status: 400 }
      )
    }

    const finalRequested = requestedList.length > 0
      ? requestedList
      : Array.from(allowedBiometricTypes)

    // Criar convite
    const invite = await prisma.patientInvite.create({
      data: {
        email,
        phone: phone || null,
        patientName,
        token,
        expiresAt,
        birthDate: birthDate ? new Date(birthDate) : null,
        cpf: cpf || null,
        allergies: allergies || null,
        gender: gender || null,
        emergencyContact: emergencyContact || null,
        customMessage: resolvedMessage,
        invitedById: session.user.id,
        assignedDoctorId: effectiveAssignedDoctorId,
        // Criar consentimentos solicitados (ainda não aceitos)
        biometricConsents: {
          create: finalRequested.map(
            (dataType: string) => ({
              dataType: dataType as BiometricDataType,
              isGranted: false,
              purpose: BIOMETRIC_DATA_INFO[dataType]?.defaultPurpose || 'Monitoramento de saúde'
            })
          )
        }
      },
      include: {
        biometricConsents: true,
        invitedBy: {
          select: {
            name: true,
            speciality: true
          }
        }
      }
    })

    const inviteLink = `${baseUrl}/invite/${token}`

    // Tentar enviar o convite por e-mail usando as configurações globais do sistema (ADMIN)
    let emailSent = false
    let emailEnabled = false
    let emailError: string | undefined
    try {
      const config = await emailService.getConfig()
      emailEnabled = Boolean(config.enabled)
      if (emailEnabled) {
        const inviterName = invite.invitedBy?.name || 'Profissional'
        const inviterSpeciality = invite.invitedBy?.speciality
        const subject = `Convite para cadastro no HealthCare`
        const safeMessage = resolvedMessage ? String(resolvedMessage).trim() : ''

        const result = await emailService.sendEmail({
          to: email,
          subject,
          html: `
            <div style="font-family: Arial, sans-serif; color: #111; line-height: 1.4;">
              <h2 style="margin: 0 0 8px;">Você recebeu um convite</h2>
              <p style="margin: 0 0 12px;">
                <strong>${inviterName}</strong>${inviterSpeciality ? ` (${inviterSpeciality})` : ''}
                convidou você para se cadastrar no sistema HealthCare.
              </p>
              ${safeMessage ? `
                <div style="margin: 12px 0; padding: 12px; background: #f7f7f7; border-left: 4px solid #2563eb;">
                  <div style="font-size: 12px; color: #555; margin-bottom: 6px;">Mensagem:</div>
                  <div>${safeMessage.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
                </div>
              ` : ''}
              <p style="margin: 16px 0;">
                <a href="${inviteLink}" style="display: inline-block; background: #2563eb; color: #fff; text-decoration: none; padding: 10px 16px; border-radius: 6px;">Aceitar convite</a>
              </p>
              <p style="margin: 0; font-size: 12px; color: #666;">Se preferir, copie e cole este link no navegador:</p>
              <p style="margin: 6px 0 0; font-size: 12px; color: #2563eb; word-break: break-all;">${inviteLink}</p>
              <p style="margin: 16px 0 0; font-size: 12px; color: #666;">Este link expira em ${expiresInDays} dias.</p>
            </div>
          `,
          text: `Você recebeu um convite para se cadastrar no HealthCare. Acesse: ${inviteLink}`
        })

        emailSent = Boolean(result.success)
        if (!emailSent && result.error) {
          emailError = result.error instanceof Error ? result.error.message : String(result.error)
        }
      }
    } catch (err) {
      emailSent = false
      emailError = err instanceof Error ? err.message : String(err)
    }

    return NextResponse.json({
      invite,
      inviteLink,
      // Back-compat for older clients
      inviteUrl: inviteLink,
      biometricInfo: BIOMETRIC_DATA_INFO,
      emailEnabled,
      emailSent,
      ...(emailError ? { emailError } : {})
    }, { status: 201 })
  } catch (error) {
    logger.error('Error creating invite:', error)
    return NextResponse.json(
      { error: 'Erro ao criar convite' },
      { status: 500 }
    )
  }
}

// DELETE - Cancelar convite
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const inviteId = searchParams.get('id')

    if (!inviteId) {
      return NextResponse.json(
        { error: 'ID do convite é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar se o convite pertence ao usuário
    const invite = await prisma.patientInvite.findFirst({
      where: {
        id: inviteId,
        invitedById: session.user.id,
        status: 'PENDING'
      }
    })

    if (!invite) {
      return NextResponse.json(
        { error: 'Convite não encontrado' },
        { status: 404 }
      )
    }

    await prisma.patientInvite.update({
      where: { id: inviteId },
      data: { status: 'EXPIRED' }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Error canceling invite:', error)
    return NextResponse.json(
      { error: 'Erro ao cancelar convite' },
      { status: 500 }
    )
  }
}
