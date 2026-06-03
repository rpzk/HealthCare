import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { BiometricDataType, ConsentAction } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { emailService } from '@/lib/email-service'
import { logger } from '@/lib/logger'
import { encrypt, hashCPF } from '@/lib/crypto'
import { normalizeBloodType } from '@/lib/patient-schemas'
import { loadTermsForPatientInvite, prismaErrorHint } from '@/lib/patient-invite-utils'

export const runtime = 'nodejs'

function isLocalhostUrl(url: string) {
  return /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(url)
}

function resolveBaseUrl(request: NextRequest) {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL
  if (envUrl && !isLocalhostUrl(envUrl)) return envUrl

  const forwardedHost = request.headers.get('x-forwarded-host')
  const host = forwardedHost || request.headers.get('host')
  const proto = request.headers.get('x-forwarded-proto') || 'http'
  if (host) return `${proto}://${host}`

  return envUrl || 'http://localhost:3000'
}

// Info dos tipos biométricos
const BIOMETRIC_DATA_INFO: Record<string, {
  label: string
  description: string
  defaultPurpose: string
  icon: string
}> = {
  HEART_RATE: {
    label: 'Frequência Cardíaca',
    description: 'Batimentos cardíacos por minuto, coletados de smartwatches e monitores',
    defaultPurpose: 'Monitoramento cardiovascular e detecção de arritmias',
    icon: '❤️'
  },
  BLOOD_PRESSURE: {
    label: 'Pressão Arterial',
    description: 'Pressão sistólica e diastólica, coletada de monitores de pressão',
    defaultPurpose: 'Acompanhamento de hipertensão e saúde cardiovascular',
    icon: '🩺'
  },
  OXYGEN_SATURATION: {
    label: 'Saturação de Oxigênio',
    description: 'Nível de oxigênio no sangue (SpO2), coletado de oxímetros',
    defaultPurpose: 'Monitoramento respiratório e detecção de hipóxia',
    icon: '💨'
  },
  BLOOD_GLUCOSE: {
    label: 'Glicemia',
    description: 'Nível de glicose no sangue, coletado de glicosímetros e CGMs',
    defaultPurpose: 'Controle de diabetes e metabolismo da glicose',
    icon: '🩸'
  },
  BODY_TEMPERATURE: {
    label: 'Temperatura Corporal',
    description: 'Temperatura do corpo, coletada de termômetros digitais',
    defaultPurpose: 'Detecção de febre e monitoramento de saúde geral',
    icon: '🌡️'
  },
  WEIGHT: {
    label: 'Peso',
    description: 'Peso corporal em quilogramas, coletado de balanças inteligentes',
    defaultPurpose: 'Acompanhamento nutricional e metabólico',
    icon: '⚖️'
  },
  BODY_COMPOSITION: {
    label: 'Composição Corporal',
    description: 'Gordura corporal, massa muscular e água, de balanças de bioimpedância',
    defaultPurpose: 'Avaliação nutricional detalhada e fitness',
    icon: '📊'
  },
  STEPS: {
    label: 'Passos',
    description: 'Contagem de passos diários de smartwatches e pulseiras',
    defaultPurpose: 'Monitoramento de atividade física e sedentarismo',
    icon: '👣'
  },
  DISTANCE: {
    label: 'Distância',
    description: 'Distância percorrida a pé ou correndo',
    defaultPurpose: 'Acompanhamento de exercícios e mobilidade',
    icon: '📍'
  },
  CALORIES: {
    label: 'Calorias',
    description: 'Calorias queimadas durante atividades',
    defaultPurpose: 'Controle de gasto energético e peso',
    icon: '🔥'
  },
  ACTIVITY: {
    label: 'Atividade Física',
    description: 'Minutos de exercício e tipo de atividade',
    defaultPurpose: 'Promoção de estilo de vida ativo',
    icon: '🏃'
  },
  SLEEP: {
    label: 'Sono',
    description: 'Duração e qualidade do sono, fases REM e profundo',
    defaultPurpose: 'Avaliação da qualidade do sono e saúde mental',
    icon: '😴'
  },
  HEART_SOUNDS: {
    label: 'Sons Cardíacos',
    description: 'Gravações de ausculta cardíaca de estetoscópios digitais',
    defaultPurpose: 'Detecção de sopros e alterações cardíacas',
    icon: '🔊'
  },
  RESPIRATORY: {
    label: 'Dados Respiratórios',
    description: 'Frequência respiratória e espirometria',
    defaultPurpose: 'Monitoramento de doenças respiratórias',
    icon: '🌬️'
  },
  ECG: {
    label: 'Eletrocardiograma',
    description: 'Registro da atividade elétrica do coração',
    defaultPurpose: 'Detecção de arritmias e doenças cardíacas',
    icon: '📈'
  },
  OTHER: {
    label: 'Outros Dados',
    description: 'Outros tipos de dados de saúde',
    defaultPurpose: 'Monitoramento geral de saúde',
    icon: '📋'
  }
}

