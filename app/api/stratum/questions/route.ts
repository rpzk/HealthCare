import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Buscar questões do assessment
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')

    const where: Record<string, unknown> = { active: true }
    if (category) {
      where.category = category
    }

    const questions = await prisma.stratumQuestion.findMany({
      where,
      orderBy: [
        { category: 'asc' },
        { order: 'asc' }
      ]
    })

    // Parse JSON fields
    const parsed = questions.map(q => ({
      ...q,
      options: JSON.parse(q.options),
      stratumMapping: JSON.parse(q.stratumMapping)
    }))

    return NextResponse.json({ questions: parsed })
  } catch (error) {
    console.error('Erro ao buscar questões:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar questões' },
      { status: 500 }
    )
  }
}

// POST - Criar nova questão (apenas ADMIN)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const body = await request.json()
    const { category, questionText, questionType, options, stratumMapping, weight, order } = body

    const question = await prisma.stratumQuestion.create({
      data: {
        category,
        questionText,
        questionType: questionType || 'SCENARIO',
        options: JSON.stringify(options),
        stratumMapping: JSON.stringify(stratumMapping),
        weight: weight || 1.0,
        order: order || 0
      }
    })

    return NextResponse.json({ question })
  } catch (error) {
    console.error('Erro ao criar questão:', error)
    return NextResponse.json(
      { error: 'Erro ao criar questão' },
      { status: 500 }
    )
  }
}
