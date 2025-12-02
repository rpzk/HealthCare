/**
 * Serviço de Fórmulas Magistrais
 * Gerencia templates de fórmulas de manipulação
 */

import { prisma } from '@/lib/prisma'
import type { FormulaTemplate, Prisma } from '@prisma/client'

export type FormulaSearchFilters = {
  category?: string
  search?: string
  active?: boolean
}

export type FormulaSearchResult = {
  formulas: FormulaTemplate[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/**
 * Busca fórmulas com filtros e paginação
 */
export async function searchFormulas(
  filters: FormulaSearchFilters = {},
  page: number = 1,
  pageSize: number = 20
): Promise<FormulaSearchResult> {
  const where: Prisma.FormulaTemplateWhereInput = {
    active: filters.active ?? true,
  }

  if (filters.category) {
    where.category = filters.category
  }

  if (filters.search) {
    const search = filters.search.toLowerCase()
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { ingredients: { contains: search, mode: 'insensitive' } },
      { indications: { contains: search, mode: 'insensitive' } },
    ]
  }

  const [formulas, total] = await Promise.all([
    prisma.formulaTemplate.findMany({
      where,
      orderBy: [
        { category: 'asc' },
        { name: 'asc' },
      ],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.formulaTemplate.count({ where }),
  ])

  return {
    formulas,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

/**
 * Autocomplete para fórmulas (busca rápida)
 */
export async function autocompleteFormulas(
  query: string,
  limit: number = 10
): Promise<FormulaTemplate[]> {
  if (!query || query.length < 2) {
    return []
  }

  return prisma.formulaTemplate.findMany({
    where: {
      active: true,
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { ingredients: { contains: query, mode: 'insensitive' } },
        { category: { contains: query, mode: 'insensitive' } },
      ],
    },
    orderBy: { name: 'asc' },
    take: limit,
  })
}

/**
 * Busca fórmula por ID
 */
export async function getFormulaById(id: string): Promise<FormulaTemplate | null> {
  return prisma.formulaTemplate.findUnique({
    where: { id },
  })
}

/**
 * Lista todas as categorias disponíveis
 */
export async function getFormulaCategories(): Promise<string[]> {
  const results = await prisma.formulaTemplate.findMany({
    where: { active: true },
    select: { category: true },
    distinct: ['category'],
    orderBy: { category: 'asc' },
  })

  return results.map(r => r.category)
}

/**
 * Cria uma nova fórmula
 */
export async function createFormula(
  data: Prisma.FormulaTemplateCreateInput
): Promise<FormulaTemplate> {
  return prisma.formulaTemplate.create({ data })
}

/**
 * Atualiza uma fórmula
 */
export async function updateFormula(
  id: string,
  data: Prisma.FormulaTemplateUpdateInput
): Promise<FormulaTemplate> {
  return prisma.formulaTemplate.update({
    where: { id },
    data,
  })
}

/**
 * Desativa uma fórmula (soft delete)
 */
export async function deactivateFormula(id: string): Promise<FormulaTemplate> {
  return prisma.formulaTemplate.update({
    where: { id },
    data: { active: false },
  })
}

/**
 * Importa fórmulas em lote (para script de importação)
 */
export async function importFormulas(
  formulas: Prisma.FormulaTemplateCreateInput[]
): Promise<{ created: number; errors: string[] }> {
  let created = 0
  const errors: string[] = []

  for (const formula of formulas) {
    try {
      // Verifica se já existe fórmula com mesmo nome e categoria
      const existing = await prisma.formulaTemplate.findFirst({
        where: {
          name: formula.name,
          category: formula.category,
        },
      })

      if (existing) {
        // Atualiza se já existe
        await prisma.formulaTemplate.update({
          where: { id: existing.id },
          data: formula,
        })
      } else {
        // Cria nova
        await prisma.formulaTemplate.create({ data: formula })
        created++
      }
    } catch (error) {
      errors.push(`Erro ao importar "${formula.name}": ${error}`)
    }
  }

  return { created, errors }
}

/**
 * Conta total de fórmulas ativas
 */
export async function countFormulas(): Promise<number> {
  return prisma.formulaTemplate.count({
    where: { active: true },
  })
}
