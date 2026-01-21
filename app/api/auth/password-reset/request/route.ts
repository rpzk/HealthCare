import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { emailService } from '@/lib/email-service'
import { createRedisRateLimiter } from '@/lib/redis-integration'
import { logger } from '@/lib/logger'
import {
  generatePasswordResetToken,
  getBaseUrlFromRequest,
  getClientIpFromRequest,
  PASSWORD_RESET_TOKEN_TTL_MS,
} from '@/lib/password-reset'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const RequestSchema = z.object({
  email: z.string().email(),
})

export async function POST(req: Request) {
  try {
    const body = RequestSchema.parse(await req.json())

    const email = body.email.trim().toLowerCase()
    const ip = getClientIpFromRequest(req)

    // Rate limit (não vaza se o email existe)
    const rateKey = `pwreset:${ip}:${email}`
    const rl = await createRedisRateLimiter().checkRateLimit(
      rateKey,
      5,
      10 * 60 * 1000,
      10 * 60 * 1000
    )

    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Muitas tentativas. Aguarde alguns minutos.' },
        { status: 429 }
      )
    }

    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: { id: true, email: true, name: true, isActive: true },
    })

    // Resposta sempre igual para evitar enumeração de usuários
    const okResponse = NextResponse.json({ ok: true })

    if (!user || !user.isActive) {
      return okResponse
    }

    const { token, tokenHash } = generatePasswordResetToken()
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS)
    const userAgent = req.headers.get('user-agent') || undefined

    // Limpeza leve de tokens antigos
    await prisma.passwordResetToken.deleteMany({
      where: {
        OR: [{ expiresAt: { lt: new Date() } }, { usedAt: { not: null } }],
        userId: user.id,
      },
    })

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
        requestedIp: ip,
        requestedUserAgent: userAgent,
      },
    })

    const baseUrl = getBaseUrlFromRequest(req)
    const resetUrl = `${baseUrl}/auth/reset-password?token=${encodeURIComponent(token)}`

    const subject = 'Redefinição de senha - HealthCare'
    const text = `Olá${user.name ? `, ${user.name}` : ''}!\n\nRecebemos uma solicitação para redefinir sua senha.\n\nPara criar uma nova senha, acesse o link abaixo (válido por 30 minutos):\n${resetUrl}\n\nSe você não solicitou isso, ignore este email.\n`

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
        <h2>Redefinição de senha</h2>
        <p>Olá${user.name ? `, <strong>${user.name}</strong>` : ''}.</p>
        <p>Recebemos uma solicitação para redefinir sua senha.</p>
        <p>
          <a href="${resetUrl}">Clique aqui para criar uma nova senha</a>
        </p>
        <p>Este link é válido por 30 minutos.</p>
        <p>Se você não solicitou isso, ignore este email.</p>
      </div>
    `

    const result = await emailService.sendEmail({
      to: user.email,
      subject,
      text,
      html,
    })

    if (!result.success) {
      logger.error('Falha ao enviar email de reset de senha:', result.error)
    }

    return okResponse
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }

    logger.error('Erro no request de reset de senha:', error)
    // não vazar detalhes
    return NextResponse.json({ ok: true })
  }
}
