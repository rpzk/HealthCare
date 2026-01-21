/**
 * API de Fórmula Individual
 * GET /api/formulas/[id] - Busca fórmula por ID
 * PUT /api/formulas/[id] - Atualiza fórmula
 * DELETE /api/formulas/[id] - Desativa fórmula
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { 
  getFormulaById, 
  updateFormula, 
  deactivateFormula 
} from '@/lib/formula-service'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { id } = await params
    const formula = await getFormulaById(id)

    if (!formula) {
      return NextResponse.json(
        { error: 'Fórmula não encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json(formula)

  } catch (error) {
    logger.error('Erro ao buscar fórmula:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar fórmula' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Apenas médicos e admins podem editar
    const userRole = (session.user as { role?: string })?.role
    if (!userRole || !['ADMIN', 'DOCTOR'].includes(userRole)) {
      return NextResponse.json(
        { error: 'Permissão negada' },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()

    const formula = await updateFormula(id, {
      name: body.name,
      category: body.category,
      ingredients: body.ingredients,
      form: body.form,
      dosage: body.dosage,
      notes: body.notes,
      indications: body.indications,
      contraindications: body.contraindications,
      sideEffects: body.sideEffects,
      interactions: body.interactions,
      monitoring: body.monitoring,
      duration: body.duration,
      source: body.source,
      pharmacy: body.pharmacy,
    })

    return NextResponse.json(formula)

  } catch (error) {
    logger.error('Erro ao atualizar fórmula:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar fórmula' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Apenas admins podem deletar
    const userRole = (session.user as { role?: string })?.role
    if (userRole !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Permissão negada' },
        { status: 403 }
      )
    }

    const { id } = await params
    await deactivateFormula(id)

    return NextResponse.json({ success: true })

  } catch (error) {
    logger.error('Erro ao desativar fórmula:', error)
    return NextResponse.json(
      { error: 'Erro ao desativar fórmula' },
      { status: 500 }
    )
  }
}
