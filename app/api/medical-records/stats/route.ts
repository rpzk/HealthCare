import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { decrypt } from '@/lib/crypto'

/**
 * GET /api/medical-records/stats
 * Retorna estatísticas agregadas de prontuários médicos
 */
export const GET = withAuth(async (request: NextRequest, { user }) => {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '30' // dias
    const periodDays = Math.min(Math.max(parseInt(period), 1), 365)

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - periodDays)

    // Build WHERE clause based on user role
    const baseWhere: any = {
      deletedAt: null,
      createdAt: { gte: startDate }
    }

    if (user.role === 'PATIENT') {
      const lookup = await prisma.user.findUnique({
        where: { id: user.id },
        select: { patientId: true, email: true },
      })

      const patient = lookup?.patientId
        ? await prisma.patient.findUnique({ where: { id: lookup.patientId }, select: { id: true } })
        : lookup?.email
          ? await prisma.patient.findFirst({
              where: { email: { equals: lookup.email, mode: 'insensitive' } },
              select: { id: true },
            })
          : null

      if (!patient) {
        return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })
      }
      baseWhere.patientId = patient.id
    } else if (user.role === 'DOCTOR') {
      baseWhere.doctorId = user.id
    }
    // ADMIN sees all records

    // 1. Total records
    const totalRecords = await prisma.medicalRecord.count({ where: baseWhere })

    // 1b. Version stats (real data; null when there are no records)
    const versionStats = await prisma.medicalRecord.aggregate({
      where: baseWhere,
      _avg: { version: true },
      _max: { version: true }
    })

    const averageVersion =
      typeof versionStats._avg.version === 'number'
        ? Math.round(versionStats._avg.version * 100) / 100
        : null
    const maxVersion = typeof versionStats._max.version === 'number' ? versionStats._max.version : null

    // 2. Records by type
    const recordsByType = await prisma.medicalRecord.groupBy({
      by: ['recordType'],
      where: baseWhere,
      _count: { id: true }
    })

    // 3. Records by severity (using severity field from schema)
    const recordsBySeverity = await prisma.medicalRecord.groupBy({
      by: ['severity'],
      where: baseWhere,
      _count: { id: true }
    })

    // 4. Records by priority (priority is a string in schema)
    const recordsByPriority = await prisma.medicalRecord.groupBy({
      by: ['priority'],
      where: baseWhere,
      _count: { id: true }
    })

    // 5. Recent activity (records per day for last 30 days)
    const last30Days = new Date()
    last30Days.setDate(last30Days.getDate() - 30)

    const recentRecords = await prisma.medicalRecord.findMany({
      where: {
        ...baseWhere,
        createdAt: { gte: last30Days }
      },
      select: {
        createdAt: true,
        recordType: true,
        severity: true,
        priority: true
      },
      orderBy: { createdAt: 'asc' }
    })

    // Group by day
    const activityByDay = recentRecords.reduce((acc, record) => {
      const day = record.createdAt.toISOString().split('T')[0]
      if (!acc[day]) {
        acc[day] = { date: day, count: 0, critical: 0, high: 0 }
      }
      acc[day].count++
      if (record.priority === 'CRITICAL') acc[day].critical++
      if (record.priority === 'HIGH') acc[day].high++
      return acc
    }, {} as Record<string, { date: string; count: number; critical: number; high: number }>)

    const timeline = Object.values(activityByDay).sort((a, b) => 
      a.date.localeCompare(b.date)
    )

    // 6. Top patients (for doctors/admins)
    let topPatients: any[] = []
    if (user.role !== 'PATIENT') {
      const patientStats = await prisma.medicalRecord.groupBy({
        by: ['patientId'],
        where: baseWhere,
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 5
      })

      const patientIds = patientStats.map(p => p.patientId)
      const patients = await prisma.patient.findMany({
        where: { id: { in: patientIds } },
        select: { id: true, name: true, cpf: true }
      })

      topPatients = patientStats.map(stat => {
        const patient = patients.find(p => p.id === stat.patientId)
        const cpfDigits = decrypt(patient?.cpf || null)?.replace(/\D/g, '') || null
        const maskedCpf = cpfDigits ? `***${cpfDigits.slice(-4)}` : null
        return {
          patientId: stat.patientId,
          name: patient?.name ?? null,
          cpf: maskedCpf,
          recordCount: stat._count.id
        }
      })
    }

    // 8. Recent records (last 10)
    const recentRecordsList = await prisma.medicalRecord.findMany({
      where: baseWhere,
      include: {
        patient: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    })

    // 9. Count records by severity
    const criticalCount = await prisma.medicalRecord.count({
      where: { ...baseWhere, priority: 'CRITICAL' }
    })

    const highCount = await prisma.medicalRecord.count({
      where: { ...baseWhere, priority: 'HIGH' }
    })

    return NextResponse.json({
      period: {
        days: periodDays,
        startDate: startDate.toISOString(),
        endDate: new Date().toISOString()
      },
      summary: {
        total: totalRecords,
        critical: criticalCount,
        high: highCount,
        averageVersion,
        maxVersion
      },
      distribution: {
        byType: recordsByType.map(r => ({
          type: r.recordType,
          count: r._count.id
        })),
        byPriority: recordsByPriority.map(r => ({
          priority: r.priority,
          count: r._count.id
        })),
        bySeverity: recordsBySeverity.map(r => ({
          severity: r.severity,
          count: r._count.id
        }))
      },
      timeline,
      topPatients: user.role !== 'PATIENT' ? topPatients : undefined,
      recentRecords: recentRecordsList.map(r => ({
        id: r.id,
        title: r.title,
        type: r.recordType,
        priority: r.priority,
        severity: r.severity,
        createdAt: r.createdAt.toISOString(),
        patientName: user.role !== 'PATIENT' ? r.patient?.name : '***'
      }))
    })
  } catch (error) {
    logger.error('Error fetching medical records stats:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar estatísticas' },
      { status: 500 }
    )
  }
})
