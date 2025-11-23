import { PrismaClient } from '@prisma/client'

console.log('[lib/prisma] Initializing Prisma Client module...');

interface GlobalWithPrisma {
  prisma: PrismaClient | undefined
  prismaConnectPromise: Promise<void> | undefined
}

const globalForPrisma = globalThis as unknown as GlobalWithPrisma

let prismaInstance: PrismaClient;

try {
  if (globalForPrisma.prisma) {
    console.log('[lib/prisma] Using existing global Prisma instance');
    prismaInstance = globalForPrisma.prisma;
  } else {
    console.log('[lib/prisma] Creating NEW Prisma Client instance');
    prismaInstance = new PrismaClient({
      log: ['error', 'warn'], // Reduce noise, keep errors
    });
    globalForPrisma.prisma = prismaInstance;
  }
} catch (error) {
  console.error('[lib/prisma] FAILED to initialize Prisma Client:', error);
  // Fallback to prevent crash on import, though usage will fail
  prismaInstance = new PrismaClient(); 
}

export const prisma = prismaInstance;

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
