import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { rateLimiters } from '@/lib/rate-limiter'

// Direct Prisma client to avoid bundling issues
const { PrismaClient } = require('@prisma/client')
const globalForPrisma = globalThis as unknown as { prisma: InstanceType<typeof PrismaClient> }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// GET - List appointments/consultations
export const GET = withAuth(async (req: NextRequest, { user }) => {
  const rl = rateLimiters.default(req)
  if (rl instanceof NextResponse) return rl

  try {
    const url = new URL(req.url)
    const date = url.searchParams.get('date')
    const doctorId = url.searchParams.get('doctorId')
    const patientId = url.searchParams.get('patientId')
    const status = url.searchParams.get('status')
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '50')

    const where: any = {}

    if (date) {
      const startDate = new Date(date)
      startDate.setHours(0, 0, 0, 0)
      const endDate = new Date(date)
      endDate.setHours(23, 59, 59, 999)
      
      where.scheduledAt = {
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
        orderBy: { scheduledAt: 'asc' },
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
    console.error('Error fetching appointments:', error)
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
    const body = await req.json()
    const { patientId, doctorId, scheduledAt, type, notes } = body

    if (!patientId || !doctorId || !scheduledAt) {
      return NextResponse.json(
        { error: 'Paciente, médico e horário são obrigatórios' },
        { status: 400 }
      )
    }

    // Verify patient exists
    const patient = await prisma.patient.findUnique({ where: { id: patientId } })
    if (!patient) {
      return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })
    }

    // Verify doctor exists
    const doctor = await prisma.user.findUnique({ where: { id: doctorId } })
    if (!doctor) {
      return NextResponse.json({ error: 'Médico não encontrado' }, { status: 404 })
    }

    const appointmentDate = new Date(scheduledAt)

    // Check for conflicting appointments (same doctor, same time)
    const conflict = await prisma.consultation.findFirst({
      where: {
        doctorId,
        scheduledAt: {
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
        scheduledAt: appointmentDate,
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

    return NextResponse.json(consultation, { status: 201 })
  } catch (error: any) {
    console.error('Error creating appointment:', error)
    return NextResponse.json(
      { error: 'Erro ao criar agendamento', details: error.message },
      { status: 500 }
    )
  }
})
