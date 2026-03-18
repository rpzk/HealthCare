/**
 * GET    /api/admin/laboratories/[id]             — detalhe
 * PATCH  /api/admin/laboratories/[id]             — atualizar (nome, IPs, status)
 * DELETE /api/admin/laboratories/[id]             — desativar (soft delete)
 * POST   /api/admin/laboratories/[id]/rotate-key  → ver /[id]/rotate-key/route.ts
 */

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { withRbac } from '@/lib/with-auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const UpdateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  active: z.boolean().optional(),
  allowedIps: z.array(z.string().ip()).optional(),
  tenantId: z.string().nullable().optional(),
})

export const GET = withRbac('admin', async (_req: NextRequest, { params }) => {
  const lab = await prisma.laboratory.findUnique({
    where: { id: params.id },
    select: {
      id: true, name: true, code: true, active: true,
      tenantId: true, allowedIps: true, createdAt: true, updatedAt: true,
      _count: { select: { exams: true } },
    },
  })

  if (!lab) return NextResponse.json({ error: 'Laboratório não encontrado' }, { status: 404 })
  return NextResponse.json({ laboratory: lab })
})

export const PATCH = withRbac('admin', async (req: NextRequest, { params }) => {
  const body = await req.json().catch(() => ({}))
  const parsed = UpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados inválidos', details: parsed.error.flatten() }, { status: 400 })
  }

  const lab = await prisma.laboratory.update({
    where: { id: params.id },
    data: parsed.data,
    select: { id: true, name: true, code: true, active: true, tenantId: true, allowedIps: true, updatedAt: true },
  }).catch(() => null)

  if (!lab) return NextResponse.json({ error: 'Laboratório não encontrado' }, { status: 404 })
  return NextResponse.json({ laboratory: lab })
})

export const DELETE = withRbac('admin', async (_req: NextRequest, { params }) => {
  const lab = await prisma.laboratory.update({
    where: { id: params.id },
    data: { active: false },
    select: { id: true, name: true, code: true, active: true },
  }).catch(() => null)

  if (!lab) return NextResponse.json({ error: 'Laboratório não encontrado' }, { status: 404 })
  return NextResponse.json({ laboratory: lab, message: 'Laboratório desativado' })
})
