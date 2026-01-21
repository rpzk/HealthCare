/**
 * API: Obter variáveis disponíveis para templates
 */

import { auth } from '@/auth'
import {
  TEMPLATE_VARIABLES,
  getVariablesByCategory,
  getCategories,
} from '@/lib/document-templates/variables'
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category')

    // Se solicitou categoria específica
    if (category) {
      const variables = getVariablesByCategory(
        category as any
      )
      return NextResponse.json({
        category,
        variables,
        count: variables.length,
      })
    }

    // Retornar todos agrupados por categoria
    const categories = getCategories()
    const grouped = Object.fromEntries(
      categories.map((cat) => [cat, getVariablesByCategory(cat)])
    )

    return NextResponse.json({
      categories,
      variables: TEMPLATE_VARIABLES,
      grouped,
      total: TEMPLATE_VARIABLES.length,
    })
  } catch (error) {
    logger.error('Error fetching variables:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar variáveis' },
      { status: 500 }
    )
  }
}
