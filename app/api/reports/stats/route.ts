import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { prisma } from '@/lib/prisma'
import { endOfMonth, startOfMonth, subDays, subYears } from 'date-fns'
import { logger } from '@/lib/logger'
export const dynamic = 'force-dynamic'

type Range = '7days' | '30days' | '90days' | '1year' | 'month'

function getPeriodFromRange(range: Range, now: Date) {
  if (range === 'month') {
    return { start: startOfMonth(now), end: endOfMonth(now) }
  }
  if (range === '7days') return { start: subDays(now, 7), end: now }
  if (range === '30days') return { start: subDays(now, 30), end: now }
  if (range === '90days') return { start: subDays(now, 90), end: now }
  return { start: subYears(now, 1), end: now }
}

export const GET = withAuth(async (req: NextRequest) => {
  try {
    const now = new Date()
    const monthStart = startOfMonth(now)
    const monthEnd = endOfMonth(now)

    const { searchParams } = new URL(req.url)
    const range = (searchParams.get('range') as Range | null) ?? 'month'
    const period = getPeriodFromRange(
      (['7days', '30days', '90days', '1year', 'month'].includes(range) ? range : 'month') as Range,
      now
    )

    // Query real data from database
    const [
      totalPatients,
      newPatientsThisMonth,
      newPatientsInPeriod,
      totalConsultations,
      consultationsThisMonth,
      consultationsInPeriod,
      totalExams,
      examsThisMonth,
      examsInPeriod,
      totalRecords,
      recordsThisMonth,
      recordsInPeriod,
    ] = await Promise.all([
      prisma.patient.count(),
      prisma.patient.count({
        where: { createdAt: { gte: monthStart, lte: monthEnd } }
      }),
      prisma.patient.count({
        where: { createdAt: { gte: period.start, lte: period.end } },
      }),
      prisma.consultation.count(),
      prisma.consultation.count({
        where: { scheduledDate: { gte: monthStart, lte: monthEnd } }
      }),
      prisma.consultation.count({
        where: { scheduledDate: { gte: period.start, lte: period.end } },
      }),
      prisma.examRequest.count(),
      prisma.examRequest.count({
        where: { createdAt: { gte: monthStart, lte: monthEnd } }
      }),
      prisma.examRequest.count({
        where: { createdAt: { gte: period.start, lte: period.end } },
      }),
      prisma.medicalRecord.count(),
      prisma.medicalRecord.count({
        where: { createdAt: { gte: monthStart, lte: monthEnd } },
      }),
      prisma.medicalRecord.count({
        where: { createdAt: { gte: period.start, lte: period.end } },
      }),
    ])

    return NextResponse.json({
      totalPatients,
      newPatientsThisMonth,
      newPatientsInPeriod,
      totalConsultations,
      consultationsThisMonth,
      consultationsInPeriod,
      totalExams,
      examsThisMonth,
      examsInPeriod,
      totalRecords,
      recordsThisMonth,
      recordsInPeriod,
      periodStart: period.start.toISOString(),
      periodEnd: period.end.toISOString(),
    })
  } catch (error) {
    logger.error('Error fetching stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    )
  }
}, { requireRole: ['ADMIN'] })
