import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma || new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export function getPrisma(): PrismaClient {
  return prisma;
}

export async function ensurePrismaConnected() {
  // No-op for compatibility
  return prisma;
}

async function internalConnect() {
  try {
    console.log('[lib/prisma] Connecting to database...');
    await prisma.$connect()
    console.log('[lib/prisma] Connected successfully');
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

// NÃO chamar automaticamente aqui - deixar as dependências chamarem quando necessário
// ensurePrismaConnected().catch(()=>{})
