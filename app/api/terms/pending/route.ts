import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'

import { authOptions } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getAudienceForRole } from '@/lib/terms-enforcement'

export const runtime = 'nodejs'

const querySchema = z.object({
  ids: z.string().optional(),
})

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const parsed = querySchema.safeParse({
    ids: request.nextUrl.searchParams.get('ids') ?? undefined,
  })
  if (!parsed.success) {
    return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 })
  }

  const audience = getAudienceForRole((session.user as any).role)

  const ids = parsed.data.ids
    ? Array.from(
        new Set(
          parsed.data.ids
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        )
      )
    : null

  const terms = await prisma.term.findMany({
    where: {
      isActive: true,
      ...(ids ? { id: { in: ids } } : {}),
      OR: [{ audience: 'ALL' }, { audience }],
    },
    orderBy: [{ slug: 'asc' }, { createdAt: 'desc' }],
    select: {
      id: true,
      slug: true,
      title: true,
      version: true,
      content: true,
      audience: true,
      updatedAt: true,
    },
  })

  if (terms.length === 0) {
    return NextResponse.json({ success: true, terms: [] })
  }

  const existing = await prisma.termAcceptance.findMany({
    where: {
      userId: session.user.id,
      termId: { in: terms.map((t) => t.id) },
    },
    select: { termId: true },
  })

  const accepted = new Set(existing.map((a) => a.termId))
  const pending = terms.filter((t) => !accepted.has(t.id))

  return NextResponse.json({
    success: true,
    terms: pending,
  })
}
