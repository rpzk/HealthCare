import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { rateLimiters } from '@/lib/rate-limiter'

// Direct Prisma client to avoid bundling issues
const { PrismaClient } = require('@prisma/client')
const globalForPrisma = globalThis as unknown as { prisma: InstanceType<typeof PrismaClient> }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

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
          scheduledAt: {
            gte: today,
            lt: tomorrow
          }
        }
      }),
      
      // Patients waiting (checked-in or waiting status)
      prisma.consultation.count({
        where: {
          status: { in: ['WAITING'] },
          scheduledAt: {
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
          scheduledAt: {
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
  } catch (error: any) {
    console.error('Error fetching reception stats:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar estatísticas', details: error.message },
      { status: 500 }
    )
  }
})
