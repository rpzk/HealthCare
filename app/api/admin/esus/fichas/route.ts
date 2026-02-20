/**
 * API e-SUS AB - Fichas Individuais
 * 
 * GET - Lista fichas geradas
 * POST - Gera ficha individual para uma consulta
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ESUSService } from '@/lib/esus-service'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const runtime = 'nodejs'

// ============ GET - Lista Fichas ============

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const status = searchParams.get('status')
    const fichaType = searchParams.get('fichaType')

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (fichaType) where.fichaType = fichaType

    const [fichas, total] = await Promise.all([
      prisma.eSUSSubmission.findMany({
        where,
        orderBy: { submittedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.eSUSSubmission.count({ where })
    ])

    return NextResponse.json({
      fichas,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('[e-SUS Fichas] Erro GET:', error)
    return NextResponse.json(
      { error: 'Erro interno' },
      { status: 500 }
    )
  }
}

// ============ POST - Gerar Ficha Individual ============

const generateSchema = z.object({
  consultationId: z.string().uuid(),
  fichaType: z.enum(['ATENDIMENTO_INDIVIDUAL', 'PROCEDIMENTOS']).default('ATENDIMENTO_INDIVIDUAL')
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = generateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.issues },
        { status: 400 }
      )
    }

    const { consultationId, fichaType } = parsed.data

    // Verificar se consulta existe
    const consultation = await prisma.consultation.findUnique({
      where: { id: consultationId },
      select: { id: true, status: true }
    })

    if (!consultation) {
      return NextResponse.json(
        { error: 'Consulta não encontrada' },
        { status: 404 }
      )
    }

    // Gerar ficha
    let result
    if (fichaType === 'ATENDIMENTO_INDIVIDUAL') {
      result = await ESUSService.generateFichaAtendimentoFromConsultation(consultationId)
    } else {
      result = await ESUSService.generateFichaProcedimentos(consultationId)
    }

    if (!result.success) {
      return NextResponse.json(
        { error: 'Erro ao gerar ficha', details: result.error },
        { status: 500 }
      )
    }

    // Registrar no banco
    const submission = await prisma.eSUSSubmission.create({
      data: {
        fichaType: `CDS_${fichaType}`,
        localResourceId: consultationId,
        status: 'GENERATED'
      }
    })

    return NextResponse.json({
      success: true,
      submissionId: submission.id,
      ficha: result.ficha
    })
  } catch (error) {
    console.error('[e-SUS Fichas] Erro POST:', error)
    return NextResponse.json(
      { error: 'Erro interno' },
      { status: 500 }
    )
  }
}
