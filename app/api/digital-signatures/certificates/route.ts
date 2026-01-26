import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { handleApiError } from '@/lib/api-error-handler'
import { Prisma } from '@prisma/client'
export const dynamic = 'force-dynamic'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const take = Math.min(Number(searchParams.get('limit')) || 20, 100)
    const skip = Number(searchParams.get('offset')) || 0
    const onlyActive = searchParams.get('active') === 'true'
    const serial = searchParams.get('serialNumber')

    const where: Prisma.DigitalCertificateWhereInput = {
      ...(serial ? { serialNumber: { contains: serial, mode: 'insensitive' } } : {}),
      ...(onlyActive ? { isActive: true } : {}),
    }

    // Non-admin users can only see their own certificates
    if (session.user.role !== 'ADMIN') {
      where.userId = session.user.id
    }

    const [certificates, total] = await Promise.all([
      prisma.digitalCertificate.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        select: {
          id: true,
          userId: true,
          certificateType: true,
          issuer: true,
          subject: true,
          serialNumber: true,
          notBefore: true,
          notAfter: true,
          isActive: true,
          isHardwareToken: true,
          tokenSerialNumber: true,
          lastUsedAt: true,
          usageCount: true,
          createdAt: true,
          revokedAt: true,
          revokedReason: true,
        }
      }),
      prisma.digitalCertificate.count({ where }),
    ])

    return NextResponse.json({ certificates, total, take, skip })
  } catch (error) {
    logger.error({ err: error }, 'Erro ao listar certificados digitais')
    return handleApiError(error)
  }
}
