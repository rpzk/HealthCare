import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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
    console.error('Erro ao listar passkeys:', error)
    return NextResponse.json({ error: error?.message || 'Erro interno' }, { status: 500 })
  }
}
