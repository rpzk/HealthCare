import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { prisma } from '@/lib/prisma'
import { startOfMonth, endOfMonth } from 'date-fns'
import { logger } from '@/lib/logger'
export const dynamic = 'force-dynamic'

export const GET = withAuth(async (req: NextRequest) => {
  try {
    const now = new Date()
    const monthStart = startOfMonth(now)
    const monthEnd = endOfMonth(now)

    // Query real data from database
    const [
      totalPatients,
      newPatientsThisMonth,
      totalConsultations,
      consultationsThisMonth,
      totalExams,
      examsThisMonth,
      totalRecords
    ] = await Promise.all([
      prisma.patient.count(),
      prisma.patient.count({
        where: { createdAt: { gte: monthStart, lte: monthEnd } }
      }),
      prisma.consultation.count(),
      prisma.consultation.count({
        where: { scheduledDate: { gte: monthStart, lte: monthEnd } }
      }),
      prisma.examRequest.count(),
      prisma.examRequest.count({
        where: { createdAt: { gte: monthStart, lte: monthEnd } }
      }),
      prisma.medicalRecord.count()
    ])

    return NextResponse.json({
      totalPatients,
      newPatientsThisMonth,
      totalConsultations,
      consultationsThisMonth,
      totalExams,
      examsThisMonth,
      totalRecords,
      recordsThisMonth: 0 // TODO: Add logic to count records this month if needed
    })
  } catch (error) {
    logger.error('Error fetching stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    )
  }
}, { requireRole: ['ADMIN'] })
