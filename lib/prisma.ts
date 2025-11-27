import { PrismaClient } from '@prisma/client'

// Singleton pattern para PrismaClient
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
})

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export function getPrisma(): PrismaClient {
  return prisma
}

export async function ensurePrismaConnected(): Promise<PrismaClient> {
  await prisma.$connect()
  return prisma
}

export default prisma
