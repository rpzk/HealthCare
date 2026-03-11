/**
 * API Admin: Lista e cria medicamentos
 * GET: lista com paginação e filtros
 * POST: cria medicamento
 */

export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth, AuthenticatedApiHandler } from '@/lib/with-auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import type { PrescriptionType } from '@prisma/client'
import { z } from 'zod'

const createSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  synonym: z.string().optional().nullable(),
  tradeName: z.string().optional().nullable(),
  prescriptionType: z.enum(['SIMPLE','ANTIMICROBIAL','CONTROLLED_A','CONTROLLED_B','CONTROLLED_B2','CONTROLLED_C1','CONTROLLED_C2','CONTROLLED_C4','CONTROLLED_C5','CONTROLLED_TALIDOMIDA']).optional().default('SIMPLE'),
  susCode: z.string().optional().nullable(),
  route: z.string().optional().nullable(),
  form: z.string().optional().nullable(),
  strength: z.string().optional().nullable(),
  unit: z.string().optional().nullable(),
  instructions: z.string().optional().nullable(),
  active: z.boolean().optional().default(true),
  basicPharmacy: z.boolean().optional().default(false),
  popularPharmacy: z.boolean().optional().default(false),
  commercialPharmacy: z.boolean().optional().default(true),
  hospitalPharmacy: z.boolean().optional().default(false),
})

export const GET = withAdminAuth(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q') || ''
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '25')))
    const includeInactive = searchParams.get('includeInactive') === 'true'
    const prescriptionType = searchParams.get('prescriptionType') || undefined

    const where: Record<string, unknown> = {}
    if (!includeInactive) where.active = true
    if (prescriptionType) where.prescriptionType = prescriptionType
    if (q.trim()) {
      const term = q.toLowerCase().trim()
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { synonym: { contains: term, mode: 'insensitive' } },
        { tradeName: { contains: term, mode: 'insensitive' } },
        { susCode: { contains: term, mode: 'insensitive' } },
      ]
    }

    const [items, total] = await Promise.all([
      prisma.medication.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.medication.count({ where }),
    ])

    return NextResponse.json({
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (e) {
    logger.error({ err: e }, 'Erro ao listar medicamentos (admin)')
    return NextResponse.json({ error: 'Erro ao listar medicamentos' }, { status: 500 })
  }
}) as AuthenticatedApiHandler

export const POST = withAdminAuth(async (req: NextRequest) => {
  try {
    const body = await req.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors.map(e => e.message).join(', ') },
        { status: 400 }
      )
    }
    const data = parsed.data
    const med = await prisma.medication.create({
      data: {
        name: data.name,
        synonym: data.synonym || null,
        tradeName: data.tradeName || null,
        prescriptionType: data.prescriptionType as PrescriptionType,
        susCode: data.susCode || null,
        route: data.route || null,
        form: data.form || null,
        strength: data.strength || null,
        unit: data.unit || null,
        instructions: data.instructions || null,
        active: data.active,
        basicPharmacy: data.basicPharmacy,
        popularPharmacy: data.popularPharmacy,
        commercialPharmacy: data.commercialPharmacy,
        hospitalPharmacy: data.hospitalPharmacy,
      },
    })
    return NextResponse.json(med)
  } catch (e) {
    logger.error({ err: e }, 'Erro ao criar medicamento')
    return NextResponse.json({ error: 'Erro ao criar medicamento' }, { status: 500 })
  }
}) as AuthenticatedApiHandler
