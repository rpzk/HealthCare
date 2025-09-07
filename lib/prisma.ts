import { PrismaClient } from '@prisma/client'

interface GlobalWithPrisma {
  prisma: PrismaClient | undefined
  prismaConnectPromise: Promise<void> | undefined
}

const globalForPrisma = globalThis as unknown as GlobalWithPrisma

export const prisma: PrismaClient = globalForPrisma.prisma ?? new PrismaClient()
globalForPrisma.prisma = prisma // agora sempre cacheia (também em produção) para evitar múltiplas instâncias

async function internalConnect() {
  try {
    await prisma.$connect()
  } catch (e:any) {
    console.error('[prisma] falha ao conectar:', e?.message)
    throw e
  }
}

export async function ensurePrismaConnected() {
  if (!globalForPrisma.prismaConnectPromise) {
    console.log('[prisma] iniciando conexão (nova promise)')
    globalForPrisma.prismaConnectPromise = internalConnect()
  } else {
    // log leve apenas uma vez para não poluir
    if (!(globalThis as any).__prismaReusingLogged) {
      console.log('[prisma] reutilizando promise de conexão existente')
      ;(globalThis as any).__prismaReusingLogged = true
    }
  }
  try {
    await globalForPrisma.prismaConnectPromise
  } catch (e) {
    // reset para permitir nova tentativa externa
    globalForPrisma.prismaConnectPromise = undefined
    throw e
  }
  return prisma
}

// Dispara conexão em background (não bloqueia start) – será aguardada explicitamente onde necessário
ensurePrismaConnected().catch(()=>{})
