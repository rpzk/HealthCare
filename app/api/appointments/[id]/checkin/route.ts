import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { rateLimiters } from '@/lib/rate-limiter'
import { prisma } from '@/lib/prisma'

// POST - Check-in patient for appointment
export const POST = withAuth(async (req: NextRequest, { params, user }) => {
  const rl = rateLimiters.default(req)
  if (rl instanceof NextResponse) return rl

  // Only admin and receptionist can do check-in
  if (!['ADMIN', 'RECEPTIONIST'].includes(user.role)) {
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

    // ConsultationStatus does not include a dedicated WAITING state.
    // Keep status unchanged and only notify the doctor.
    const updated = consultation

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
