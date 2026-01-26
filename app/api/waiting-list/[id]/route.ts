import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withAuth } from '@/lib/with-auth'
import { prisma } from '@/lib/prisma'
import { WaitingListService } from '@/lib/waiting-list-service'
import { ConsultationService } from '@/lib/consultation-service'
import { ConsultationType } from '@prisma/client'

export const runtime = 'nodejs'

const WAITING_LIST_ALLOWED_ROLES = [
  'ADMIN',
  'DOCTOR',
  'NURSE',
  'RECEPTIONIST',
  'PHYSIOTHERAPIST',
  'PSYCHOLOGIST',
  'HEALTH_AGENT',
  'TECHNICIAN',
  'PHARMACIST',
  'DENTIST',
  'NUTRITIONIST',
  'SOCIAL_WORKER',
  'OTHER',
]

const WAITING_LIST_CAN_START_NOW = new Set([
  'ADMIN',
  'DOCTOR',
  'NURSE',
  'PHYSIOTHERAPIST',
  'PSYCHOLOGIST',
  'HEALTH_AGENT',
  'TECHNICIAN',
  'PHARMACIST',
  'DENTIST',
  'NUTRITIONIST',
  'SOCIAL_WORKER',
  'OTHER',
])

export const GET = withAuth(async (_request, { params, user }) => {
  const id = params.id

  const item = await prisma.waitingList.findUnique({
    where: { id },
    include: {
      patient: {
        select: {
          id: true,
          name: true,
          cpf: true,
          phone: true,
          email: true,
        },
      },
      doctor: {
        select: {
          id: true,
          name: true,
          role: true,
          speciality: true,
        },
      },
      appointment: {
        select: {
          id: true,
          status: true,
          scheduledDate: true,
        },
      },
    },
  })

  if (!item) {
    return NextResponse.json({ error: 'Solicitação não encontrada' }, { status: 404 })
  }

  if (user.role !== 'ADMIN' && item.doctorId && item.doctorId !== user.id) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  return NextResponse.json({ success: true, item })
}, { requireRole: WAITING_LIST_ALLOWED_ROLES })

const patchSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('mark_scheduled'), appointmentId: z.string().min(1) }),
  z.object({
    action: z.literal('start_now'),
    type: z.nativeEnum(ConsultationType).optional(),
    duration: z.number().int().min(10).max(240).optional(),
    notes: z.string().max(5000).optional(),
  }),
  z.object({ action: z.literal('cancel') }),
])

export const PATCH = withAuth(async (request: NextRequest, { params, user }) => {
  const id = params.id
  const body = await request.json().catch(() => null)
  const parsed = patchSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dados inválidos', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const item = await prisma.waitingList.findUnique({
    where: { id },
    select: {
      id: true,
      doctorId: true,
      patientId: true,
      status: true,
      appointmentId: true,
      urgencyReason: true,
      notes: true,
      specialty: true,
    },
  })

  if (!item) {
    return NextResponse.json({ error: 'Solicitação não encontrada' }, { status: 404 })
  }

  if (user.role !== 'ADMIN' && item.doctorId && item.doctorId !== user.id) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  if (parsed.data.action === 'mark_scheduled') {
    await WaitingListService.markAsScheduled(id, parsed.data.appointmentId)
    return NextResponse.json({ success: true })
  }

  if (parsed.data.action === 'start_now') {
    if (!WAITING_LIST_CAN_START_NOW.has(user.role)) {
      return NextResponse.json({ error: 'Sem permissão para iniciar atendimento' }, { status: 403 })
    }

    if (item.status === 'CANCELLED' || item.status === 'EXPIRED') {
      return NextResponse.json({ error: 'Solicitação não está ativa' }, { status: 400 })
    }

    if (item.appointmentId) {
      // Idempotência: se já existe consulta vinculada, apenas retornar.
      const existing = await prisma.consultation.findUnique({
        where: { id: item.appointmentId },
        select: { id: true, status: true },
      })
      if (existing) {
        return NextResponse.json({ success: true, consultation: existing })
      }
    }

    const doctorId = item.doctorId || user.id

    // Se a solicitação não tinha médico definido, atrelar ao médico atual.
    if (!item.doctorId) {
      await prisma.waitingList.update({
        where: { id: item.id },
        data: { doctorId },
      })
    }

    const now = new Date()
    const type = parsed.data.type || ConsultationType.INITIAL
    const duration = parsed.data.duration || 60

    const notesParts: string[] = []
    notesParts.push('Iniciada a partir de solicitação da fila de espera')
    notesParts.push(`waitingListId: ${item.id}`)
    if (item.specialty) notesParts.push(`Especialidade: ${item.specialty}`)
    if (item.urgencyReason) notesParts.push(`Urgência: ${item.urgencyReason}`)
    if (item.notes) notesParts.push(`\n${item.notes}`)
    if (parsed.data.notes) notesParts.push(`\n${parsed.data.notes}`)

    const consultation = await ConsultationService.createConsultation({
      patientId: item.patientId,
      doctorId,
      scheduledDate: now,
      type,
      chiefComplaint: item.urgencyReason || undefined,
      notes: notesParts.join('\n'),
      duration,
      status: 'IN_PROGRESS',
    })

    await WaitingListService.markAsScheduled(item.id, consultation.id)

    return NextResponse.json({
      success: true,
      consultation: {
        id: consultation.id,
        status: consultation.status,
      },
    })
  }

  await prisma.waitingList.update({
    where: { id },
    data: { status: 'CANCELLED' },
  })

  return NextResponse.json({ success: true })
}, { requireRole: WAITING_LIST_ALLOWED_ROLES })
