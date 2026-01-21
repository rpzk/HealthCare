import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { logger } from '@/lib/logger'

const createInsuranceSchema = z.object({
  name: z.string().min(2),
  type: z.enum(['PRIVATE', 'SUS', 'CORPORATE', 'OTHER']),
  code: z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().email().optional(),
  coveragePercentage: z.number().min(0).max(100).default(100),
  copayAmount: z.number().optional()
})

// GET - List all health insurances/convenios
export const GET = withAuth(async (req: NextRequest, { user }) => {
  try {
    const { searchParams } = new URL(req.url)
    const isActive = searchParams.get('isActive')

    const where: any = {}
    if (isActive !== null) {
      where.isActive = isActive === 'true'
    }

    const insurances = await prisma.healthInsurance.findMany({
      where,
      include: {
        _count: {
          select: {
            patients: true,
            transactions: true
          }
        }
      },
      orderBy: { name: 'asc' }
    })

    return NextResponse.json({ data: insurances })
  } catch (error) {
    logger.error('Error fetching insurances:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar convênios' },
      { status: 500 }
    )
  }
})

// POST - Create new insurance/convenio
export const POST = withAuth(async (req: NextRequest, { user }) => {
  if (!['ADMIN', 'MANAGER'].includes(user.role)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const parseResult = createInsuranceSchema.safeParse(body)

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const insurance = await prisma.healthInsurance.create({
      data: parseResult.data
    })

    return NextResponse.json(insurance, { status: 201 })
  } catch (error) {
    logger.error('Error creating insurance:', error)
    return NextResponse.json(
      { error: 'Erro ao criar convênio' },
      { status: 500 }
    )
  }
})
