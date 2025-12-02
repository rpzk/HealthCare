import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'
import { BiometricDataType } from '@prisma/client'

// Definição dos tipos de dados biométricos com descrições
const BIOMETRIC_DATA_INFO: Record<string, {
  label: string
  description: string
  defaultPurpose: string
  icon: string
}> = {
  HEART_RATE: {
    label: 'Frequência Cardíaca',
    description: 'Batimentos cardíacos por minuto, coletados de smartwatches e monitores cardíacos',
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
    console.error('Error fetching invites:', error)
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
      customMessage,
      requestedBiometrics, // Array de BiometricDataType
      expiresInDays = 7
    } = body

    if (!email || !patientName) {
      return NextResponse.json(
        { error: 'Email e nome são obrigatórios' },
        { status: 400 }
      )
    }

    // Verificar se já existe convite pendente
    const existingInvite = await prisma.patientInvite.findFirst({
      where: {
        email,
        status: 'PENDING',
        expiresAt: { gt: new Date() }
      }
    })

    if (existingInvite) {
      return NextResponse.json(
        { error: 'Já existe um convite pendente para este email' },
        { status: 400 }
      )
    }

    // Gerar token único
    const token = randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + expiresInDays)

    // Criar convite
    const invite = await prisma.patientInvite.create({
      data: {
        email,
        phone,
        patientName,
        token,
        expiresAt,
        birthDate: birthDate ? new Date(birthDate) : null,
        cpf,
        customMessage,
        invitedById: session.user.id,
        // Criar consentimentos solicitados (ainda não aceitos)
        biometricConsents: {
          create: (requestedBiometrics || Object.keys(BIOMETRIC_DATA_INFO)).map(
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

    // Gerar link de convite
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const inviteLink = `${baseUrl}/invite/${token}`

    return NextResponse.json({
      invite,
      inviteLink,
      biometricInfo: BIOMETRIC_DATA_INFO
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating invite:', error)
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
    console.error('Error canceling invite:', error)
    return NextResponse.json(
      { error: 'Erro ao cancelar convite' },
      { status: 500 }
    )
  }
}

// Exportar info dos tipos biométricos para uso em outros lugares
export { BIOMETRIC_DATA_INFO }
