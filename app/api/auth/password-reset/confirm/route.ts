import { NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { createRedisRateLimiter } from '@/lib/redis-integration'
import { getClientIpFromRequest, hashPasswordResetToken } from '@/lib/password-reset'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ConfirmSchema = z.object({
  token: z.string().min(10),
  newPassword: z.string().min(8),
})

export async function POST(req: Request) {
  try {
    const { token, newPassword } = ConfirmSchema.parse(await req.json())

    const ip = getClientIpFromRequest(req)
    const rl = await createRedisRateLimiter().checkRateLimit(
      `pwreset-confirm:${ip}`,
      10,
      10 * 60 * 1000,
      10 * 60 * 1000
    )

    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Muitas tentativas. Aguarde alguns minutos.' },
        { status: 429 }
      )
    }

    const tokenHash = hashPasswordResetToken(token)
    const now = new Date()

    const record = await prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: { gt: now },
      },
      select: {
        id: true,
        userId: true,
        user: { select: { id: true, isActive: true } },
      },
    })

    if (!record || !record.user?.isActive) {
      return NextResponse.json({ error: 'Token inválido ou expirado' }, { status: 400 })
    }

    const passwordHash = await bcrypt.hash(newPassword, 12)

    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { password: passwordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      prisma.passwordResetToken.deleteMany({
        where: {
          userId: record.userId,
          id: { not: record.id },
        },
      }),
    ])

    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }

    console.error('Erro no confirm de reset de senha:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
