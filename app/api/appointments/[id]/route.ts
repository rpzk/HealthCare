import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { rateLimiters } from '@/lib/rate-limiter'
import { updateAppointmentSchema } from '@/lib/validation-schemas-api'
import { sendAppointmentReassignedEmail, sendAppointmentRescheduledEmail } from '@/lib/email-service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Direct Prisma client to avoid bundling issues
const { PrismaClient } = require('@prisma/client')
const globalForPrisma = globalThis as unknown as { prisma: InstanceType<typeof PrismaClient> }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export const GET = withAuth(async (req: NextRequest, { params, user }) => {
  const rl = rateLimiters.default(req)
  if (rl instanceof NextResponse) return rl

  const id = (params?.id as string) || ''
  if (!id) return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 })

  if (!['ADMIN', 'MANAGER', 'RECEPTIONIST', 'DOCTOR'].includes(user.role)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const consultation = await prisma.consultation.findUnique({
    where: { id },
    include: {
      patient: { select: { id: true, name: true, email: true, phone: true, cpf: true } },
      doctor: { select: { id: true, name: true, email: true, speciality: true } },
    },
  })

  if (!consultation) {
    return NextResponse.json({ error: 'Agendamento não encontrado' }, { status: 404 })
  }

  const isPrivileged = ['ADMIN', 'MANAGER', 'RECEPTIONIST'].includes(user.role)
  if (!isPrivileged && consultation.doctorId !== user.id) {
    return NextResponse.json({ error: 'Sem permissão para ver este agendamento' }, { status: 403 })
  }

  return NextResponse.json({ success: true, consultation })
})

