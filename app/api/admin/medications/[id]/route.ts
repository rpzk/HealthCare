/**
 * API Admin: Edita e remove medicamento
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/with-auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import type { PrescriptionType } from '@prisma/client'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  synonym: z.string().optional().nullable(),
  tradeName: z.string().optional().nullable(),
  prescriptionType: z.enum(['SIMPLE','ANTIMICROBIAL','CONTROLLED_A','CONTROLLED_B','CONTROLLED_B2','CONTROLLED_C1','CONTROLLED_C2','CONTROLLED_C4','CONTROLLED_C5','CONTROLLED_TALIDOMIDA']).optional(),
  susCode: z.string().optional().nullable(),
  route: z.string().optional().nullable(),
  form: z.string().optional().nullable(),
  strength: z.string().optional().nullable(),
  unit: z.string().optional().nullable(),
  instructions: z.string().optional().nullable(),
  active: z.boolean().optional(),
  basicPharmacy: z.boolean().optional(),
  popularPharmacy: z.boolean().optional(),
  commercialPharmacy: z.boolean().optional(),
  hospitalPharmacy: z.boolean().optional(),
})

export const PATCH = withAdminAuth(async (req: NextRequest, { params }) => {
  try {
    const id = params.id
    const body = await req.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }
    const data = parsed.data as Record<string, unknown>
    const med = await prisma.medication.update({
      where: { id },
      data: {
        ...data,
        prescriptionType: data.prescriptionType as PrescriptionType | undefined,
      },
    })
    return NextResponse.json(med)
  } catch (e: unknown) {
    const err = e as { code?: string }
    if (err?.code === 'P2025') {
      return NextResponse.json({ error: 'Medicamento não encontrado' }, { status: 404 })
    }
    logger.error({ err: e }, 'Erro ao atualizar medicamento')
    return NextResponse.json({ error: 'Erro ao atualizar' }, { status: 500 })
  }
})

export const DELETE = withAdminAuth(async (_req: NextRequest, { params }) => {
  try {
    const id = params.id
    await prisma.medication.update({
      where: { id },
      data: { active: false },
    })
    return NextResponse.json({ success: true })
  } catch (e: unknown) {
    const err = e as { code?: string }
    if (err?.code === 'P2025') {
      return NextResponse.json({ error: 'Medicamento não encontrado' }, { status: 404 })
    }
    logger.error({ err: e }, 'Erro ao desativar medicamento')
    return NextResponse.json({ error: 'Erro ao desativar' }, { status: 500 })
  }
})
