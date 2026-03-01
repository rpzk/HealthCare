import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const creds = await (prisma as any).webAuthnCredential.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        nickname: true,
        createdAt: true,
        lastUsedAt: true,
        deviceType: true,
        backedUp: true,
        authenticatorAttachment: true,
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ credentials: creds })
  } catch (error: any) {
    logger.error('Erro ao listar passkeys:', error)
    return NextResponse.json({ error: error?.message || 'Erro interno' }, { status: 500 })
  }
}

/**
 * DELETE /api/auth/webauthn/credentials?id=xxx
 * Remove uma passkey específica
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const credentialId = searchParams.get('id')

    if (!credentialId) {
      return NextResponse.json({ error: 'ID da passkey não fornecido' }, { status: 400 })
    }

    // Verificar se o usuário tem outras formas de autenticação
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        password: true,
        twoFactorEnabled: true,
        webAuthnCredentials: {
          select: { id: true }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    // Se for a última passkey e não tiver senha nem 2FA, não permitir remoção
    if (user.webAuthnCredentials.length === 1 && !user.password && !user.twoFactorEnabled) {
      return NextResponse.json(
        { error: 'Não é possível remover a última passkey sem ter senha configurada' },
        { status: 400 }
      )
    }

    // Remover a passkey
    await (prisma as any).webAuthnCredential.delete({
      where: {
        id: credentialId,
        userId: session.user.id // Garantir que pertence ao usuário
      }
    })

    logger.info({ userId: session.user.id, credentialId }, 'Passkey removida')

    return NextResponse.json({ success: true })
  } catch (error: any) {
    logger.error({ error }, 'Erro ao remover passkey')
    return NextResponse.json(
      { error: error?.message || 'Erro ao remover passkey' },
      { status: 500 }
    )
  }
}
