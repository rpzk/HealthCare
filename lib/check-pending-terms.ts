import { PrismaClient } from '@prisma/client'
import { getAudienceForRole } from './terms-enforcement'

/**
 * Verifica se o usuário tem termos pendentes para aceitar.
 * Retorna array de IDs de termos pendentes ou null se não houver.
 */
export async function checkPendingTerms(
  prisma: PrismaClient,
  userId: string,
  role: string
): Promise<string[] | null> {
  const audience = getAudienceForRole(role)

  // Buscar todos os termos ativos para a audiência do usuário
  const activeTerms = await prisma.term.findMany({
    where: {
      isActive: true,
      OR: [{ audience: 'ALL' }, { audience }],
    },
    select: { id: true },
  })

  if (activeTerms.length === 0) {
    return null // Sem termos configurados
  }

  // Buscar termos já aceitos pelo usuário
  const accepted = await prisma.termAcceptance.findMany({
    where: {
      userId,
      termId: { in: activeTerms.map((t) => t.id) },
    },
    select: { termId: true },
  })

  const acceptedIds = new Set(accepted.map((a) => a.termId))
  const pendingIds = activeTerms.filter((t) => !acceptedIds.has(t.id)).map((t) => t.id)

  return pendingIds.length > 0 ? pendingIds : null
}
