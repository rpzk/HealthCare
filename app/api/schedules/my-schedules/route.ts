import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

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

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is a professional
    if (!PROFESSIONAL_ROLES.includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Only professionals can access this endpoint' },
        { status: 403 }
      )
    }

    // Get user with schedules
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        doctorSchedules: {
          orderBy: { dayOfWeek: 'asc' },
        },
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const schedules = user.doctorSchedules.map((schedule) => ({
      dayOfWeek: schedule.dayOfWeek,
      allowPatientBooking: schedule.allowPatientBooking,
      maxBookingDaysAhead: schedule.maxBookingDaysAhead,
      minBookingHoursAhead: schedule.minBookingHoursAhead,
      autoConfirmBooking: schedule.autoConfirmBooking,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
    }))

    return NextResponse.json({
      success: true,
      schedules,
    })
  } catch (error) {
    logger.error('Error fetching schedules:', error)
    return NextResponse.json(
      { error: 'Failed to fetch schedules' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is a professional
    if (!PROFESSIONAL_ROLES.includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Only professionals can access this endpoint' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { schedules } = body

    if (!Array.isArray(schedules)) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Update each schedule
    const updatedSchedules = await Promise.all(
      schedules.map((schedule) =>
        prisma.doctorSchedule.updateMany({
          where: {
            doctorId: user.id,
            dayOfWeek: schedule.dayOfWeek,
          },
          data: {
            allowPatientBooking: schedule.allowPatientBooking,
            maxBookingDaysAhead: schedule.maxBookingDaysAhead,
            minBookingHoursAhead: schedule.minBookingHoursAhead,
            autoConfirmBooking: schedule.autoConfirmBooking,
          },
        })
      )
    )

    return NextResponse.json({
      success: true,
      message: 'Schedules updated successfully',
      updated: updatedSchedules.reduce((acc, result) => acc + result.count, 0),
    })
  } catch (error) {
    logger.error('Error updating schedules:', error)
    return NextResponse.json(
      { error: 'Failed to update schedules' },
      { status: 500 }
    )
  }
}
