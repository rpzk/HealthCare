import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function isAdmin(session: any): boolean {
  const role = session?.user?.role
  const availableRoles = session?.user?.availableRoles || []
  return role === 'ADMIN' || (Array.isArray(availableRoles) && availableRoles.includes('ADMIN'))
}

export const runtime = 'nodejs'

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  if (!isAdmin(session)) {
    return NextResponse.json({ error: 'Apenas administradores podem acessar' }, { status: 403 })
  }

  try {
    const [terms, acceptanceCounts] = await Promise.all([
      prisma.term.findMany({
        select: {
          id: true,
          slug: true,
          title: true,
          content: true,
          version: true,
          isActive: true,
          audience: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: [{ slug: 'asc' }, { createdAt: 'desc' }],
      }),
      prisma.termAcceptance.groupBy({
        by: ['termId'],
        _count: true,
      }),
    ])

    const countsByTermId = acceptanceCounts.reduce((acc, row) => {
      acc[row.termId] = row._count
      return acc
    }, {} as Record<string, number>)

    const bySlug = new Map<string, any>()

    for (const term of terms) {
      const entry = bySlug.get(term.slug) || {
        slug: term.slug,
        activeId: null as string | null,
        versions: [] as any[],
      }

      if (term.isActive) {
        entry.activeId = term.id
      }

      entry.versions.push({
        ...term,
        acceptancesCount: countsByTermId[term.id] || 0,
      })

      bySlug.set(term.slug, entry)
    }

    return NextResponse.json({
      terms: Array.from(bySlug.values()),
    })
  } catch (error) {
    console.error('Erro ao listar termos:', error)
    return NextResponse.json({ error: 'Erro ao listar termos' }, { status: 500 })
  }
}

const createSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  version: z.string().min(1),
  content: z.string().min(1),
  audience: z.enum(['ALL', 'PATIENT', 'PROFESSIONAL']).optional(),
  activate: z.boolean().optional(),
})

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  if (!isAdmin(session)) {
    return NextResponse.json({ error: 'Apenas administradores podem acessar' }, { status: 403 })
  }

  let json: unknown
  try {
    json = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const parsed = createSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { slug, title, version, content, activate } = parsed.data
  const audience = parsed.data.audience ?? 'ALL'

  try {
    const created = await prisma.$transaction(async (tx) => {
      const existing = await tx.term.findFirst({ where: { slug, version } })
      if (existing) {
        return { conflict: true as const, id: existing.id }
      }

      if (activate) {
        await tx.term.updateMany({ where: { slug }, data: { isActive: false } })
      }

      const term = await tx.term.create({
        data: {
          slug,
          title,
          version,
          content,
          isActive: !!activate,
          audience,
        },
        select: { id: true },
      })

      return { conflict: false as const, id: term.id }
    })

    if (created.conflict) {
      return NextResponse.json({ error: 'Já existe uma versão com este slug + versão' }, { status: 409 })
    }

    return NextResponse.json({ success: true, id: created.id }, { status: 201 })
  } catch (error: any) {
    if (typeof error?.code === 'string' && error.code === 'P2002') {
      return NextResponse.json({ error: 'Já existe uma versão com este slug + versão' }, { status: 409 })
    }
    console.error('Erro ao criar termo:', error)
    return NextResponse.json({ error: 'Erro ao criar termo' }, { status: 500 })
  }
}
