import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Prisma, ReadingType } from '@prisma/client'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

// GET - Dashboard de vitais com estatísticas e tendências
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const patientId = searchParams.get('patientId')
    const period = parseInt(searchParams.get('period') || '30') // dias

    if (!patientId) {
      return NextResponse.json(
        { error: 'ID do paciente é obrigatório' },
        { status: 400 }
      )
    }

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - period)

    // Buscar todas as leituras do período
    const readings = await prisma.deviceReading.findMany({
      where: {
        patientId,
        measuredAt: { gte: startDate }
      },
      orderBy: { measuredAt: 'asc' }
    })

    // Agrupar por tipo
    const byType: Record<string, typeof readings> = {}
    readings.forEach(r => {
      if (!byType[r.readingType]) byType[r.readingType] = []
      byType[r.readingType].push(r)
    })

    // Calcular estatísticas por tipo
    const statistics: Record<string, {
      count: number
      min: number
      max: number
      avg: number
      latest: number
      latestAt: Date
      trend: 'up' | 'down' | 'stable'
      abnormalCount: number
    }> = {}

    Object.entries(byType).forEach(([type, typeReadings]) => {
      const values = typeReadings.map(r => r.primaryValue)
      const latest = typeReadings[typeReadings.length - 1]
      
      // Calcular tendência (comparar última semana com semana anterior)
      const oneWeekAgo = new Date()
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
      const twoWeeksAgo = new Date()
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
      
      const lastWeek = typeReadings.filter(r => r.measuredAt >= oneWeekAgo)
      const prevWeek = typeReadings.filter(r => r.measuredAt >= twoWeeksAgo && r.measuredAt < oneWeekAgo)
      
      let trend: 'up' | 'down' | 'stable' = 'stable'
      if (lastWeek.length > 0 && prevWeek.length > 0) {
        const lastAvg = lastWeek.reduce((s, r) => s + r.primaryValue, 0) / lastWeek.length
        const prevAvg = prevWeek.reduce((s, r) => s + r.primaryValue, 0) / prevWeek.length
        const diff = ((lastAvg - prevAvg) / prevAvg) * 100
        if (diff > 5) trend = 'up'
        else if (diff < -5) trend = 'down'
      }

      statistics[type] = {
        count: values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        avg: values.reduce((a, b) => a + b, 0) / values.length,
        latest: latest.primaryValue,
        latestAt: latest.measuredAt,
        trend,
        abnormalCount: typeReadings.filter(r => r.isAbnormal).length
      }
    })

    // Buscar dispositivos conectados
    const devices = await prisma.connectedDevice.findMany({
      where: { patientId, isActive: true },
      select: {
        id: true,
        deviceName: true,
        deviceType: true,
        connectionStatus: true,
        lastSyncAt: true
      }
    })

    // Últimos alertas
    const recentAlerts = await prisma.deviceReading.findMany({
      where: {
        patientId,
        isAbnormal: true,
        measuredAt: { gte: startDate }
      },
      orderBy: { measuredAt: 'desc' },
      take: 10,
      include: {
        device: {
          select: { deviceName: true }
        }
      }
    })

    // Dados para gráficos (últimos 7 dias por tipo principal)
    const chartData: Record<string, Array<{ date: string; value: number }>> = {}
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const mainTypes: ReadingType[] = [
      'HEART_RATE',
      'BLOOD_PRESSURE_SYSTOLIC',
      'BLOOD_PRESSURE_DIASTOLIC',
      'OXYGEN_SATURATION',
      'BLOOD_GLUCOSE',
      'WEIGHT',
      'STEPS'
    ]

    mainTypes.forEach(type => {
      if (byType[type]) {
        chartData[type] = byType[type]
          .filter(r => r.measuredAt >= sevenDaysAgo)
          .map(r => ({
            date: r.measuredAt.toISOString(),
            value: r.primaryValue
          }))
      }
    })

    // Resumo de saúde
    const healthSummary = generateHealthSummary(statistics)

    return NextResponse.json({
      period,
      totalReadings: readings.length,
      statistics,
      devices,
      recentAlerts: recentAlerts.map(a => ({
        id: a.id,
        type: a.readingType,
        value: a.primaryValue,
        unit: a.unit,
        severity: a.alertSeverity,
        measuredAt: a.measuredAt,
        deviceName: a.device?.deviceName
      })),
      chartData,
      healthSummary
    })
  } catch (error) {
    logger.error('Error fetching dashboard:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar dashboard' },
      { status: 500 }
    )
  }
}

// Gerar resumo de saúde baseado nas estatísticas
function generateHealthSummary(statistics: Record<string, {
  count: number
  min: number
  max: number
  avg: number
  latest: number
  trend: 'up' | 'down' | 'stable'
  abnormalCount: number
}>): {
  status: 'excellent' | 'good' | 'attention' | 'alert'
  message: string
  highlights: string[]
  concerns: string[]
} {
  const highlights: string[] = []
  const concerns: string[] = []
  let alertCount = 0

  // Avaliar cada métrica
  if (statistics['HEART_RATE']) {
    const hr = statistics['HEART_RATE']
    if (hr.avg >= 60 && hr.avg <= 100) {
      highlights.push('Frequência cardíaca em faixa saudável')
    } else {
      concerns.push('Frequência cardíaca fora da faixa ideal')
      alertCount++
    }
  }

  if (statistics['BLOOD_PRESSURE_SYSTOLIC']) {
    const bp = statistics['BLOOD_PRESSURE_SYSTOLIC']
    if (bp.avg <= 120) {
      highlights.push('Pressão arterial controlada')
    } else if (bp.avg > 140) {
      concerns.push('Pressão arterial elevada - atenção necessária')
      alertCount++
    }
  }

  if (statistics['OXYGEN_SATURATION']) {
    const spo2 = statistics['OXYGEN_SATURATION']
    if (spo2.avg >= 95) {
      highlights.push('Oxigenação sanguínea excelente')
    } else if (spo2.avg < 92) {
      concerns.push('Saturação de oxigênio baixa - consulte um médico')
      alertCount += 2
    }
  }

  if (statistics['BLOOD_GLUCOSE']) {
    const glucose = statistics['BLOOD_GLUCOSE']
    if (glucose.avg >= 70 && glucose.avg <= 100) {
      highlights.push('Glicemia em níveis normais')
    } else if (glucose.avg > 126) {
      concerns.push('Glicemia elevada - monitorar de perto')
      alertCount++
    }
  }

  if (statistics['STEPS']) {
    const steps = statistics['STEPS']
    if (steps.avg >= 8000) {
      highlights.push('Excelente nível de atividade física!')
    } else if (steps.avg < 5000) {
      concerns.push('Considere aumentar sua atividade física diária')
    }
  }

  // Determinar status geral
  let status: 'excellent' | 'good' | 'attention' | 'alert'
  let message: string

  if (alertCount === 0 && highlights.length >= 3) {
    status = 'excellent'
    message = 'Seus indicadores de saúde estão excelentes! Continue assim.'
  } else if (alertCount === 0) {
    status = 'good'
    message = 'Seus indicadores estão dentro da normalidade.'
  } else if (alertCount <= 2) {
    status = 'attention'
    message = 'Alguns indicadores merecem atenção. Revise as recomendações.'
  } else {
    status = 'alert'
    message = 'Vários indicadores precisam de atenção. Consulte seu médico.'
  }

  return { status, message, highlights, concerns }
}
