import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { StratumLevel } from '@prisma/client'
import { logger } from '@/lib/logger'

// GET - Buscar assessments do usuário ou todos (se admin)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const status = searchParams.get('status')
    const jobRoleId = searchParams.get('jobRoleId')
    const view = searchParams.get('view')

    const where: Record<string, unknown> = {}
    
    // Admin pode ver todos, outros só os próprios
    if (session.user.role === 'ADMIN' && userId) {
      where.userId = userId
    } else if (session.user.role !== 'ADMIN') {
      if (view === 'mor') {
        where.morUserId = session.user.id
      } else {
        where.userId = session.user.id
      }
    }

    if (status) {
      where.status = status
    }

    if (jobRoleId) {
      where.jobRoleId = jobRoleId
    }

    const assessments = await prisma.stratumAssessment.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        responses: {
          include: {
            question: true
          }
        },
        jobRole: {
          select: {
            id: true,
            title: true,
            requiredMinStratum: true,
            requiredMaxStratum: true
          }
        },
        morUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { startedAt: 'desc' }
    })

    return NextResponse.json({ assessments })
  } catch (error) {
    logger.error('Erro ao buscar assessments:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar assessments' },
      { status: 500 }
    )
  }
}

// POST - Iniciar novo assessment
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const { userId, assessmentType, jobRoleId } = body

    // Verificar se o usuário pode criar assessment para outro
    const targetUserId = userId || session.user.id
    if (targetUserId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    // Role-assessment (RO/SST): precisa de jobRoleId e deve ser MANAGER
    const isRoleAssessment = typeof jobRoleId === 'string' && jobRoleId.trim().length > 0
    if (isRoleAssessment && (assessmentType || 'SELF') !== 'MANAGER') {
      return NextResponse.json(
        { error: 'Para role-assessment, assessmentType deve ser MANAGER.' },
        { status: 400 }
      )
    }

    // Se for role-assessment, validar jobRole e inferir MoR (manager do manager)
    let morUserId: string | null = null
    if (isRoleAssessment) {
      const role = await prisma.jobRole.findUnique({ where: { id: jobRoleId } })
      if (!role) {
        return NextResponse.json({ error: 'JobRole não encontrado' }, { status: 404 })
      }

      const evaluator = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { managerUserId: true }
      })

      morUserId = evaluator?.managerUserId || null
      if (!morUserId) {
        return NextResponse.json(
          { error: 'MoR não configurado para o avaliador (defina o gestor do gestor).' },
          { status: 400 }
        )
      }
    }

    // Verificar se já existe um assessment em andamento
    const existing = await prisma.stratumAssessment.findFirst({
      where: {
        userId: targetUserId,
        status: 'IN_PROGRESS',
        ...(isRoleAssessment ? { jobRoleId } : { jobRoleId: null })
      }
    })

    if (existing) {
      return NextResponse.json({ 
        assessment: existing,
        message: 'Assessment em andamento encontrado'
      })
    }

    // Criar novo assessment
    const assessment = await prisma.stratumAssessment.create({
      data: {
        userId: targetUserId,
        assessmentType: assessmentType || 'SELF',
        status: 'IN_PROGRESS',
        jobRoleId: isRoleAssessment ? jobRoleId : null,
        morUserId: isRoleAssessment ? morUserId : null,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 ano
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        jobRole: {
          select: {
            id: true,
            title: true
          }
        },
        morUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json({ assessment })
  } catch (error) {
    logger.error('Erro ao criar assessment:', error)
    return NextResponse.json(
      { error: 'Erro ao criar assessment' },
      { status: 500 }
    )
  }
}

// PATCH - Atualizar assessment (completar, cancelar)
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const { assessmentId, action } = body

    const assessment = await prisma.stratumAssessment.findUnique({
      where: { id: assessmentId },
      include: {
        responses: {
          include: { question: true }
        }
      }
    })

    if (!assessment) {
      return NextResponse.json({ error: 'Assessment não encontrado' }, { status: 404 })
    }

    if (action === 'validate_mor') {
      const evidenceRaw = body.evidence
      const evidence = typeof evidenceRaw === 'string' ? evidenceRaw.trim() : ''
      if (!evidence) {
        return NextResponse.json(
          { error: 'Evidência obrigatória na validação do MoR.' },
          { status: 400 }
        )
      }

      // Apenas MoR (ou admin) pode validar
      if (session.user.role !== 'ADMIN' && assessment.morUserId !== session.user.id) {
        return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
      }

      if (!assessment.jobRoleId || assessment.assessmentType !== 'MANAGER') {
        return NextResponse.json(
          { error: 'Este assessment não é um role-assessment.' },
          { status: 400 }
        )
      }

      if (assessment.status !== 'COMPLETED') {
        return NextResponse.json(
          { error: 'O gestor deve concluir o assessment antes da validação do MoR.' },
          { status: 400 }
        )
      }

      if (!assessment.calculatedStratum || !assessment.timeSpanMonths) {
        return NextResponse.json(
          { error: 'Assessment sem resultado calculado.' },
          { status: 400 }
        )
      }

      const validatedAt = new Date()

      const updated = await prisma.stratumAssessment.update({
        where: { id: assessmentId },
        data: {
          morValidatedAt: validatedAt,
          morEvidence: evidence
        }
      })

      // Atualizar perfil oficial do cargo (JobStratumProfile)
      const existingProfile = await prisma.jobStratumProfile.findUnique({
        where: { jobRoleId: assessment.jobRoleId }
      })

      let complexityFactors: string | null = null
      if (existingProfile?.complexityFactors) {
        try {
          const parsed = JSON.parse(existingProfile.complexityFactors)
          if (parsed && typeof parsed === 'object') {
            (parsed as any).lastTsdValidation = {
              assessmentId,
              validatedAt: validatedAt.toISOString(),
              validatedByUserId: session.user.id,
              evidence,
              assessedStratum: assessment.calculatedStratum,
              timeSpanMonths: assessment.timeSpanMonths
            }
            complexityFactors = JSON.stringify(parsed)
          }
        } catch {
          complexityFactors = JSON.stringify({
            lastTsdValidation: {
              assessmentId,
              validatedAt: validatedAt.toISOString(),
              validatedByUserId: session.user.id,
              evidence,
              assessedStratum: assessment.calculatedStratum,
              timeSpanMonths: assessment.timeSpanMonths
            }
          })
        }
      }
      if (!complexityFactors) {
        complexityFactors = JSON.stringify({
          lastTsdValidation: {
            assessmentId,
            validatedAt: validatedAt.toISOString(),
            validatedByUserId: session.user.id,
            evidence,
            assessedStratum: assessment.calculatedStratum,
            timeSpanMonths: assessment.timeSpanMonths
          }
        })
      }

      const profile = await prisma.jobStratumProfile.upsert({
        where: { jobRoleId: assessment.jobRoleId },
        update: {
          minStratum: assessment.calculatedStratum,
          optimalStratum: assessment.calculatedStratum,
          maxStratum: null,
          timeSpanMinMonths: assessment.timeSpanMonths,
          timeSpanMaxMonths: null,
          complexityFactors
        },
        create: {
          jobRoleId: assessment.jobRoleId,
          minStratum: assessment.calculatedStratum,
          optimalStratum: assessment.calculatedStratum,
          maxStratum: null,
          timeSpanMinMonths: assessment.timeSpanMonths,
          timeSpanMaxMonths: null,
          complexityFactors
        }
      })

      return NextResponse.json({ assessment: updated, jobStratumProfile: profile })
    }

    // Verificar permissão padrão
    if (assessment.userId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    if (action === 'complete') {
      if (!assessment.responses || assessment.responses.length === 0) {
        return NextResponse.json(
          { error: 'Sem respostas. Responda o questionário ou use a avaliação rápida (Time Span).' },
          { status: 400 }
        )
      }

      // Calcular resultado
      const result = calculateStratumResult(assessment.responses)

      if (!result) {
        return NextResponse.json(
          { error: 'Não foi possível calcular o resultado. Verifique se as respostas têm mapeamento de Time Span.' },
          { status: 400 }
        )
      }

      const updated = await prisma.stratumAssessment.update({
        where: { id: assessmentId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          calculatedStratum: result.stratum,
          timeSpanMonths: result.timeSpanMonths,
          confidenceScore: result.confidence
        }
      })

      return NextResponse.json({ 
        assessment: updated,
        result
      })
    }

    if (action === 'complete_manual') {
      const timeSpanMonthsRaw = body.timeSpanMonths
      const confidenceScoreRaw = body.confidenceScore
      const notesRaw = body.notes

      const timeSpanMonths = Number(timeSpanMonthsRaw)
      if (!Number.isFinite(timeSpanMonths) || timeSpanMonths <= 0) {
        return NextResponse.json(
          { error: 'timeSpanMonths inválido' },
          { status: 400 }
        )
      }

      let confidenceScore: number | null = null
      if (confidenceScoreRaw !== undefined && confidenceScoreRaw !== null && confidenceScoreRaw !== '') {
        const parsedConfidence = Number(confidenceScoreRaw)
        if (!Number.isFinite(parsedConfidence) || parsedConfidence < 0 || parsedConfidence > 1) {
          return NextResponse.json(
            { error: 'confidenceScore inválido (esperado 0..1)' },
            { status: 400 }
          )
        }
        confidenceScore = parsedConfidence
      }

      const notes = typeof notesRaw === 'string' && notesRaw.trim().length > 0 ? notesRaw.trim() : null
      const stratum = timeSpanToStratum(timeSpanMonths)

      const updated = await prisma.stratumAssessment.update({
        where: { id: assessmentId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          calculatedStratum: stratum,
          timeSpanMonths: Math.round(timeSpanMonths),
          confidenceScore,
          notes
        }
      })

      return NextResponse.json({
        assessment: updated,
        result: {
          stratum,
          timeSpanMonths: Math.round(timeSpanMonths),
          confidence: confidenceScore
        }
      })
    }

    if (action === 'cancel') {
      const updated = await prisma.stratumAssessment.update({
        where: { id: assessmentId },
        data: { status: 'CANCELLED' }
      })
      return NextResponse.json({ assessment: updated })
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
  } catch (error) {
    logger.error('Erro ao atualizar assessment:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar assessment' },
      { status: 500 }
    )
  }
}

