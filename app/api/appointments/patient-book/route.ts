import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/auth'
import { prisma } from '@/lib/prisma'
import { sendAppointmentConfirmationEmail } from '@/lib/email-service'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import { SystemSettingsService } from '@/lib/system-settings-service'
import { Role } from '@prisma/client'

const DIRECT_BOOKING_KEY = 'PATIENT_DIRECT_BOOKING_ENABLED'
const APPOINTMENT_TYPES_KEY = 'appointment_types'

const parseBoolean = (value: string | undefined, defaultValue: boolean) => {
  if (value == null) return defaultValue
  const normalized = String(value).trim().toLowerCase()
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') return true
  if (normalized === 'false' || normalized === '0' || normalized === 'no') return false
  return defaultValue
}

async function getAllowedProfessionalRoles(): Promise<string[]> {
  const raw = await SystemSettingsService.get(APPOINTMENT_TYPES_KEY)
  if (!raw) {
    return [
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
  }

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

    const list = Array.from(roles)
    return list.length > 0 ? list : []
  } catch {
    return []
  }
}

const patientBookingSchema = z.object({
  doctorId: z.string().min(1, 'ID do profissional é obrigatório'),
  date: z.string().regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/, 'Data inválida (YYYY-MM-DD)'),
  timeSlot: z.string().regex(/^\d{2}:\d{2}$/, 'Formato de horário inválido (HH:mm)'),
  reason: z.string().optional(),
  notes: z.string().optional(),
})

type PatientBookingRequest = z.infer<typeof patientBookingSchema>

