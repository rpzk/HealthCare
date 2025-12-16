/**
 * POST /api/medications/tracking - Registrar tomada de medicamento
 * GET /api/medications/tracking - Listar tomadas do paciente
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const trackMedicationSchema = z.object({
  prescriptionItemId: z.string().min(1),
  takenAt: z.string().datetime(),
  dosage: z.string(),
  notes: z.string().optional(),
  missed: z.boolean().default(false),
})

/**
 * Registrar que um medicamento foi tomado
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const data = trackMedicationSchema.parse(body)

    // Verificar que o item de prescrição existe e pertence ao paciente
    const prescItem = await prisma.prescriptionItem.findUnique({
      where: { id: data.prescriptionItemId },
      include: {
        prescription: {
          select: { patientId: true },
        },
      },
    })

    if (!prescItem) {
      return NextResponse.json({ error: 'Prescription item not found' }, { status: 404 })
    }

    // Validar acesso - paciente só pode registrar seus medicamentos
    if (session.user.role === 'PATIENT' && prescItem.prescription.patientId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Criar registro de tomada
    const tracking = await prisma.medicationTaking.create({
      data: {
        prescriptionItemId: data.prescriptionItemId,
        takenAt: new Date(data.takenAt),
        dosage: data.dosage,
        notes: data.notes,
        missed: data.missed,
        recordedBy: session.user.id!,
      },
      include: {
        prescriptionItem: {
          include: {
            medication: true,
            prescription: {
              select: { patientId: true },
            },
          },
        },
      },
    })

    return NextResponse.json(tracking, { status: 201 })
  } catch (error) {
    console.error('[Medication Tracking POST]', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to record medication' },
      { status: 500 }
    )
  }
}

/**
 * Listar tomadas de medicamentos
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const prescriptionId = searchParams.get('prescriptionId')
    const patientId = searchParams.get('patientId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const skip = (page - 1) * limit

    // Construir filtros
    let where: any = {}

    if (prescriptionId) {
      // Validar acesso à prescrição
      const presc = await prisma.prescription.findUnique({
        where: { id: prescriptionId },
        select: { patientId: true },
      })
      if (!presc) {
        return NextResponse.json({ error: 'Prescription not found' }, { status: 404 })
      }
      if (session.user.role === 'PATIENT' && presc.patientId !== session.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      where.prescriptionItem = {
        prescription: { id: prescriptionId },
      }
    }

    if (patientId) {
      // Validar acesso
      if (session.user.role === 'PATIENT' && patientId !== session.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      where.prescriptionItem = {
        prescription: { patientId },
      }
    }

    // Filtros de data
    if (startDate || endDate) {
      where.takenAt = {}
      if (startDate) {
        where.takenAt.gte = new Date(startDate)
      }
      if (endDate) {
        where.takenAt.lte = new Date(endDate)
      }
    }

    const [takings, total] = await Promise.all([
      prisma.medicationTaking.findMany({
        where,
        include: {
          prescriptionItem: {
            include: {
              medication: true,
              prescription: { select: { id: true, patientId: true } },
            },
          },
        },
        skip,
        take: limit,
        orderBy: { takenAt: 'desc' },
      }),
      prisma.medicationTaking.count({ where }),
    ])

    return NextResponse.json(
      {
        data: takings,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[Medication Tracking GET]', error)
    return NextResponse.json(
      { error: 'Failed to fetch medication tracking' },
      { status: 500 }
    )
  }
}
