import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { prisma } from '@/lib/prisma'

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
      const patient = await prisma.patient.findFirst({
        where: { userId: user.id },
        select: { id: true }
      })
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
        severity: true
      },
      orderBy: { createdAt: 'asc' }
    })

    // Group by day (using severity as proxy for priority temporarily)
    const activityByDay = recentRecords.reduce((acc, record) => {
      const day = record.createdAt.toISOString().split('T')[0]
      if (!acc[day]) {
        acc[day] = { date: day, count: 0, critical: 0, high: 0 }
      }
      acc[day].count++
      if (record.severity === 'HIGH') acc[day].high++
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
        return {
          patientId: stat.patientId,
          name: patient?.name || 'Desconhecido',
          cpf: patient?.cpf ? `***${patient.cpf.slice(-4)}` : 'N/A',
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
      where: { ...baseWhere, severity: 'HIGH' }
    })

    const highCount = await prisma.medicalRecord.count({
      where: { ...baseWhere, severity: 'MEDIUM' }
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
        averageVersion: 1, // Placeholder
        maxVersion: 1 // Placeholder
      },
      distribution: {
        byType: recordsByType.map(r => ({
          type: r.recordType,
          count: r._count.id
        })),
        byPriority: [], // Priority is string, not enum - skip for now
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
        priority: r.severity, // Using severity as priority proxy
        severity: r.severity,
        createdAt: r.createdAt.toISOString(),
        patientName: user.role !== 'PATIENT' ? r.patient?.name : '***'
      }))
    })
  } catch (error) {
    console.error('Error fetching medical records stats:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar estatísticas' },
      { status: 500 }
    )
  }
})
