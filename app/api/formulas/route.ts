/**
 * API de Fórmulas Magistrais
 * GET /api/formulas - Lista fórmulas com filtros
 * POST /api/formulas - Cria nova fórmula
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { 
  searchFormulas, 
  autocompleteFormulas, 
  createFormula,
  getFormulaCategories 
} from '@/lib/formula-service'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const category = searchParams.get('category') || ''
    const autocomplete = searchParams.get('autocomplete') === 'true'
    const categories = searchParams.get('categories') === 'true'
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')

    // Se pedir categorias, retorna lista de categorias
    if (categories) {
      const categoryList = await getFormulaCategories()
      return NextResponse.json({ categories: categoryList })
    }

    // Se for autocomplete, usa busca rápida
    if (autocomplete && search) {
      const formulas = await autocompleteFormulas(search, 10)
      return NextResponse.json({ formulas })
    }

    // Busca completa com paginação
    const result = await searchFormulas(
      {
        search: search || undefined,
        category: category || undefined,
      },
      page,
      pageSize
    )

    return NextResponse.json(result)

  } catch (error) {
    logger.error('Erro ao buscar fórmulas:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar fórmulas' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Apenas médicos e admins podem criar fórmulas
    const userRole = (session.user as { role?: string })?.role
    if (!userRole || !['ADMIN', 'DOCTOR'].includes(userRole)) {
      return NextResponse.json(
        { error: 'Permissão negada' },
        { status: 403 }
      )
    }

    const body = await request.json()

    // Validação básica
    if (!body.name || !body.category || !body.ingredients || !body.form || !body.dosage) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: name, category, ingredients, form, dosage' },
        { status: 400 }
      )
    }

    const formula = await createFormula({
      name: body.name,
      category: body.category,
      ingredients: body.ingredients,
      form: body.form,
      dosage: body.dosage,
      notes: body.notes || null,
      indications: body.indications || null,
      contraindications: body.contraindications || null,
      sideEffects: body.sideEffects || null,
      interactions: body.interactions || null,
      monitoring: body.monitoring || null,
      duration: body.duration || null,
      source: body.source || 'Manual',
      pharmacy: body.pharmacy || 'Manipulação',
    })

    return NextResponse.json(formula, { status: 201 })

  } catch (error) {
    logger.error('Erro ao criar fórmula:', error)
    return NextResponse.json(
      { error: 'Erro ao criar fórmula' },
      { status: 500 }
    )
  }
}
