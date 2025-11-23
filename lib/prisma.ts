import { PrismaClient } from '@prisma/client'

type PrismaGlobal = typeof globalThis & {
  __prisma?: PrismaClient
  __prismaConnectPromise?: Promise<void>
}

const globalForPrisma = globalThis as PrismaGlobal

const createPrismaClient = () =>
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

function initializePrisma() {
  if (!globalForPrisma.__prisma) {
    globalForPrisma.__prisma = createPrismaClient()
  }
  return globalForPrisma.__prisma
}

export const prisma = initializePrisma()

export function getPrisma(): PrismaClient {
  return initializePrisma()
}

async function internalConnect() {
  try {
    console.log('[lib/prisma] Connecting to database...')
    await getPrisma().$connect()
    console.log('[lib/prisma] Connected successfully')
  } catch (e: any) {
    console.error('[prisma] falha ao conectar:', e?.message)
    throw e
  }
}

export async function ensurePrismaConnected() {
  if (!globalForPrisma.__prismaConnectPromise) {
    console.log('[prisma] iniciando conexão (nova promise)')
    globalForPrisma.__prismaConnectPromise = internalConnect()
  } else if (!(globalThis as any).__prismaReusingLogged) {
    console.log('[prisma] reutilizando promise de conexão existente')
    ;(globalThis as any).__prismaReusingLogged = true
  }

  try {
    await globalForPrisma.__prismaConnectPromise
  } catch (e) {
    globalForPrisma.__prismaConnectPromise = undefined
    throw e
  }

  return getPrisma()
}

// NÃO chamar automaticamente aqui - deixar as dependências chamarem quando necessário
// ensurePrismaConnected().catch(()=>{})
