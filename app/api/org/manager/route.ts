import { NextResponse } from 'next/server'
export const runtime = 'nodejs'

import { prisma } from '@/lib/prisma'
import { withAdminAuth } from '@/lib/with-auth'
import { z } from 'zod'

const bodySchema = z.object({
  userId: z.string().min(1),
  managerUserId: z.string().min(1).nullable()
})

function wouldCreateCycle(params: { userId: string; managerUserId: string | null; chain: Array<string | null> }) {
  const { userId, chain } = params
  return chain.includes(userId)
}

// POST /api/org/manager
// Set direct manager (reporting line) for a user.
export const POST = withAdminAuth(async (req) => {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  const { userId, managerUserId } = parsed.data

  if (managerUserId && managerUserId === userId) {
    return NextResponse.json({ error: 'managerUserId não pode ser o próprio userId' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } })
  if (!user) {
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
  }

  if (managerUserId) {
    const manager = await prisma.user.findUnique({
      where: { id: managerUserId },
      select: { id: true, managerUserId: true }
    })

    if (!manager) {
      return NextResponse.json({ error: 'Gestor não encontrado' }, { status: 404 })
    }

    // Prevent obvious cycles by walking up the chain a few steps
    const chain: Array<string | null> = [manager.id, manager.managerUserId]
    let current = manager.managerUserId
    for (let i = 0; i < 8 && current; i++) {
      const next = await prisma.user.findUnique({ where: { id: current }, select: { managerUserId: true } })
      current = next?.managerUserId || null
      chain.push(current)
    }

    if (wouldCreateCycle({ userId, managerUserId, chain })) {
      return NextResponse.json({ error: 'Definição inválida: criaria ciclo na hierarquia' }, { status: 400 })
    }
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { managerUserId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      managerUserId: true,
      manager: {
        select: { id: true, name: true, email: true }
      }
    }
  })

  return NextResponse.json({ user: updated })
})
