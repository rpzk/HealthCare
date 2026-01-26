import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import { SystemSettingsService } from '@/lib/system-settings-service'
import { Role } from '@prisma/client'
import { WaitingListService } from '@/lib/waiting-list-service'

const APPOINTMENT_TYPES_KEY = 'appointment_types'

const patientRequestSchema = z.object({
  professionalId: z.string().min(1, 'ID do profissional é obrigatório'),
  serviceId: z.string().optional(),
  serviceName: z.string().optional(),
  reason: z.string().optional(),
})

type PatientRequestBody = z.infer<typeof patientRequestSchema>

async function getAllowedProfessionalRoles(): Promise<string[]> {
  const raw = await SystemSettingsService.get(APPOINTMENT_TYPES_KEY)
  if (!raw) return []

  try {
    const services = JSON.parse(raw) as Array<{ roles?: unknown; isActive?: unknown }>
    if (!Array.isArray(services)) return []

    const roles = new Set<string>()
    for (const svc of services) {
      if (svc && svc.isActive === false) continue
      if (!svc || !Array.isArray(svc.roles)) continue
      for (const role of svc.roles) {
        const r = String(role).trim()
        if (r) roles.add(r)
      }
    }

    return Array.from(roles)
  } catch {
    return []
  }
}

/**
 * GET /api/appointments/patient-request
 * List professionals that can receive booking requests (regardless of allowPatientBooking)
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    if (session.user.role !== 'PATIENT') {
      return NextResponse.json({ error: 'Apenas pacientes podem solicitar agendamentos' }, { status: 403 })
    }

    const allowedRoles = await getAllowedProfessionalRoles()
    const rolesFilterRaw = allowedRoles.length > 0
      ? allowedRoles
      : [
          'DOCTOR',
          'NURSE',
          'PHYSIOTHERAPIST',
          'PSYCHOLOGIST',
          'NUTRITIONIST',
          'DENTIST',
          'HEALTH_AGENT',
          'TECHNICIAN',
          'PHARMACIST',
          'SOCIAL_WORKER',
          'OTHER',
        ]

    const rolesFilter = rolesFilterRaw.filter((r): r is Role =>
      (Object.values(Role) as string[]).includes(r)
    )

    const professionals = await prisma.user.findMany({
      where: {
        role: { in: rolesFilter },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        role: true,
        speciality: true,
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ success: true, professionals, count: professionals.length })
  } catch (error) {
    logger.error('[Patient Request] Error fetching requestable professionals:', error)
    return NextResponse.json({ error: 'Erro ao buscar profissionais' }, { status: 500 })
  }
}

/**
 * POST /api/appointments/patient-request
 * Patient requests an appointment time (always requires approval)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    if (session.user.role !== 'PATIENT') {
      return NextResponse.json({ error: 'Apenas pacientes podem solicitar agendamentos' }, { status: 403 })
    }

    const body = (await request.json().catch(() => null)) as PatientRequestBody | null
    const parseResult = patientRequestSchema.safeParse(body)

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { professionalId, serviceId, serviceName, reason } = parseResult.data

    const patient = await prisma.patient.findUnique({
      where: { email: session.user.email || '' },
    })

    if (!patient) {
      return NextResponse.json(
        { error: 'Registro de paciente não encontrado. Contacte a clínica.' },
        { status: 404 }
      )
    }

    const professional = await prisma.user.findUnique({
      where: { id: professionalId },
      select: { id: true, name: true, role: true, speciality: true },
    })

    if (!professional) {
      return NextResponse.json({ error: 'Profissional não encontrado' }, { status: 404 })
    }

    const notesParts: string[] = []
    notesParts.push('Solicitação de agendamento (sem horário definido)')
    if (serviceName) notesParts.push(`Serviço: ${serviceName}`)
    if (serviceId) notesParts.push(`Serviço (id): ${serviceId}`)
    if (reason) notesParts.push(`Motivo: ${reason}`)

    const waitingList = await WaitingListService.addToWaitingList({
      patientId: patient.id,
      doctorId: professionalId,
      specialty: professional.speciality || undefined,
      notes: notesParts.join('\n'),
    })

    logger.info(`[Patient Request] Waiting list request created: ${waitingList.id} by patient ${patient.id}`)

    return NextResponse.json({
      success: true,
      message: 'Solicitação enviada. A clínica entrará em contato para confirmar o horário.',
      waitingList: {
        id: waitingList.id,
        status: waitingList.status,
        createdAt: waitingList.createdAt,
      },
    })
  } catch (error) {
    logger.error('[Patient Request] Error creating request:', error)
    return NextResponse.json({ error: 'Erro ao solicitar agendamento' }, { status: 500 })
  }
}
