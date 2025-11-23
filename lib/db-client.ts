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
    console.log('[lib/db-client] Connecting to database...')
    await getPrisma().$connect()
    console.log('[lib/db-client] Connected successfully')
  } catch (e: any) {
    console.error('[lib/db-client] falha ao conectar:', e?.message)
    throw e
  }
}

export async function ensurePrismaConnected() {
  if (!globalForPrisma.__prismaConnectPromise) {
    console.log('[lib/db-client] iniciando conexão (nova promise)')
    globalForPrisma.__prismaConnectPromise = internalConnect()
  } else if (!(globalThis as any).__prismaReusingLogged) {
    console.log('[lib/db-client] reutilizando promise de conexão existente')
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