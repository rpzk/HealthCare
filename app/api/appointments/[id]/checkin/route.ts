import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { rateLimiters } from '@/lib/rate-limiter'

// Direct Prisma client to avoid bundling issues
const { PrismaClient } = require('@prisma/client')
const globalForPrisma = globalThis as unknown as { prisma: InstanceType<typeof PrismaClient> }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// POST - Check-in patient for appointment
export const POST = withAuth(async (req: NextRequest, { params, user }) => {
  const rl = rateLimiters.default(req)
  if (rl instanceof NextResponse) return rl

  // Only admin, manager, receptionist can do check-in
  if (!['ADMIN', 'MANAGER', 'RECEPTIONIST'].includes(user.role)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  try {
    const id = params?.id as string

    const consultation = await prisma.consultation.findUnique({
      where: { id },
      include: {
        patient: { select: { id: true, name: true } },
        doctor: { select: { id: true, name: true } }
      }
    })

    if (!consultation) {
      return NextResponse.json({ error: 'Agendamento não encontrado' }, { status: 404 })
    }

    if (consultation.status !== 'SCHEDULED') {
      return NextResponse.json(
        { error: `Não é possível fazer check-in. Status atual: ${consultation.status}` },
        { status: 400 }
      )
    }

    const updated = await prisma.consultation.update({
      where: { id },
      data: {
        status: 'WAITING',
        // We could add a checkedInAt field if it exists in schema
      },
      include: {
        patient: { select: { id: true, name: true } },
        doctor: { select: { id: true, name: true } }
      }
    })

    // Notify doctor about patient arrival
    await prisma.notification.create({
      data: {
        userId: consultation.doctorId,
        title: 'Paciente Chegou',
        message: `${consultation.patient.name} chegou para a consulta`,
        type: 'INFO'
      }
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    console.error('Error checking in patient:', error)
    return NextResponse.json(
      { error: 'Erro ao fazer check-in', details: error.message },
      { status: 500 }
    )
  }
})
