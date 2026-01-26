import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// GET patient's own appointments
export const GET = withAuth(async (req: NextRequest, { user }) => {
  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { patientId: true, email: true },
    })

    const patientIdFromUser = dbUser?.patientId ?? null
    const patient = patientIdFromUser
      ? await prisma.patient.findUnique({ where: { id: patientIdFromUser }, select: { id: true, name: true } })
      : await prisma.patient.findFirst({ where: { email: dbUser?.email ?? user.email }, select: { id: true, name: true } })

    if (!patient) {
      return NextResponse.json({ error: 'Registro de paciente não encontrado' }, { status: 404 })
    }

    const appointments = await prisma.consultation.findMany({
      where: {
        patientId: patient.id,
        scheduledDate: { gte: new Date() }, // Only future appointments
        status: { notIn: ['CANCELLED'] }
      },
      include: {
        doctor: {
          select: {
            id: true,
            name: true,
            speciality: true
          }
        }
      },
      orderBy: { scheduledDate: 'asc' }
    })

    return NextResponse.json({ data: appointments })
  } catch (error) {
    logger.error('Error fetching patient appointments:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar consultas' },
      { status: 500 }
    )
  }
})

// POST - Patient books their own appointment
export const POST = withAuth(async (req: NextRequest, { user }) => {
  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { patientId: true, email: true },
    })

    const patientIdFromUser = dbUser?.patientId ?? null
    const patient = patientIdFromUser
      ? await prisma.patient.findUnique({ where: { id: patientIdFromUser }, select: { id: true, name: true } })
      : await prisma.patient.findFirst({ where: { email: dbUser?.email ?? user.email }, select: { id: true, name: true } })

    if (!patient) {
      return NextResponse.json({ error: 'Registro de paciente não encontrado' }, { status: 404 })
    }

    const body = await req.json()
    const { doctorId, scheduledDate, type, notes } = body

    if (!doctorId || !scheduledDate) {
      return NextResponse.json(
        { error: 'Médico e data são obrigatórios' },
        { status: 400 }
      )
    }

    const appointmentDate = new Date(scheduledDate)

    // Check if slot is available
    const conflict = await prisma.consultation.findFirst({
      where: {
        doctorId,
        scheduledDate: {
          gte: new Date(appointmentDate.getTime() - 15 * 60 * 1000),
          lte: new Date(appointmentDate.getTime() + 15 * 60 * 1000)
        },
        status: { notIn: ['CANCELLED', 'NO_SHOW'] }
      }
    })

    if (conflict) {
      return NextResponse.json(
        { error: 'Este horário não está mais disponível' },
        { status: 400 }
      )
    }

    const consultation = await prisma.consultation.create({
      data: {
        patientId: patient.id,
        doctorId,
        scheduledDate: appointmentDate,
        type: type || 'CONSULTATION',
        notes,
        status: 'SCHEDULED'
      },
      include: {
        doctor: {
          select: { name: true, speciality: true }
        }
      }
    })

    // Create notification for doctor
    await prisma.notification.create({
      data: {
        userId: doctorId,
        type: 'APPOINTMENT',
        title: 'Novo agendamento',
        message: `${patient.name} agendou uma consulta para ${appointmentDate.toLocaleString('pt-BR')}`,
        priority: 'MEDIUM'
      }
    })

    return NextResponse.json(consultation, { status: 201 })
  } catch (error) {
    logger.error('Error creating appointment:', error)
    return NextResponse.json(
      { error: 'Erro ao agendar consulta' },
      { status: 500 }
    )
  }
})
