import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Todos os roles que são considerados profissionais de saúde
const PROFESSIONAL_ROLES = [
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
  'RECEPTIONIST',
  'ADMIN'
]

const exceptionSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  blockType: z.enum(['UNAVAILABLE', 'ON_CALL', 'VACATION', 'SICK_LEAVE', 'MAINTENANCE', 'TRAINING', 'MEETING']),
  reason: z.string().optional(),
})

type ExceptionInput = z.infer<typeof exceptionSchema>

// GET - List exceptions for professional
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!PROFESSIONAL_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Only professionals can access this' }, { status: 403 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const exceptions = await prisma.scheduleException.findMany({
      where: { doctorId: user.id },
      orderBy: { date: 'desc' },
      select: {
        id: true,
        date: true,
        blockType: true,
        reason: true,
        createdAt: true,
      },
    })

    return NextResponse.json({
      success: true,
      exceptions,
      count: exceptions.length,
    })
  } catch (error) {
    console.error('Error fetching exceptions:', error)
    return NextResponse.json({ error: 'Failed to fetch exceptions' }, { status: 500 })
  }
}

// POST - Create exceptions (supports range)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!PROFESSIONAL_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Only professionals can access this' }, { status: 403 })
    }

    const body = await request.json()
    const { startDate, endDate, blockType, reason } = exceptionSchema.parse(body)

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Create exceptions for date range
    const start = new Date(startDate)
    const end = new Date(endDate)
    const exceptions = []

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateOnly = new Date(d)
      dateOnly.setHours(0, 0, 0, 0)

      const exception = await prisma.scheduleException.create({
        data: {
          doctorId: user.id,
          date: dateOnly,
          blockType,
          reason: reason || `${blockType} - ${blockType.toLowerCase()}`,
        },
      })
      exceptions.push(exception)
    }

    return NextResponse.json({
      success: true,
      message: `${exceptions.length} day(s) blocked successfully`,
      exceptions,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Error creating exceptions:', error)
    return NextResponse.json({ error: 'Failed to create exceptions' }, { status: 500 })
  }
}

// DELETE - Remove exception
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!PROFESSIONAL_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Only professionals can access this' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const exceptionId = searchParams.get('id')

    if (!exceptionId) {
      return NextResponse.json({ error: 'Exception ID required' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Verify ownership
    const exception = await prisma.scheduleException.findUnique({
      where: { id: exceptionId },
    })

    if (!exception || exception.doctorId !== user.id) {
      return NextResponse.json({ error: 'Not found or not authorized' }, { status: 404 })
    }

    await prisma.scheduleException.delete({
      where: { id: exceptionId },
    })

    return NextResponse.json({
      success: true,
      message: 'Exception removed',
    })
  } catch (error) {
    console.error('Error deleting exception:', error)
    return NextResponse.json({ error: 'Failed to delete exception' }, { status: 500 })
  }
}
