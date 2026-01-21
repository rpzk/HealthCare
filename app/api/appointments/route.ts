import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { rateLimiters } from '@/lib/rate-limiter'
import { appointmentQuerySchema, createAppointmentSchema, safeParseQueryParams } from '@/lib/validation-schemas-api'
import { z } from 'zod'
import { sendAppointmentConfirmationEmail } from '@/lib/email-service'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'

// GET - List appointments/consultations
export const GET = withAuth(async (req: NextRequest, { user }) => {
  const rl = rateLimiters.default(req)
  if (rl instanceof NextResponse) return rl

  try {
    const url = new URL(req.url)
    
    // Validate query parameters
    const queryResult = safeParseQueryParams(url.searchParams, appointmentQuerySchema)
    if (!queryResult.success) {
      return NextResponse.json(
        { error: 'Parâmetros inválidos', details: queryResult.error.flatten().fieldErrors },
        { status: 400 }
      )
    }
    
    const { date, doctorId, patientId, status, page, limit } = queryResult.data

    const where: any = {}

    if (date) {
      const startDate = new Date(date)
      startDate.setHours(0, 0, 0, 0)
      const endDate = new Date(date)
      endDate.setHours(23, 59, 59, 999)
      
      where.scheduledDate = {
        gte: startDate,
        lte: endDate
      }
    }

    if (doctorId) {
      where.doctorId = doctorId
    }

    if (patientId) {
      where.patientId = patientId
    }

    if (status) {
      where.status = status
    }

    // For non-admin/manager users, filter by their appointments
    if (!['ADMIN', 'MANAGER', 'RECEPTIONIST'].includes(user.role)) {
      if (user.role === 'DOCTOR') {
        where.doctorId = user.id
      }
    }

    const [consultations, total] = await Promise.all([
      prisma.consultation.findMany({
        where,
        include: {
          patient: {
            select: {
              id: true,
              name: true,
              cpf: true,
              phone: true,
              email: true
            }
          },
          doctor: {
            select: {
              id: true,
              name: true,
              speciality: true
            }
          }
        },
        orderBy: { scheduledDate: 'asc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.consultation.count({ where })
    ])

    return NextResponse.json({
      data: consultations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error: any) {
    logger.error('Error fetching appointments:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar agendamentos', details: error.message },
      { status: 500 }
    )
  }
})

// POST - Create new appointment
export const POST = withAuth(async (req: NextRequest, { user }) => {
  const rl = rateLimiters.default(req)
  if (rl instanceof NextResponse) return rl

  // Only admin, manager, receptionist, doctor can create appointments
  if (!['ADMIN', 'MANAGER', 'RECEPTIONIST', 'DOCTOR'].includes(user.role)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  try {
    // Validate request body
    const body = await req.json()
    const parseResult = createAppointmentSchema.safeParse(body)
    
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      )
    }
    
    const { patientId, doctorId, scheduledDate, type, notes } = parseResult.data

    // Verify patient exists
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true, name: true, email: true },
    })
    if (!patient) {
      return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })
    }

    // Verify doctor exists
    const doctor = await prisma.user.findUnique({
      where: { id: doctorId },
      select: { id: true, name: true },
    })
    if (!doctor) {
      return NextResponse.json({ error: 'Médico não encontrado' }, { status: 404 })
    }

    const appointmentDate = new Date(scheduledDate)

    // Check for conflicting appointments (same doctor, same time)
    const conflict = await prisma.consultation.findFirst({
      where: {
        doctorId,
        scheduledDate: {
          gte: new Date(appointmentDate.getTime() - 30 * 60 * 1000), // 30 min before
          lte: new Date(appointmentDate.getTime() + 30 * 60 * 1000)  // 30 min after
        },
        status: { notIn: ['CANCELLED', 'NO_SHOW'] }
      }
    })

    if (conflict) {
      return NextResponse.json(
        { error: 'Já existe um agendamento neste horário para este profissional' },
        { status: 400 }
      )
    }

    const consultation = await prisma.consultation.create({
      data: {
        patientId,
        doctorId,
        scheduledDate: appointmentDate,
        type: type || 'CONSULTATION',
        notes,
        status: 'SCHEDULED'
      },
      include: {
        patient: {
          select: { id: true, name: true, cpf: true }
        },
        doctor: {
          select: { id: true, name: true, speciality: true }
        }
      }
    })

    // Notify patient (email) if available; never fail the appointment if email fails.
    if (patient.email) {
      try {
        const dateStr = appointmentDate.toLocaleDateString('pt-BR')
        const timeStr = appointmentDate.toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
        })

        await sendAppointmentConfirmationEmail({
          patientEmail: patient.email,
          patientName: patient.name,
          doctorName: doctor.name,
          date: dateStr,
          time: timeStr,
          reason: notes || 'Consulta',
          status: 'SCHEDULED',
        })
      } catch (emailError) {
        logger.error('Error sending appointment confirmation email:', emailError)
      }
    }

    return NextResponse.json(consultation, { status: 201 })
  } catch (error: any) {
    logger.error('Error creating appointment:', error)
    return NextResponse.json(
      { error: 'Erro ao criar agendamento', details: error.message },
      { status: 500 }
    )
  }
})
