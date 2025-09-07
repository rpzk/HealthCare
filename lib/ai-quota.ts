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
  const count = await prisma.aIInteraction.count({ where:{ userId, type: type.toUpperCase().replace(/-/g,'_') as any, createdAt: { gte: today } } })
  const limit = DEFAULT_LIMITS[type] || 20
  if (count >= limit) {
    incCounter('ai_quota_exceeded_total', { type })
    throw new Error('Limite diário de uso de IA atingido')
  }
}
