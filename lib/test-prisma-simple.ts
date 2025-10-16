// Arquivo super simples para testar importação de prisma
import { prisma } from '@/lib/prisma'

export async function testPrismaConnection() {
  try {
    const result = await prisma.consultation.findFirst()
    return { success: true, result }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}
