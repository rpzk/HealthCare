import { PrismaClient } from '@prisma/client'
import { logger } from './logger'

const dbLogger = logger.child({ module: 'db-client' })

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
    dbLogger.debug('Connecting to database...')
    await getPrisma().$connect()
    dbLogger.debug('Connected successfully')
  } catch (e) {
    dbLogger.error({ err: e }, 'Failed to connect to database')
    throw e
  }
}

export async function ensurePrismaConnected() {
  if (!globalForPrisma.__prismaConnectPromise) {
    dbLogger.debug('Starting new connection promise')
    globalForPrisma.__prismaConnectPromise = internalConnect()
  }

  try {
    await globalForPrisma.__prismaConnectPromise
  } catch (e) {
    globalForPrisma.__prismaConnectPromise = undefined
    throw e
  }

  return getPrisma()
}