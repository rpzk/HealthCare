import { prisma } from '@/lib/prisma'
import { incCounter } from './metrics'
import { logger } from '@/lib/logger'

// Limite diário simples por tipo
const DEFAULT_LIMITS: Record<string, number> = {
  'symptom_analysis': 50,
  'drug_interaction': 30,
  'medical_summary': 40,
  'vital_signs': 60,
  'treatment_plan': 25,
  'protocol_expansion': 30
}

export async function checkAndConsumeAIQuota(userId: string, type: string) {
  const today = new Date(); today.setHours(0,0,0,0)
  const key = `${userId}:${type}:${today.toISOString().slice(0,10)}`
  // Usar tabela AIInteraction para contar
  const date = today
  const limit = DEFAULT_LIMITS[type] || 20
  // Tenta usar tabela agregada (type deve estar em maiúsculas para o enum PostgreSQL)
  const enumType = type.toUpperCase().replace(/-/g, '_')
  try {
    // Upsert manual (funciona após migration)
    const row = await prisma.$queryRawUnsafe<{ count: number }[]>(`
      INSERT INTO ai_quota_usage ("userId", type, date, count, "createdAt", "updatedAt")
      VALUES ($1, $2::"AIRequestType", $3, 1, now(), now())
      ON CONFLICT ("userId", type, date) DO UPDATE SET count = ai_quota_usage.count + 1, "updatedAt" = now()
      RETURNING count;`, userId, enumType, date)
    const current = Array.isArray(row) ? row[0]?.count : undefined
    if (current && current > limit) {
      incCounter('ai_quota_exceeded_total', { type })
      throw new Error('Limite diário de uso de IA atingido')
    }
  } catch (e) {
    // Fallback: contagem via AIInteraction
    try {
      const count = await prisma.aIInteraction.count({
        where: { userId, type: enumType as any, createdAt: { gte: today } }
      })
      if (count > limit) {
        incCounter('ai_quota_exceeded_total', { type })
        throw new Error('Limite diário de uso de IA atingido')
      }
    } catch (fallbackErr: any) {
      // Se o enum ainda não tiver o valor (migração pendente ou client desatualizado), permite a requisição
      if (fallbackErr?.message?.includes('AIRequestType') || fallbackErr?.message?.includes('Invalid value') || fallbackErr?.code === 'P2004') {
        logger.warn({ type, enumType }, 'AIRequestType não reconhecido no Prisma client - quota ignorada. Reinicie o servidor após migração.')
        return
      }
      throw fallbackErr
    }
  }
}
