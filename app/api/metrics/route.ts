import { NextResponse } from 'next/server'
import { renderPrometheus } from '@/lib/metrics'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const body = await renderPrometheus(prisma)
  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; version=0.0.4'
    }
  })
}
