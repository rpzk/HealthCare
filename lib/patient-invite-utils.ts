import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

const TERM_SELECT = {
  id: true,
  slug: true,
  title: true,
  content: true,
  version: true,
  updatedAt: true,
} as const

/** Termos ativos para fluxo de convite; fallback se coluna `audience` ainda não existir no banco. */
export async function loadTermsForPatientInvite() {
  try {
    return await prisma.term.findMany({
      where: {
        isActive: true,
        OR: [{ audience: 'ALL' }, { audience: 'PATIENT' }],
      },
      select: TERM_SELECT,
      orderBy: [{ slug: 'asc' }, { createdAt: 'desc' }],
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (!/audience|TermAudience|column/i.test(message)) {
      throw error
    }
    logger.warn('[patient-invites] Coluna audience ausente; usando todos os termos ativos')
    return prisma.term.findMany({
      where: { isActive: true },
      select: TERM_SELECT,
      orderBy: [{ slug: 'asc' }, { createdAt: 'desc' }],
    })
  }
}

export function prismaErrorHint(error: unknown): string | undefined {
  const code = (error as { code?: string })?.code
  if (code === 'P2021') return 'Tabela ausente no banco — execute prisma migrate deploy ou db push'
  if (code === 'P2022') return 'Coluna ausente no banco — sincronize o schema'
  if (code === 'P2002') return 'Registro duplicado (constraint única)'
  return code ? `Prisma ${code}` : undefined
}
