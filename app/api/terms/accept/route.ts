import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'

import { authOptions } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getAudienceForRole } from '@/lib/terms-enforcement'

export const runtime = 'nodejs'

const bodySchema = z.object({
  termIds: z.array(z.string().min(1)).min(1),
})

function getClientIp(request: NextRequest) {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]?.trim() || null
  return request.headers.get('x-real-ip') || null
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const json = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
  }

  const audience = getAudienceForRole((session.user as any).role)

  const termIds = Array.from(new Set(parsed.data.termIds))

  const terms = await prisma.term.findMany({
    where: {
      id: { in: termIds },
      isActive: true,
      OR: [{ audience: 'ALL' }, { audience }],
    },
    select: {
      id: true,
      slug: true,
      title: true,
      version: true,
      content: true,
    },
  })

  if (terms.length === 0) {
    return NextResponse.json({ error: 'Nenhum termo válido encontrado' }, { status: 400 })
  }

  const existing = await prisma.termAcceptance.findMany({
    where: {
      userId: session.user.id,
      termId: { in: terms.map((t) => t.id) },
    },
    select: { termId: true },
  })

  const accepted = new Set(existing.map((a) => a.termId))
  const toCreate = terms.filter((t) => !accepted.has(t.id))

  const ipAddress = getClientIp(request)
  const userAgent = request.headers.get('user-agent')

  for (const term of toCreate) {
    await prisma.termAcceptance.create({
      data: {
        userId: session.user.id,
        termId: term.id,
        termSlug: term.slug,
        termTitle: term.title,
        termVersion: term.version,
        termContent: term.content,
        ipAddress,
        userAgent,
      },
    })
  }

  return NextResponse.json({
    success: true,
    accepted: toCreate.length,
  })
}
