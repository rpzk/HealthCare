import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { rateLimiters } from '@/lib/rate-limiter'
import { prisma } from '@/lib/prisma'
export const dynamic = 'force-dynamic'

// GET - Reception dashboard stats
export const GET = withAuth(async (req: NextRequest, { user }) => {
  const rl = rateLimiters.default(req)
  if (rl instanceof NextResponse) return rl

  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const [
      todayAppointments,
      waitingPatients,
      inProgressConsultations,
      completedToday
    ] = await Promise.all([
      // Total appointments today
      prisma.consultation.count({
        where: {
          scheduledDate: {
            gte: today,
            lt: tomorrow
          }
        }
      }),
      
      // Patients waiting (checked-in or waiting status)
      prisma.consultation.count({
        where: {
          status: { in: ['SCHEDULED'] },
          scheduledDate: {
            gte: today,
            lt: tomorrow
          }
        }
      }),
      
      // Consultations in progress
      prisma.consultation.count({
        where: {
          status: 'IN_PROGRESS'
        }
      }),
      
      // Completed today
      prisma.consultation.count({
        where: {
          status: 'COMPLETED',
          scheduledDate: {
            gte: today,
            lt: tomorrow
          }
        }
      })
    ])

    return NextResponse.json({
      todayAppointments,
      waitingPatients,
      inProgressConsultations,
      completedToday
    })
  } catch (error: unknown) {
    // Narrow unknown error to preserve typing while providing useful logs
    if (error instanceof Error) {
      console.error('Error fetching reception stats:', error.message)
      return NextResponse.json(
        { error: 'Erro ao buscar estatísticas', details: error.message },
        { status: 500 }
      )
    }

    console.error('Error fetching reception stats:', String(error))
    return NextResponse.json(
      { error: 'Erro ao buscar estatísticas' },
      { status: 500 }
    )
  }
})
