/**
 * API de Oposição ao Tratamento - LGPD Art. 18, §2º
 * 
 * Permite que o paciente se oponha a tratamentos específicos de seus dados
 */

export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { z } from 'zod'

const createOppositionSchema = z.object({
  treatmentType: z.enum([
    'MARKETING',
    'AI_ANALYSIS',
    'DATA_SHARING',
    'PROFILING',
    'RESEARCH',
    'BIOMETRIC',
    'TELEMEDICINE_RECORD',
    'ALL'
  ]),
  treatmentDetails: z.string().optional(),
  reason: z.string().min(10, 'Informe o motivo da oposição (mínimo 10 caracteres)')
})

// Descrições dos tipos de tratamento
const treatmentDescriptions: Record<string, { title: string; description: string; essential: boolean }> = {
  MARKETING: {
    title: 'Comunicações de Marketing',
    description: 'Recebimento de comunicações promocionais, newsletters e ofertas de serviços adicionais.',
    essential: false
  },
  AI_ANALYSIS: {
    title: 'Análise por Inteligência Artificial',
    description: 'Uso de seus dados para análises automatizadas por IA, como sugestões de diagnóstico ou otimização de tratamentos.',
    essential: false
  },
  DATA_SHARING: {
    title: 'Compartilhamento com Terceiros',
    description: 'Compartilhamento de dados com parceiros, laboratórios ou outros prestadores de serviço (exceto quando obrigatório por lei).',
    essential: false
  },
  PROFILING: {
    title: 'Perfilamento e Decisões Automatizadas',
    description: 'Criação de perfis baseados em seus dados para personalização de serviços ou tomada de decisões automatizadas.',
    essential: false
  },
  RESEARCH: {
    title: 'Uso em Pesquisas',
    description: 'Utilização de seus dados (anonimizados) para fins de pesquisa científica ou estatística.',
    essential: false
  },
  BIOMETRIC: {
    title: 'Coleta de Dados Biométricos',
    description: 'Coleta de dados biométricos como impressão digital ou reconhecimento facial para autenticação.',
    essential: false
  },
  TELEMEDICINE_RECORD: {
    title: 'Gravação de Teleconsultas',
    description: 'Gravação de vídeo/áudio das suas teleconsultas para fins de documentação médica.',
    essential: false
  },
  ALL: {
    title: 'Todos os Tratamentos Não Essenciais',
    description: 'Oposição a todos os tratamentos de dados que não são estritamente necessários para a prestação do serviço de saúde.',
    essential: false
  }
}

// GET - Listar oposições do paciente
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
      return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })
    }

    const oppositions = await prisma.treatmentOpposition.findMany({
      where: { patientId: user.patient.id },
      orderBy: { createdAt: 'desc' }
    })

    // Adicionar descrições
    const oppositionsWithDescriptions = oppositions.map(op => ({
      ...op,
      treatmentInfo: treatmentDescriptions[op.treatmentType] || {}
    }))

    // Listar tipos de tratamento disponíveis
    const availableTreatments = Object.entries(treatmentDescriptions).map(([key, value]) => ({
      type: key,
      ...value,
      hasOpposition: oppositions.some(o => o.treatmentType === key && o.status === 'APPROVED')
    }))

    return NextResponse.json({
      oppositions: oppositionsWithDescriptions,
      availableTreatments
    })
  } catch (error) {
    console.error('[TreatmentOpposition] GET error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// POST - Criar nova oposição
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { patient: true }
    })

    if (!user?.patient) {
      return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })
    }

    const body = await request.json()
    const validation = createOppositionSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const data = validation.data

    // Verificar se já existe oposição pendente ou aprovada para este tratamento
    const existingOpposition = await prisma.treatmentOpposition.findFirst({
      where: {
        patientId: user.patient.id,
        treatmentType: data.treatmentType,
        status: { in: ['PENDING', 'APPROVED'] }
      }
    })

    if (existingOpposition) {
      return NextResponse.json(
        { 
          error: existingOpposition.status === 'PENDING' 
            ? 'Você já tem uma solicitação de oposição pendente para este tratamento'
            : 'Você já possui uma oposição ativa para este tratamento'
        },
        { status: 400 }
      )
    }

    // Criar oposição
    const opposition = await prisma.treatmentOpposition.create({
      data: {
        patientId: user.patient.id,
        treatmentType: data.treatmentType,
        treatmentDetails: data.treatmentDetails,
        reason: data.reason,
        status: 'PENDING',
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    })

    // Log de auditoria
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        userEmail: session.user.email || 'unknown',
        userRole: session.user.role || 'PATIENT',
        action: 'TREATMENT_OPPOSITION_REQUESTED',
        resourceType: 'TreatmentOpposition',
        resourceId: opposition.id,
        metadata: {
          treatmentType: data.treatmentType,
          patientId: user.patient.id
        },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    })

    // Criar notificação para admins
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true }
    })

    if (admins.length > 0) {
      await prisma.notification.createMany({
        data: admins.map(admin => ({
          userId: admin.id,
          type: 'SYSTEM' as const,
          priority: 'medium' as const,
          title: '📋 Nova Solicitação de Oposição ao Tratamento',
          message: `O paciente ${user.patient!.name} solicitou oposição ao tratamento: ${treatmentDescriptions[data.treatmentType]?.title || data.treatmentType}`,
          metadata: {
            oppositionId: opposition.id,
            patientId: user.patient!.id,
            treatmentType: data.treatmentType
          }
        }))
      })
    }

    return NextResponse.json({
      success: true,
      opposition: {
        ...opposition,
        treatmentInfo: treatmentDescriptions[opposition.treatmentType]
      },
      message: 'Sua solicitação de oposição foi registrada e será analisada em breve.'
    }, { status: 201 })
  } catch (error) {
    console.error('[TreatmentOpposition] POST error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
