import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const lookup = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { patientId: true, email: true },
    })

    const patient = lookup?.patientId
      ? await prisma.patient.findUnique({ where: { id: lookup.patientId }, select: { id: true } })
      : lookup?.email
        ? await prisma.patient.findFirst({
            where: { email: { equals: lookup.email, mode: 'insensitive' } },
            select: { id: true },
          })
        : null

    if (!patient) {
      return NextResponse.json({ alerts: [] })
    }

    const patientId = patient.id
    const alerts = await prisma.readingThreshold.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        readingType: true,
        criticalLow: true,
        criticalHigh: true,
        warningLow: true,
        warningHigh: true,
        normalMin: true,
        normalMax: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      }
    })

    return NextResponse.json({ alerts })
  } catch (error) {
    logger.error('Error fetching alerts:', error)
    return NextResponse.json({ error: 'Erro ao carregar alertas' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const { type, minValue, maxValue, active = true } = body || {}
    if (!type || (minValue === undefined && maxValue === undefined)) {
      return NextResponse.json({ error: 'type e min/max são obrigatórios' }, { status: 400 })
    }

    const lookup = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { patientId: true, email: true },
    })

    const patient = lookup?.patientId
      ? await prisma.patient.findUnique({ where: { id: lookup.patientId }, select: { id: true } })
      : lookup?.email
        ? await prisma.patient.findFirst({
            where: { email: { equals: lookup.email, mode: 'insensitive' } },
            select: { id: true },
          })
        : null

    if (!patient) return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })

    const created = await prisma.readingThreshold.create({
      data: {
        patientId: patient.id,
        readingType: type,
        criticalLow: minValue ?? null,
        criticalHigh: maxValue ?? null,
        isActive: active,
      }
    })

    return NextResponse.json({ alert: created })
  } catch (error) {
    logger.error('Error creating alert:', error)
    return NextResponse.json({ error: 'Erro ao criar alerta' }, { status: 500 })
  }
}