// Função para calcular o resultado do assessment
interface ResponseWithQuestion {
  timeSpanValue: number | null
  score: number | null
  question: {
    weight: number
    stratumMapping: string
  }
  answer: string
}

function calculateStratumResult(responses: ResponseWithQuestion[]) {
  if (responses.length === 0) return null

  let weightedTimeSpan = 0
  let validResponses = 0
  let validWeightSum = 0

  for (const response of responses) {
    const weight = response.question.weight
    if (response.timeSpanValue !== null && response.timeSpanValue !== undefined) {
      weightedTimeSpan += response.timeSpanValue * weight
      validResponses++
      validWeightSum += weight
    }
  }

  if (validResponses === 0 || validWeightSum === 0) return null

  // Calcular time span médio ponderado
  const avgTimeSpan = weightedTimeSpan / validWeightSum

  // Mapear time span para estrato (baseado em Elliott Jaques)
  const stratum = timeSpanToStratum(avgTimeSpan)

  // Confiança baseada em quantas perguntas foram respondidas
  const totalQuestions = responses.length
  const confidence = validResponses / totalQuestions

  return {
    stratum,
    timeSpanMonths: Math.round(avgTimeSpan),
    confidence: Math.round(confidence * 100) / 100
  }
}

function timeSpanToStratum(months: number): StratumLevel {
  // Baseado na teoria de Elliott Jaques
  // S1: 1 dia - 3 meses
  // S2: 3 meses - 1 ano
  // S3: 1 - 2 anos
  // S4: 2 - 5 anos
  // S5: 5 - 10 anos
  // S6: 10 - 20 anos
  // S7: 20 - 50 anos
  // S8: 50+ anos

  if (months <= 3) return 'S1'
  if (months <= 12) return 'S2'
  if (months <= 24) return 'S3'
  if (months <= 60) return 'S4'
  if (months <= 120) return 'S5'
  if (months <= 240) return 'S6'
  if (months <= 600) return 'S7'
  return 'S8'
}
