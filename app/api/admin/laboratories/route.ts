/**
 * GET  /api/admin/laboratories        — listar laboratórios
 * POST /api/admin/laboratories        — cadastrar laboratório (retorna chave uma vez)
 */

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { withRbac } from '@/lib/with-auth'
import { LabAuthService } from '@/lib/lab-auth-service'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const CreateSchema = z.object({
  name: z.string().min(2).max(100),
  code: z
    .string()
    .min(2)
    .max(20)
    .toUpperCase()
    .regex(/^[A-Z0-9_]+$/, 'Código deve conter apenas letras, números e _'),
  tenantId: z.string().optional(),
  allowedIps: z.array(z.string().ip()).default([]),
})

export const GET = withRbac('admin', async (_req: NextRequest, { user }) => {
  const labs = await prisma.laboratory.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      code: true,
      active: true,
      tenantId: true,
      allowedIps: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { exams: true } },
    },
  })

  return NextResponse.json({ laboratories: labs, total: labs.length })
})

export const POST = withRbac('admin', async (req: NextRequest, { user }) => {
  const body = await req.json().catch(() => ({}))
  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados inválidos', details: parsed.error.flatten() }, { status: 400 })
  }

  const { name, code, tenantId, allowedIps } = parsed.data

  const existing = await prisma.laboratory.findUnique({ where: { code } })
  if (existing) {
    return NextResponse.json({ error: `Laboratório com código ${code} já existe` }, { status: 409 })
  }

  const { plaintext, hash } = LabAuthService.generateApiKey()

  const lab = await prisma.laboratory.create({
    data: { name, code, apiKeyHash: hash, tenantId, allowedIps },
    select: { id: true, name: true, code: true, active: true, tenantId: true, allowedIps: true, createdAt: true },
  })

  return NextResponse.json(
    {
      laboratory: lab,
      apiKey: plaintext, // ⚠️ exibir ao admin e descartar — nunca será exibido novamente
      warning: 'Salve a chave API em local seguro. Ela não poderá ser recuperada.',
    },
    { status: 201 }
  )
})
