import { NextResponse } from 'next/server'
import { renderPrometheus } from '@/lib/metrics'
import { PrismaClient } from '@prisma/client'

// Direct PrismaClient instantiation to avoid bundling issues
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

function getPrismaClient() {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient()
  }
  return globalForPrisma.prisma
}

const prisma = getPrismaClient()

export async function GET() {
  const body = await renderPrometheus(prisma)
  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; version=0.0.4'
    }
  })
}