interface RouteParams {
  params: Promise<{ token: string }>
}

// GET - Validar token e retornar dados do convite
export async function GET(
  request: NextRequest,
  context: RouteParams
) {
  try {
    const { token } = await context.params

    const invite = await prisma.patientInvite.findUnique({
      where: { token },
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

    if (!invite) {
      return NextResponse.json(
        { error: 'Convite não encontrado' },
        { status: 404 }
      )
    }

    if (invite.status === 'USED') {
      return NextResponse.json(
        { error: 'Este convite já foi utilizado' },
        { status: 400 }
      )
    }

    if (invite.status === 'EXPIRED' || invite.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Este convite expirou' },
        { status: 400 }
      )
    }

    // Verificar se já existe usuário com este email
    const existingUser = await prisma.user.findUnique({
      where: { email: invite.email },
      select: {
        id: true,
        name: true,
        role: true,
        patient: {
          select: { id: true }
        }
      }
    })

    // Enriquecer consentimentos com informações
    const consentsWithInfo = invite.biometricConsents.map(consent => ({
      ...consent,
      info: BIOMETRIC_DATA_INFO[consent.dataType] || BIOMETRIC_DATA_INFO['OTHER']
    }))

    const terms = await loadTermsForPatientInvite()

    return NextResponse.json({
      invite: {
        id: invite.id,
        email: invite.email,
        patientName: invite.patientName,
        birthDate: invite.birthDate,
        cpf: invite.cpf,
        allergies: invite.allergies,
        gender: invite.gender,
        emergencyContact: invite.emergencyContact,
        customMessage: invite.customMessage,
        expiresAt: invite.expiresAt
      },
      invitedBy: invite.invitedBy,
      biometricConsents: consentsWithInfo,
      biometricInfo: BIOMETRIC_DATA_INFO,
      terms,
      // Informar sobre conta existente
      existingAccount: existingUser ? {
        exists: true,
        name: existingUser.name,
        role: existingUser.role,
        isAlreadyPatient: !!existingUser.patient,
        message: existingUser.patient 
          ? 'Você já possui cadastro como paciente. Faça login para gerenciar suas permissões.'
          : `Identificamos que você já tem uma conta como ${existingUser.role}. Ao aceitar, seu perfil de paciente será vinculado à sua conta existente.`
      } : null
    })
  } catch (error) {
    logger.error('Error validating invite:', error)
    return NextResponse.json(
      {
        error: 'Erro ao validar convite',
        hint: prismaErrorHint(error),
      },
      { status: 500 }
    )
  }
}

// POST - Aceitar convite e criar paciente
export async function POST(
  request: NextRequest,
  context: RouteParams
) {
  try {
    const { token } = await context.params
    const body = await request.json()
    const {
      acceptedConsents, // Array de dataTypes aceitos
      acceptedTermIds, // Array de ids de termos aceitos
      password,
      phone,
      address,
      birthDate,
      gender,
      cpf,
      bloodType,
      allergies,
      emergencyContact,
      additionalData
    } = body

    // Buscar convite
    const invite = await prisma.patientInvite.findUnique({
      where: { token },
      include: {
        biometricConsents: true,
        invitedBy: { select: { id: true, role: true } },
      }
    })

    if (!invite) {
      return NextResponse.json(
        { error: 'Convite não encontrado' },
        { status: 404 }
      )
    }

    if (invite.status !== 'PENDING' || invite.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Este convite não é mais válido' },
        { status: 400 }
      )
    }

    const effectiveBirthDate = birthDate ? new Date(birthDate) : invite.birthDate
    if (!effectiveBirthDate) {
      return NextResponse.json(
        { error: 'Data de nascimento é obrigatória para concluir o cadastro' },
        { status: 400 }
      )
    }

    // Verificar se já existe usuário com este email
    const existingUser = await prisma.user.findUnique({
      where: { email: invite.email },
      include: { patient: true }
    })

    // Se usuário existe E já é paciente
    if (existingUser?.patient) {
      return NextResponse.json(
        { 
          error: 'Você já possui cadastro como paciente. Faça login para gerenciar suas permissões.',
          existingAccount: true,
          isPatient: true
        },
        { status: 400 }
      )
    }

    // Obter IP e User Agent para auditoria
    const ipAddress = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    const now = new Date()

    const responsibleDoctorId =
      invite.assignedDoctorId || (invite.invitedBy?.role === 'DOCTOR' ? invite.invitedById : null)

    // Criar paciente e usuário em transação
    const result = await prisma.$transaction(async (tx) => {
      const cpfRaw = (cpf || invite.cpf || '').toString().trim()
      const cpfDigits = cpfRaw ? cpfRaw.replace(/\D/g, '') : ''
      const cpfToStore = cpfDigits ? encrypt(cpfDigits) : null
      const cpfHash = cpfDigits ? hashCPF(cpfDigits) : null

      // 1. Criar registro de paciente
      const patient = await tx.patient.create({
        data: {
          name: invite.patientName,
          email: invite.email,
          phone: phone || invite.phone,
          birthDate: effectiveBirthDate,
          gender: gender || invite.gender || 'OTHER',
          cpf: cpfToStore,
          cpfHash,
          allergies: allergies || invite.allergies,
          bloodType: normalizeBloodType(bloodType),
          emergencyContact: emergencyContact || invite.emergencyContact,
          address,
        }
      })

      let userId = existingUser?.id

      // 2. Se NÃO existe usuário, criar um novo
      if (!existingUser) {
        if (!password) {
          throw new Error('Senha é obrigatória para novos usuários')
        }
        const hashedPassword = await bcrypt.hash(password, 12)
        
        const newUser = await tx.user.create({
          data: {
            email: invite.email,
            name: invite.patientName,
            role: 'PATIENT',
            password: hashedPassword,
            patientId: patient.id
          }
        })
        userId = newUser.id
      } else {
        // 3. Se usuário existe, apenas vincular ao paciente
        await tx.user.update({
          where: { id: existingUser.id },
          data: { patientId: patient.id }
        })
      }

      // 4. Atualizar convite
      await tx.patientInvite.update({
        where: { id: invite.id },
        data: {
          status: 'USED',
          consentAcceptedAt: now,
          consentIpAddress: ipAddress,
          consentUserAgent: userAgent,
          patientId: patient.id
        }
      })

      // 5. Consentimentos: remove placeholders do convite e grava no paciente (evita P2002 em patientId+dataType)
      await tx.patientBiometricConsent.deleteMany({
        where: { inviteId: invite.id },
      })

      for (const consent of invite.biometricConsents) {
        const isAccepted = acceptedConsents?.includes(consent.dataType) ?? false
        if (!isAccepted) continue

        await tx.patientBiometricConsent.upsert({
          where: {
            patientId_dataType: {
              patientId: patient.id,
              dataType: consent.dataType,
            },
          },
          create: {
            patientId: patient.id,
            dataType: consent.dataType,
            isGranted: true,
            grantedAt: now,
            purpose: consent.purpose,
            ipAddress,
            userAgent,
          },
          update: {
            isGranted: true,
            grantedAt: now,
            ipAddress,
            userAgent,
          },
        })

        logger.info('[patient-invites] Consentimento biométrico', {
          patientId: patient.id,
          dataType: consent.dataType,
          action: 'GRANTED',
          ipAddress,
          userAgent,
        })
      }

      // 7. Aceitar termos (somente os que o usuário marcou)
      const activeTerms = await loadTermsForPatientInvite()

      const requiredTermIds = new Set(activeTerms.map((t) => t.id))
      const providedTermIds = Array.isArray(acceptedTermIds) ? acceptedTermIds : []

      for (const requiredId of requiredTermIds) {
        if (!providedTermIds.includes(requiredId)) {
          throw new Error('Você precisa aceitar todos os termos para continuar')
        }
      }

      const termsById = new Map(activeTerms.map((t) => [t.id, t] as const))

      for (const termId of providedTermIds) {
        const term = termsById.get(termId)
        if (!term) continue

        const existingAcceptance = await tx.termAcceptance.findFirst({
          where: { userId: userId!, termId: term.id },
        })

        if (!existingAcceptance) {
          await tx.termAcceptance.create({
            data: {
              userId: userId!,
              termId: term.id,
              termSlug: term.slug,
              termTitle: term.title,
              termVersion: term.version,
              termContent: term.content,
              ipAddress,
              userAgent,
            },
          })
        }
      }

      // 8. Vincular automaticamente o paciente ao médico responsável (care team)
      if (responsibleDoctorId) {
        // Garantir que apenas um membro primário exista
        await tx.patientCareTeam.updateMany({
          where: { patientId: patient.id, userId: { not: responsibleDoctorId } },
          data: { isPrimary: false },
        })

        await tx.patientCareTeam.upsert({
          where: {
            patientId_userId: {
              patientId: patient.id,
              userId: responsibleDoctorId,
            },
          },
          update: {
            accessLevel: 'FULL',
            isActive: true,
            isPrimary: true,
            addedById: invite.invitedById,
            reason: 'Vínculo automático via convite de cadastro',
          },
          create: {
            patientId: patient.id,
            userId: responsibleDoctorId,
            accessLevel: 'FULL',
            isActive: true,
            isPrimary: true,
            addedById: invite.invitedById,
            reason: 'Vínculo automático via convite de cadastro',
          },
        })
      }

      return { patient, userId, isExistingUser: !!existingUser }
    })

    return NextResponse.json({
      success: true,
      message: result.isExistingUser 
        ? 'Perfil de paciente vinculado à sua conta existente!'
        : 'Cadastro realizado com sucesso!',
      patient: {
        id: result.patient.id,
        name: result.patient.name,
        email: result.patient.email
      },
      isExistingUser: result.isExistingUser
    }, { status: 201 })
  } catch (error) {
    logger.error('Error accepting invite:', error)

    if (error instanceof Error && error.message === 'Você precisa aceitar todos os termos para continuar') {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Erro ao processar aceite',
        hint: prismaErrorHint(error),
      },
      { status: 500 }
    )
  }
}

