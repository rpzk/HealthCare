/**
 * API de autocomplete de exames
 * 
 * GET /api/exams/autocomplete
 * 
 * Parâmetros:
 * - q: termo de busca
 * - category: filtro por categoria (LABORATORY, RADIOLOGY, etc)
 * - patientAge: idade do paciente (opcional)
 * - patientSex: sexo do paciente M/F (opcional)
 * - limit: limite de resultados (padrão 10)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const query = searchParams.get('q')
    const category = searchParams.get('category')
    const patientAge = searchParams.has('patientAge') 
      ? parseInt(searchParams.get('patientAge')!) 
      : null
    const patientSex = searchParams.get('patientSex') as 'M' | 'F' | null
    const limit = parseInt(searchParams.get('limit') || '10')

    if (!query || query.length < 2) {
      return NextResponse.json([])
    }

    const where: any = {
      active: true,
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { abbreviation: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { susCode: { startsWith: query } }
      ]
    }

    // Filtro por categoria
    if (category) {
      where.examCategory = category
    }

    // Filtro de restrições de sexo
    if (patientSex) {
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { sexRestriction: null },
            { sexRestriction: patientSex }
          ]
        }
      ]
    }

    // Filtro de restrições de idade
    if (patientAge !== null) {
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { minAge: null },
            { minAge: { lte: patientAge } }
          ]
        },
        {
          OR: [
            { maxAge: null },
            { maxAge: { gte: patientAge } }
          ]
        }
      ]
    }

    const exams = await prisma.examCatalog.findMany({
      where,
      take: limit,
      orderBy: [
        { name: 'asc' }
      ],
      select: {
        id: true,
        name: true,
        abbreviation: true,
        description: true,
        examCategory: true,
        susCode: true,
        preparation: true,
        minAge: true,
        maxAge: true,
        sexRestriction: true
      }
    })

    // Formatar resposta
    const formatted = exams.map(exam => ({
      id: exam.id,
      name: exam.name,
      abbreviation: exam.abbreviation,
      description: exam.description,
      category: exam.examCategory,
      categoryLabel: getCategoryLabel(exam.examCategory),
      susCode: exam.susCode,
      preparation: exam.preparation,
      // Label formatado para exibição
      label: exam.abbreviation 
        ? `${exam.abbreviation} - ${exam.name}`
        : exam.name,
      // Restrições
      hasRestrictions: !!(exam.minAge || exam.maxAge || exam.sexRestriction),
      restrictions: getRestrictionLabels(exam)
    }))

    return NextResponse.json(formatted)
  } catch (error) {
    console.error('Erro no autocomplete de exames:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar exames' },
      { status: 500 }
    )
  }
}

function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    'LABORATORY': 'Laboratório',
    'RADIOLOGY': 'Radiografia',
    'ECG': 'Eletrocardiograma',
    'PHYSIOTHERAPY': 'Fisioterapia',
    'APAC': 'APAC',
    'CYTOPATHOLOGY': 'Citopatológico',
    'MAMMOGRAPHY': 'Mamografia',
    'ULTRASOUND': 'Ecografia/US',
    'LAB_ALTERNATIVE': 'Lab. Alternativo',
    'RAD_ALTERNATIVE': 'Rad. Alternativa',
    'OTHER_1': 'Outros',
    'OTHER_2': 'Outros'
  }
  return labels[category] || category
}

function getRestrictionLabels(exam: any): string[] {
  const labels: string[] = []
  
  if (exam.minAge) {
    labels.push(`Idade mín: ${exam.minAge} anos`)
  }
  if (exam.maxAge) {
    labels.push(`Idade máx: ${exam.maxAge} anos`)
  }
  if (exam.sexRestriction === 'M') {
    labels.push('Apenas masculino')
  }
  if (exam.sexRestriction === 'F') {
    labels.push('Apenas feminino')
  }
  
  return labels
}
