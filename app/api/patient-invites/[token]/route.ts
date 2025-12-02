import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { BiometricDataType, ConsentAction } from '@prisma/client'
import bcrypt from 'bcryptjs'

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

    return NextResponse.json({
      invite: {
        id: invite.id,
        email: invite.email,
        patientName: invite.patientName,
        birthDate: invite.birthDate,
        customMessage: invite.customMessage,
        expiresAt: invite.expiresAt
      },
      invitedBy: invite.invitedBy,
      biometricConsents: consentsWithInfo,
      biometricInfo: BIOMETRIC_DATA_INFO,
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
    console.error('Error validating invite:', error)
    return NextResponse.json(
      { error: 'Erro ao validar convite' },
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
      password,
      phone,
      address,
      birthDate,
      gender,
      additionalData
    } = body

    // Buscar convite
    const invite = await prisma.patientInvite.findUnique({
      where: { token },
      include: {
        biometricConsents: true
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

    // Criar paciente e usuário em transação
    const result = await prisma.$transaction(async (tx) => {
      // 1. Criar registro de paciente
      const patient = await tx.patient.create({
        data: {
          name: invite.patientName,
          email: invite.email,
          phone: phone || invite.phone,
          birthDate: birthDate ? new Date(birthDate) : (invite.birthDate || new Date('1990-01-01')),
          gender: gender || 'OTHER',
          cpf: invite.cpf,
          address,
          // Se usuário existente, vincular
          userId: existingUser?.id
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

      // 5. Atualizar consentimentos
      for (const consent of invite.biometricConsents) {
        const isAccepted = acceptedConsents?.includes(consent.dataType) ?? false
        
        await tx.patientBiometricConsent.update({
          where: { id: consent.id },
          data: {
            patientId: patient.id,
            isGranted: isAccepted,
            grantedAt: isAccepted ? now : null,
            ipAddress,
            userAgent
          }
        })

        // 6. Criar log de auditoria
        await tx.consentAuditLog.create({
          data: {
            patientId: patient.id,
            dataType: consent.dataType,
            action: isAccepted ? 'GRANTED' : 'REVOKED',
            previousValue: false,
            newValue: isAccepted,
            ipAddress,
            userAgent,
            reason: existingUser 
              ? 'Aceite de convite - usuário existente vinculado como paciente'
              : 'Aceite inicial no convite - novo cadastro'
          }
        })
      }

      // 7. Aceitar termos de uso (se existirem)
      const activeTerms = await tx.term.findMany({
        where: { isActive: true }
      })

      for (const term of activeTerms) {
        // Verificar se usuário já aceitou este termo
        const existingAcceptance = await tx.termAcceptance.findFirst({
          where: { userId: userId!, termId: term.id }
        })
        
        if (!existingAcceptance) {
          await tx.termAcceptance.create({
            data: {
              userId: userId!,
              termId: term.id,
              ipAddress,
              userAgent
            }
          })
        }
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
    console.error('Error accepting invite:', error)
    return NextResponse.json(
      { error: 'Erro ao processar aceite' },
      { status: 500 }
    )
  }
}
