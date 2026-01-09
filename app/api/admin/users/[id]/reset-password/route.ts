import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import {
  assertUserAcceptedTerms,
  getAudienceForRole,
  TermsNotAcceptedError,
  TermsNotConfiguredError,
} from '@/lib/terms-enforcement'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST - Resetar senha do usuário
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    try {
      await assertUserAcceptedTerms({
        prisma,
        userId: session.user.id,
        audience: getAudienceForRole(session.user.role),
        gates: ['ADMIN_PRIVILEGED'],
      })
    } catch (e) {
      if (e instanceof TermsNotAcceptedError) {
        return NextResponse.json(
          {
            error: e.message,
            code: e.code,
            missing: e.missingTerms.map((t) => ({ id: t.id, slug: t.slug, title: t.title, audience: t.audience })),
          },
          { status: 403 }
        )
      }
      if (e instanceof TermsNotConfiguredError) {
        return NextResponse.json({ error: e.message, code: e.code, missing: e.missing }, { status: 503 })
      }
      throw e
    }

    // Verificar se usuário existe
    const existingUser = await prisma.user.findUnique({
      where: { id: params.id }
    })

    if (!existingUser) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    // Gerar senha temporária
    const temporaryPassword = generateTemporaryPassword()
    const hashedPassword = await bcrypt.hash(temporaryPassword, 12)

    // Atualizar senha
    await prisma.user.update({
      where: { id: params.id },
      data: { 
        password: hashedPassword,
        updatedAt: new Date()
      }
    })

    return NextResponse.json({ 
      success: true,
      temporaryPassword,
      message: 'Senha resetada com sucesso. Compartilhe a senha temporária de forma segura.'
    })
  } catch (error) {
    console.error('Erro ao resetar senha:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

function generateTemporaryPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let password = ''
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}
