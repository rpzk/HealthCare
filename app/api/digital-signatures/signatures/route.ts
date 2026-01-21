import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { logger } from '@/lib/logger'
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
    const documentType = searchParams.get('documentType')
    const documentId = searchParams.get('documentId')
    const signerId = searchParams.get('signerId')
    const certificateId = searchParams.get('certificateId')
    const signerTerm = searchParams.get('signer')
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    const where: any = {
      ...(documentType ? { documentType } : {}),
      ...(documentId ? { documentId } : {}),
      ...(certificateId ? { certificateId } : {}),
    }

    if (from) {
      const fromDate = new Date(from)
      if (!isNaN(fromDate.getTime())) {
        where.signedAt = { ...(where.signedAt || {}), gte: fromDate }
      }
    }
    if (to) {
      const toDate = new Date(to)
      if (!isNaN(toDate.getTime())) {
        toDate.setHours(23, 59, 59, 999)
        where.signedAt = { ...(where.signedAt || {}), lte: toDate }
      }
    }

    // Non-admin: restrict to signatures created by user or certificates owned by user
    if (session.user.role !== 'ADMIN') {
      where.OR = [
        { signerId: session.user.id },
        { certificate: { userId: session.user.id } },
      ]
    } else if (signerId) {
      where.signerId = signerId
    }

    if (signerTerm) {
      where.AND = [
        ...(where.AND || []),
        {
          signer: {
            OR: [
              { name: { contains: signerTerm, mode: 'insensitive' } },
              { email: { contains: signerTerm, mode: 'insensitive' } },
              { id: { equals: signerTerm } },
            ],
          },
        },
      ]
    }

    const [signatures, total] = await Promise.all([
      prisma.signedDocument.findMany({
        where,
        orderBy: { signedAt: 'desc' },
        skip,
        take,
        include: {
          certificate: {
            select: {
              id: true,
              userId: true,
              certificateType: true,
              issuer: true,
              subject: true,
              serialNumber: true,
              isActive: true,
              notAfter: true,
            }
          },
          signer: {
            select: { id: true, name: true, email: true }
          }
        }
      }),
      prisma.signedDocument.count({ where }),
    ])

    return NextResponse.json({ signatures, total, take, skip })
  } catch (error: any) {
    logger.error('Erro ao listar assinaturas digitais:', error)
    return NextResponse.json(
      { error: error?.message || 'Erro ao listar assinaturas' },
      { status: 500 }
    )
  }
}
