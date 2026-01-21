import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

function isAdmin(session: any): boolean {
  const role = session?.user?.role
  const availableRoles = session?.user?.availableRoles || []
  return role === 'ADMIN' || (Array.isArray(availableRoles) && availableRoles.includes('ADMIN'))
}

export const runtime = 'nodejs'

const schema = z.object({
  id: z.string().min(1),
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

  const parsed = schema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const { id } = parsed.data

    await prisma.$transaction(async (tx) => {
      const term = await tx.term.findUnique({ where: { id } })
      if (!term) {
        throw new Error('TERM_NOT_FOUND')
      }

      await tx.term.updateMany({ where: { slug: term.slug }, data: { isActive: false } })
      await tx.term.update({ where: { id }, data: { isActive: true } })
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error?.message === 'TERM_NOT_FOUND') {
      return NextResponse.json({ error: 'Termo não encontrado' }, { status: 404 })
    }
    logger.error('Erro ao ativar termo:', error)
    return NextResponse.json({ error: 'Erro ao ativar termo' }, { status: 500 })
  }
}
