/**
 * API de autocomplete de CID-10
 * 
 * GET /api/coding/autocomplete
 * 
 * Parâmetros:
 * - q: termo de busca (código ou descrição)
 * - limit: limite de resultados (padrão 10)
 * - patientSex: sexo do paciente M/F (opcional, filtra restrições)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const query = searchParams.get('q')
    const limit = parseInt(searchParams.get('limit') || '10')
    const patientSex = searchParams.get('patientSex') as 'M' | 'F' | null

    if (!query || query.length < 2) {
      return NextResponse.json([])
    }

    // Buscar o sistema CID-10 (pode estar como CID-10 ou ICD-10)
    const cidSystem = await prisma.codeSystem.findFirst({
      where: { 
        OR: [
          { name: 'CID-10' },
          { name: 'ICD-10' }
        ]
      }
    })

    if (!cidSystem) {
      return NextResponse.json([])
    }

    const isCodeSearch = /^[A-Z]\d/i.test(query)
    
    const where: any = {
      systemId: cidSystem.id,
      active: true
    }

    // Aplicar filtro de sexo se fornecido
    if (patientSex) {
      where.OR = [
        { sexRestriction: null },
        { sexRestriction: patientSex }
      ]
    }

    if (isCodeSearch) {
      // Busca por código - prioriza match exato
      where.code = { startsWith: query.toUpperCase(), mode: 'insensitive' }
    } else {
      // Busca por texto na descrição
      where.OR = [
        { display: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { synonyms: { contains: query, mode: 'insensitive' } },
        { shortDescription: { contains: query, mode: 'insensitive' } }
      ]
    }

    const codes = await prisma.medicalCode.findMany({
      where,
      take: limit,
      orderBy: [
        { isCategory: 'desc' }, // Categorias primeiro
        { code: 'asc' }
      ],
      select: {
        id: true,
        code: true,
        display: true,
        description: true,
        shortDescription: true,
        chapter: true,
        isCategory: true,
        sexRestriction: true,
        crossAsterisk: true
      }
    })

    // Formatar resposta
    const formatted = codes.map(code => ({
      id: code.id,
      code: code.code,
      display: code.display,
      description: code.description,
      shortDescription: code.shortDescription,
      chapter: code.chapter,
      isCategory: code.isCategory,
      sexRestriction: code.sexRestriction,
      crossAsterisk: code.crossAsterisk,
      // Label formatado para exibição
      label: `${code.code} - ${code.display}`,
      // Indicadores visuais
      badges: [
        code.isCategory ? 'Categoria' : null,
        code.crossAsterisk === 'ETIOLOGY' ? '+' : null,
        code.crossAsterisk === 'MANIFESTATION' ? '*' : null,
        code.sexRestriction === 'M' ? '♂️' : null,
        code.sexRestriction === 'F' ? '♀️' : null
      ].filter(Boolean)
    }))

    return NextResponse.json(formatted)
  } catch (error) {
    logger.error('Erro no autocomplete de CID:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar códigos CID' },
      { status: 500 }
    )
  }
}
