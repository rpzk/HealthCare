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
  const isBuild = process.env.NEXT_PHASE === 'phase-production-build' || process.env.BUILD_TIME === '1'

  let session: Awaited<ReturnType<typeof auth>> | null = null
  try {
    session = await auth()
  } catch (error) {
    // During build/SSG there is no request context for auth(); treat as unauthenticated.
    if (isBuild) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    logger.error({ error }, 'Error fetching template variables: auth() failed')
    return NextResponse.json({ error: 'Erro ao buscar variáveis' }, { status: 500 })
  }

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category')

  // Se solicitou categoria específica
  if (category) {
    const variables = getVariablesByCategory(category as any)
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
}