export const PATCH = withAuth(async (req: NextRequest, { params, user }) => {
  const rl = rateLimiters.default(req)
  if (rl instanceof NextResponse) return rl

  const id = (params?.id as string) || ''
  if (!id) return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 })

  if (!['ADMIN', 'MANAGER', 'RECEPTIONIST', 'DOCTOR'].includes(user.role)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const parsed = updateAppointmentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dados inválidos', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const data = parsed.data

  const consultation = await prisma.consultation.findUnique({
    where: { id },
    select: { id: true, doctorId: true, status: true, scheduledDate: true },
  })

  if (!consultation) {
    return NextResponse.json({ error: 'Agendamento não encontrado' }, { status: 404 })
  }

  const isPrivileged = ['ADMIN', 'MANAGER', 'RECEPTIONIST'].includes(user.role)
  if (!isPrivileged && consultation.doctorId !== user.id) {
    return NextResponse.json({ error: 'Sem permissão para alterar este agendamento' }, { status: 403 })
  }

  if (['COMPLETED', 'CANCELLED'].includes(consultation.status)) {
    return NextResponse.json(
      { error: 'Não é possível alterar um agendamento concluído ou cancelado' },
      { status: 400 }
    )
  }

  const update: any = {}

  const previousScheduledDate = consultation.scheduledDate
  let didChangeScheduledDate = false
  const previousDoctorId = consultation.doctorId
  let didChangeDoctor = false
  let previousDoctorName: string | null = null

  if (typeof data.scheduledDate === 'string') {
    const nextDate = new Date(data.scheduledDate)
    if (isNaN(nextDate.getTime())) {
      return NextResponse.json({ error: 'Data de agendamento inválida' }, { status: 400 })
    }

    // Conflict check when changing time
    const doctorId = data.doctorId || consultation.doctorId
    const durationMinutes = typeof data.duration === 'number' ? data.duration : 30

    const conflict = await prisma.consultation.findFirst({
      where: {
        id: { not: id },
        doctorId,
        scheduledDate: {
          gte: new Date(nextDate.getTime() - durationMinutes * 60 * 1000),
          lte: new Date(nextDate.getTime() + durationMinutes * 60 * 1000),
        },
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
      },
      select: { id: true },
    })

    if (conflict) {
      return NextResponse.json(
        { error: 'Já existe um agendamento neste horário para este profissional' },
        { status: 400 }
      )
    }

    update.scheduledDate = nextDate
    didChangeScheduledDate = nextDate.getTime() !== new Date(previousScheduledDate).getTime()
  }

  if (typeof data.type === 'string') update.type = data.type
  if (typeof data.duration === 'number') update.duration = data.duration
  if (typeof data.notes === 'string' || data.notes === null) update.notes = data.notes
  if (typeof data.description === 'string' || data.description === null) update.description = data.description

  if (typeof data.status === 'string') {
    update.status = data.status
  }

  if (isPrivileged && typeof data.doctorId === 'string') {
    update.doctorId = data.doctorId
    didChangeDoctor = data.doctorId !== previousDoctorId
    if (didChangeDoctor) {
      const oldDoctor = await prisma.user.findUnique({
        where: { id: previousDoctorId },
        select: { name: true },
      })
      previousDoctorName = oldDoctor?.name || null
    }
  }

  // Conflict check when changing doctor and/or duration without changing time
  if (!update.scheduledDate && (didChangeDoctor || typeof data.duration === 'number')) {
    const nextDoctorId = (typeof update.doctorId === 'string' ? update.doctorId : consultation.doctorId) as string
    const durationMinutes = typeof data.duration === 'number' ? data.duration : 30
    const baseDate = new Date(previousScheduledDate)

    const conflict = await prisma.consultation.findFirst({
      where: {
        id: { not: id },
        doctorId: nextDoctorId,
        scheduledDate: {
          gte: new Date(baseDate.getTime() - durationMinutes * 60 * 1000),
          lte: new Date(baseDate.getTime() + durationMinutes * 60 * 1000),
        },
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
      },
      select: { id: true },
    })

    if (conflict) {
      return NextResponse.json(
        { error: 'Já existe um agendamento neste horário para este profissional' },
        { status: 400 }
      )
    }
  }

  const updated = await prisma.consultation.update({
    where: { id },
    data: {
      ...update,
      updatedAt: new Date(),
    },
    include: {
      patient: { select: { id: true, name: true, email: true, phone: true, cpf: true } },
      doctor: { select: { id: true, name: true, email: true, speciality: true } },
    },
  })

  // Notify patient if rescheduled; never fail the update if email fails.
  if (didChangeScheduledDate && updated.patient?.email) {
    try {
      const oldDateStr = new Date(previousScheduledDate).toLocaleDateString('pt-BR')
      const oldTimeStr = new Date(previousScheduledDate).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      })

      const newDateStr = updated.scheduledDate.toLocaleDateString('pt-BR')
      const newTimeStr = updated.scheduledDate.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      })

      await sendAppointmentRescheduledEmail({
        patientEmail: updated.patient.email,
        patientName: updated.patient.name,
        doctorName: updated.doctor?.name || 'Profissional',
        oldDate: oldDateStr,
        oldTime: oldTimeStr,
        newDate: newDateStr,
        newTime: newTimeStr,
      })
    } catch (emailError) {
      console.error('Error sending appointment rescheduled email:', emailError)
    }
  }

  // Notify patient if doctor was changed; never fail the update if email fails.
  if (didChangeDoctor && updated.patient?.email) {
    try {
      const dateStr = updated.scheduledDate.toLocaleDateString('pt-BR')
      const timeStr = updated.scheduledDate.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      })

      await sendAppointmentReassignedEmail({
        patientEmail: updated.patient.email,
        patientName: updated.patient.name,
        oldDoctorName: previousDoctorName || 'Profissional',
        newDoctorName: updated.doctor?.name || 'Profissional',
        date: dateStr,
        time: timeStr,
      })
    } catch (emailError) {
      console.error('Error sending appointment reassigned email:', emailError)
    }
  }

  return NextResponse.json({ success: true, consultation: updated })
})
