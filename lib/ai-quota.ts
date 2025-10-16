'use server'

import { prisma } from '@/lib/prisma'
import { incCounter } from './metrics'

// Limite diário simples por tipo
const DEFAULT_LIMITS: Record<string, number> = {
  'symptom_analysis': 50,
  'drug_interaction': 30,
  'medical_summary': 40,
  'vital_signs': 60,
  'treatment_plan': 25
}

export async function checkAndConsumeAIQuota(userId: string, type: string) {
  const today = new Date(); today.setHours(0,0,0,0)
  const key = `${userId}:${type}:${today.toISOString().slice(0,10)}`
  // Usar tabela AIInteraction para contar
  const date = today
  const limit = DEFAULT_LIMITS[type] || 20
  // Tenta usar tabela agregada
  try {
    // Upsert manual (funciona após migration)
    const row: any = await prisma.$queryRawUnsafe(`
      INSERT INTO ai_quota_usage ("userId", type, date, count, "createdAt", "updatedAt")
      VALUES ($1, $2, $3, 1, now(), now())
      ON CONFLICT ("userId", type, date) DO UPDATE SET count = ai_quota_usage.count + 1, "updatedAt" = now()
      RETURNING count;`, userId, type, date)
    const current = Array.isArray(row) ? row[0]?.count : row?.count
    if (current && current > limit) {
      incCounter('ai_quota_exceeded_total', { type })
      throw new Error('Limite diário de uso de IA atingido')
    }
  } catch (e) {
    // Fallback: incrementar criando um registro sintético em AIInteraction e então contar
    const enumType = type.toUpperCase().replace(/-/g,'_') as any
    await prisma.aIInteraction.create({
      data: {
        userId,
        type: enumType,
        prompt: '[quota_increment]',
        response: '[placeholder]'
      }
    })
    const count = await prisma.aIInteraction.count({ where:{ userId, type: enumType, createdAt: { gte: today } } })
    if (count > limit) {
      incCounter('ai_quota_exceeded_total', { type })
      throw new Error('Limite diário de uso de IA atingido')
    }
  }
}
