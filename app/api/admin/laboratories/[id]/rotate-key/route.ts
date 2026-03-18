/**
 * POST /api/admin/laboratories/[id]/rotate-key
 *
 * Rotaciona a chave API do laboratório.
 * A chave anterior é invalidada imediatamente.
 * A nova chave em texto puro é retornada UMA VEZ — salve em local seguro.
 */

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { withRbac } from '@/lib/with-auth'
import { LabAuthService } from '@/lib/lab-auth-service'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export const POST = withRbac('admin', async (_req: NextRequest, { params, user }) => {
  const lab = await prisma.laboratory.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, code: true },
  })

  if (!lab) {
    return NextResponse.json({ error: 'Laboratório não encontrado' }, { status: 404 })
  }

  const { plaintext, hash } = LabAuthService.generateApiKey()

  await prisma.laboratory.update({
    where: { id: params.id },
    data: { apiKeyHash: hash },
  })

  logger.info(`[LabAdmin] Chave rotacionada para lab ${lab.code} por ${user.email}`)

  return NextResponse.json({
    labId: lab.id,
    labCode: lab.code,
    apiKey: plaintext, // ⚠️ exibir ao admin e descartar — nunca será exibido novamente
    warning: 'A chave anterior foi invalidada. Salve a nova chave em local seguro.',
    rotatedAt: new Date().toISOString(),
  })
})
