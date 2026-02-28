import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'

type ProtocolItems = {
  prescriptions?: Array<{ medicationName?: string; dosage?: string; frequency?: string; duration?: string; instructions?: string }>
  exams?: Array<{ examName?: string; description?: string; priority?: string; notes?: string }>
  referrals?: Array<{ specialty?: string; description?: string; priority?: string; notes?: string }>
  diagnoses?: Array<{ cidCode?: string; description?: string }>
}

// POST - Aplicar protocolo (retorna itens e incrementa uso)
export const POST = withAuth(async (req: NextRequest, { user, params }) => {
  try {
    const id = params.id

    const protocol = await prisma.protocol.findFirst({
      where: {
        id,
        isActive: true,
        OR: [
          { doctorId: user.id },
          { isPublic: true }
        ]
      }
    })

    if (!protocol) {
      return NextResponse.json({ error: 'Protocolo não encontrado ou sem permissão' }, { status: 404 })
    }

    const items = (protocol.items as ProtocolItems | null) || {}
    const data = {
      prescriptions: items.prescriptions || [],
      exams: items.exams || [],
      referrals: items.referrals || [],
      diagnoses: items.diagnoses || []
    }

    await prisma.protocol.update({
      where: { id },
      data: { usageCount: { increment: 1 } }
    })

    return NextResponse.json({ data })
  } catch (error) {
    logger.error('Erro ao aplicar protocolo:', error)
    return NextResponse.json({ error: 'Erro ao aplicar protocolo' }, { status: 500 })
  }
})
