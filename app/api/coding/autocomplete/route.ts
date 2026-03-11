/**
 * API de autocomplete de CID-10 e CIAP-2
 *
 * GET /api/coding/autocomplete
 *
 * Parâmetros:
 * - q: termo de busca (código ou descrição)
 * - system: CID10 | CIAP2 (padrão CID10)
 * - limit: limite de resultados (padrão 10)
 * - patientSex: sexo do paciente M/F (opcional, só CID-10)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const query = searchParams.get('q')?.trim()
    const system = (searchParams.get('system') || 'CID10') as 'CID10' | 'CIAP2'
    const limit = parseInt(searchParams.get('limit') || '10')
    const patientSex = searchParams.get('patientSex') as 'M' | 'F' | null

    if (!query || query.length < 1) {
      return NextResponse.json([])
    }

    // CIAP2: busca direta na tabela ciap2
    if (system === 'CIAP2') {
      const rows = await prisma.cIAP2.findMany({
        where: {
          active: true,
          OR: [
            { code: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
            { chapter: { contains: query, mode: 'insensitive' } }
          ]
        },
        take: limit,
        orderBy: { code: 'asc' }
      })
      return NextResponse.json(rows.map(r => ({
        id: r.code,
        code: r.code,
        display: r.description,
        description: r.description,
        shortDescription: r.description,
        chapter: r.chapter,
        isCategory: false,
        sexRestriction: r.gender,
        crossAsterisk: null,
        label: `${r.code} - ${r.description}`,
        badges: r.gender ? [r.gender === 'M' ? '♂️' : r.gender === 'F' ? '♀️' : null].filter(Boolean) : []
      })))
    }

    // Buscar o sistema CID-10 com MAIS códigos (evita usar sistema parcial/duplicado)
    const cidSystems = await prisma.codeSystem.findMany({
      where: {
        active: true,
        OR: [
          { kind: 'CID10' as any },
          { name: 'CID-10' },
          { name: 'ICD-10' },
        ],
      },
    })
    const withCount = await Promise.all(
      cidSystems.map(async (s) => ({
        system: s,
        count: await prisma.medicalCode.count({ where: { systemId: s.id, active: true } }),
      }))
    )
    const cidSystem = withCount.sort((a, b) => b.count - a.count)[0]?.system

    if (!cidSystem) {
      return NextResponse.json([])
    }

    const isCodeSearch = /^[A-Za-z]\d*$/i.test(query.trim())

    const where: any = {
      systemId: cidSystem.id,
      active: true,
      AND: [] as any[],
    }

    // Aplicar filtro de sexo se fornecido
    if (patientSex) {
      where.AND.push({
        OR: [{ sexRestriction: null }, { sexRestriction: patientSex }],
      })
    }

    const TEXT_FALLBACKS: Record<string, string[]> = {
      consulta: ['exame geral', 'atendimento', 'check-up'],
      retorno: ['acompanhamento', 'retorno'],
    }
    const qLower = query.trim().toLowerCase()
    const altTerms = TEXT_FALLBACKS[qLower] ? [query, ...TEXT_FALLBACKS[qLower]] : [query]

    if (isCodeSearch) {
      // Busca por código - prioriza match por prefixo
      where.code = { startsWith: query.toUpperCase(), mode: 'insensitive' }
    } else {
      // Busca por texto na descrição (incluindo termos alternativos)
      const textConditions = altTerms.flatMap(term => [
        { display: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
        { synonyms: { contains: term, mode: 'insensitive' } },
        { shortDescription: { contains: term, mode: 'insensitive' } },
      ])
      where.AND.push({ OR: textConditions })
    }

    if (where.AND.length === 0) {
      delete where.AND
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