/**
 * GET /api/appointments/patient-book
 * Get available doctors and their booking configuration for patient self-booking
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Only patients can use this endpoint
    if (session.user.role !== 'PATIENT') {
      return NextResponse.json(
        { error: 'Apenas pacientes podem agendar consultas' },
        { status: 403 }
      )
    }

    const directEnabledRaw = await SystemSettingsService.get(DIRECT_BOOKING_KEY, 'false')
    const directBookingEnabled = parseBoolean(directEnabledRaw, false)
    if (!directBookingEnabled) {
      return NextResponse.json({
        success: true,
        directBookingEnabled: false,
        professionals: [],
        count: 0,
      })
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

    // Get doctors/professionals with patient booking enabled
    const professionals = await prisma.user.findMany({
      where: {
        role: {
          in: rolesFilter,
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        speciality: true,
        doctorSchedules: {
          where: {
            allowPatientBooking: true,
          },
          select: {
            dayOfWeek: true,
            startTime: true,
            endTime: true,
            slotDuration: true,
            maxBookingDaysAhead: true,
            minBookingHoursAhead: true,
            autoConfirmBooking: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    })

    // Filter professionals with at least one schedule allowing patient booking
    const availableProfessionals = professionals.filter(
      (prof) => prof.doctorSchedules.length > 0
    )

    return NextResponse.json({
      success: true,
      directBookingEnabled: true,
      professionals: availableProfessionals,
      count: availableProfessionals.length,
    })
  } catch (error) {
    logger.error('[Patient Booking] Error fetching available professionals:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar profissionais disponíveis' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/appointments/patient-book
 * Patient self-booking of consultation
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Only patients can use this endpoint
    if (session.user.role !== 'PATIENT') {
      return NextResponse.json(
        { error: 'Apenas pacientes podem agendar consultas' },
        { status: 403 }
      )
    }

    const directEnabledRaw = await SystemSettingsService.get(DIRECT_BOOKING_KEY, 'false')
    const directBookingEnabled = parseBoolean(directEnabledRaw, false)
    if (!directBookingEnabled) {
      return NextResponse.json(
        { error: 'Auto-agendamento direto está desabilitado pela clínica. Envie uma solicitação de agendamento.' },
        { status: 403 }
      )
    }

    // Validate request body
    const body = await request.json()
    const parseResult = patientBookingSchema.safeParse(body)

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { doctorId, date, timeSlot, reason, notes } = parseResult.data

    // Get patient record
    const patient = await prisma.patient.findUnique({
      where: { email: session.user.email || '' },
    })

    if (!patient) {
      return NextResponse.json(
        { error: 'Registro de paciente não encontrado. Contacte a clínica.' },
        { status: 404 }
      )
    }

    // Verify doctor exists and has patient booking enabled
    const doctor = await prisma.user.findUnique({
      where: { id: doctorId },
      include: {
        doctorSchedules: true,
      },
    })

    if (!doctor) {
      return NextResponse.json(
        { error: 'Profissional não encontrado' },
        { status: 404 }
      )
    }

    const scheduledDateTime = new Date(`${date}T${timeSlot}:00`)
    const now = new Date()
    const dayOfWeek = scheduledDateTime.getDay()

    // Check if doctor's schedule for this day allows patient booking
    const schedule = doctor.doctorSchedules.find((s) => s.dayOfWeek === dayOfWeek)

    if (!schedule) {
      return NextResponse.json(
        { error: 'Profissional não trabalha neste dia da semana' },
        { status: 400 }
      )
    }

    if (!schedule.allowPatientBooking) {
      return NextResponse.json(
        { error: 'Este profissional não permite auto-agendamento de pacientes' },
        { status: 403 }
      )
    }

    // Validate booking time constraints
    const hoursAhead = (scheduledDateTime.getTime() - now.getTime()) / (1000 * 60 * 60)
    const daysAhead = hoursAhead / 24

    if (hoursAhead < schedule.minBookingHoursAhead) {
      return NextResponse.json(
        {
          error: `Agendamento requer mínimo de ${schedule.minBookingHoursAhead} horas de antecedência`,
        },
        { status: 400 }
      )
    }

    if (daysAhead > schedule.maxBookingDaysAhead) {
      return NextResponse.json(
        {
          error: `Agendamento máximo de ${schedule.maxBookingDaysAhead} dias de antecedência`,
        },
        { status: 400 }
      )
    }

    // Check for scheduling conflicts
    const conflict = await prisma.consultation.findFirst({
      where: {
        doctorId,
        scheduledDate: {
          gte: new Date(scheduledDateTime.getTime() - schedule.slotDuration * 60 * 1000),
          lt: new Date(scheduledDateTime.getTime() + schedule.slotDuration * 60 * 1000),
        },
      },
    })

    if (conflict) {
      return NextResponse.json(
        { error: 'Horário já ocupado. Escolha outro.' },
        { status: 409 }
      )
    }

    // Check for schedule exceptions (on-call, vacation, etc.)
    const exception = await prisma.scheduleException.findFirst({
      where: {
        doctorId,
        date: {
          gte: new Date(scheduledDateTime.getFullYear(), scheduledDateTime.getMonth(), scheduledDateTime.getDate()),
          lt: new Date(scheduledDateTime.getFullYear(), scheduledDateTime.getMonth(), scheduledDateTime.getDate() + 1),
        },
      },
    })

    if (exception) {
      return NextResponse.json(
        { error: `Profissional indisponível neste dia (${exception.blockType})` },
        { status: 400 }
      )
    }

    // Create consultation with appropriate status
    const consultation = await prisma.consultation.create({
      data: {
        scheduledDate: scheduledDateTime,
        type: 'ROUTINE',
        status: schedule.autoConfirmBooking ? 'IN_PROGRESS' : 'SCHEDULED',
        patientId: patient.id,
        doctorId,
        chiefComplaint: reason,
        notes: `Auto-agendamento do paciente. ${notes || ''}`,
      },
      include: {
        patient: {
          select: { id: true, name: true, email: true, phone: true },
        },
        doctor: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    // Send confirmation notification
    if (consultation.patient?.email) {
      try {
        const dateStr = consultation.scheduledDate.toLocaleDateString('pt-BR')
        const timeStr = consultation.scheduledDate.toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
        })

        await sendAppointmentConfirmationEmail({
          patientEmail: consultation.patient.email,
          patientName: consultation.patient.name,
          doctorName: consultation.doctor.name,
          date: dateStr,
          time: timeStr,
          reason: reason || 'Consulta',
          status: consultation.status === 'IN_PROGRESS' ? 'CONFIRMED' : 'SCHEDULED',
        })
      } catch (emailError) {
        logger.error('[Patient Booking] Error sending confirmation email:', emailError)
      }
    }

    logger.info(
      `[Patient Booking] New consultation scheduled: ${consultation.id} by patient ${patient.id}`
    )

    return NextResponse.json({
      success: true,
      message: schedule.autoConfirmBooking
        ? 'Consulta agendada e confirmada!'
        : 'Consulta agendada! Aguardando confirmação do profissional.',
      consultation: {
        id: consultation.id,
        scheduledDate: consultation.scheduledDate,
        status: consultation.status,
        doctorName: consultation.doctor.name,
        notes: `Auto-agendamento - ${reason || 'Consulta geral'}`,
      },
    })
  } catch (error) {
    logger.error('[Patient Booking] Error creating appointment:', error)
    return NextResponse.json(
      { error: 'Erro ao agendar consulta' },
      { status: 500 }
    )
  }
}