// PATCH - Reenviar convite por e-mail (apenas profissional que criou ou ADMIN)
export async function PATCH(
  request: NextRequest,
  context: RouteParams
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { token } = await context.params

    const invite = await prisma.patientInvite.findUnique({
      where: { token },
      include: {
        invitedBy: {
          select: {
            id: true,
            name: true,
            speciality: true,
          },
        },
      },
    })

    if (!invite) {
      return NextResponse.json({ error: 'Convite não encontrado' }, { status: 404 })
    }

    const userRole = (session.user as any)?.role as string | undefined
    const isAdmin = userRole === 'ADMIN'
    const isOwner = invite.invitedById === session.user.id
    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    if (invite.status !== 'PENDING') {
      return NextResponse.json({ error: 'Convite não está pendente' }, { status: 400 })
    }
    if (invite.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Convite expirou' }, { status: 400 })
    }

    const config = await emailService.getConfig()
    if (!config.enabled) {
      return NextResponse.json({ error: 'Envio de e-mail está desabilitado no sistema' }, { status: 400 })
    }

    const baseUrl = resolveBaseUrl(request)
    const inviteLink = `${baseUrl}/invite/${token}`

    const inviterName = invite.invitedBy?.name || 'Profissional'
    const inviterSpeciality = invite.invitedBy?.speciality
    const safeMessage = invite.customMessage ? String(invite.customMessage).trim() : ''

    const result = await emailService.sendEmail({
      to: invite.email,
      subject: '📩 Convite para cadastro no HealthCare',
      html: `
        <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 24px; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 22px;">
              <a href="${inviteLink}" style="color: #fff; text-decoration: none;">📩 Convite de Cadastro</a>
            </h1>
          </div>

          <div style="background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; margin: 0 0 10px;">Olá!</p>

            <p style="font-size: 15px; color: #4b5563; margin: 0 0 14px;">
              <strong>${inviterName}</strong>${inviterSpeciality ? ` (${inviterSpeciality})` : ''}
              convidou você para se cadastrar no sistema HealthCare.
            </p>

            ${safeMessage ? `
              <div style="margin: 12px 0; padding: 12px; background: #fff; border-left: 4px solid #2563eb;">
                <div style="font-size: 12px; color: #555; margin-bottom: 6px;">Mensagem:</div>
                <div style="font-size: 14px; color: #111;">${safeMessage.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
              </div>
            ` : ''}

            <div style="text-align: center; margin: 22px 0;">
              <a href="${inviteLink}" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold;">
                Aceitar convite
              </a>
            </div>

            <p style="margin: 0; font-size: 12px; color: #6b7280;">Se preferir, copie e cole este link no navegador:</p>
            <p style="margin: 6px 0 0; font-size: 12px; color: #2563eb; word-break: break-all;">${inviteLink}</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
            <p style="margin: 0; font-size: 12px; color: #9ca3af;">Este link expira em ${Math.max(1, Math.ceil((invite.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} dias.</p>
          </div>
        </div>
      `,
      text: `Reenvio de convite para cadastro no HealthCare. Acesse: ${inviteLink}`,
    })

    if (!result.success) {
      const message = result.error instanceof Error ? result.error.message : String(result.error || 'Falha ao enviar e-mail')
      return NextResponse.json({ error: message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Error resending invite:', error)
    return NextResponse.json({ error: 'Erro ao reenviar convite' }, { status: 500 })
  }
}
