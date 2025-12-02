import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Prisma, ReadingType, ReadingContext, AlertSeverity } from '@prisma/client'

// Limites de referência padrão
const DEFAULT_THRESHOLDS: Record<string, {
  criticalLow?: number
  warningLow?: number
  normalMin?: number
  normalMax?: number
  warningHigh?: number
  criticalHigh?: number
}> = {
  BLOOD_PRESSURE_SYSTOLIC: {
    criticalLow: 70,
    warningLow: 90,
    normalMin: 90,
    normalMax: 120,
    warningHigh: 140,
    criticalHigh: 180
  },
  BLOOD_PRESSURE_DIASTOLIC: {
    criticalLow: 40,
    warningLow: 60,
    normalMin: 60,
    normalMax: 80,
    warningHigh: 90,
    criticalHigh: 120
  },
  HEART_RATE: {
    criticalLow: 40,
    warningLow: 50,
    normalMin: 60,
    normalMax: 100,
    warningHigh: 110,
    criticalHigh: 150
  },
  OXYGEN_SATURATION: {
    criticalLow: 85,
    warningLow: 92,
    normalMin: 95,
    normalMax: 100
  },
  BLOOD_GLUCOSE: {
    criticalLow: 50,
    warningLow: 70,
    normalMin: 70,
    normalMax: 100,
    warningHigh: 126,
    criticalHigh: 200
  },
  BLOOD_GLUCOSE_FASTING: {
    criticalLow: 50,
    warningLow: 70,
    normalMin: 70,
    normalMax: 99,
    warningHigh: 126,
    criticalHigh: 200
  },
  BODY_TEMPERATURE: {
    criticalLow: 34,
    warningLow: 35.5,
    normalMin: 36,
    normalMax: 37.5,
    warningHigh: 38.5,
    criticalHigh: 40
  },
  WEIGHT: {
    // Peso não tem limites fixos, depende do paciente
  },
  RESPIRATORY_RATE: {
    criticalLow: 8,
    warningLow: 10,
    normalMin: 12,
    normalMax: 20,
    warningHigh: 24,
    criticalHigh: 30
  }
}

// Função para avaliar se valor é anormal
function evaluateReading(
  readingType: string,
  value: number,
  thresholds?: typeof DEFAULT_THRESHOLDS[string]
): { isAbnormal: boolean; alertSeverity?: AlertSeverity } {
  const limits = thresholds || DEFAULT_THRESHOLDS[readingType]
  if (!limits) {
    return { isAbnormal: false }
  }

  if (limits.criticalLow !== undefined && value < limits.criticalLow) {
    return { isAbnormal: true, alertSeverity: 'CRITICAL' }
  }
  if (limits.criticalHigh !== undefined && value > limits.criticalHigh) {
    return { isAbnormal: true, alertSeverity: 'CRITICAL' }
  }
  if (limits.warningLow !== undefined && value < limits.warningLow) {
    return { isAbnormal: true, alertSeverity: 'HIGH' }
  }
  if (limits.warningHigh !== undefined && value > limits.warningHigh) {
    return { isAbnormal: true, alertSeverity: 'HIGH' }
  }
  if (limits.normalMin !== undefined && value < limits.normalMin) {
    return { isAbnormal: true, alertSeverity: 'MEDIUM' }
  }
  if (limits.normalMax !== undefined && value > limits.normalMax) {
    return { isAbnormal: true, alertSeverity: 'MEDIUM' }
  }

  return { isAbnormal: false }
}

// GET - Listar leituras de dispositivos
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const patientId = searchParams.get('patientId')
    const deviceId = searchParams.get('deviceId')
    const readingType = searchParams.get('readingType')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const abnormalOnly = searchParams.get('abnormalOnly') === 'true'
    const limit = parseInt(searchParams.get('limit') || '100')

    if (!patientId) {
      return NextResponse.json(
        { error: 'ID do paciente é obrigatório' },
        { status: 400 }
      )
    }

    const where: Prisma.DeviceReadingWhereInput = {
      patientId
    }

    if (deviceId) where.deviceId = deviceId
    if (readingType) where.readingType = readingType as ReadingType
    if (abnormalOnly) where.isAbnormal = true
    if (startDate || endDate) {
      where.measuredAt = {}
      if (startDate) where.measuredAt.gte = new Date(startDate)
      if (endDate) where.measuredAt.lte = new Date(endDate)
    }

    const readings = await prisma.deviceReading.findMany({
      where,
      include: {
        device: {
          select: {
            deviceName: true,
            deviceType: true,
            manufacturer: true
          }
        }
      },
      orderBy: { measuredAt: 'desc' },
      take: limit
    })

    return NextResponse.json(readings)
  } catch (error) {
    console.error('Error fetching readings:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar leituras' },
      { status: 500 }
    )
  }
}

// POST - Registrar novas leituras (bulk)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { patientId, deviceId, readings } = body

    if (!patientId || !readings || !Array.isArray(readings)) {
      return NextResponse.json(
        { error: 'Dados obrigatórios faltando' },
        { status: 400 }
      )
    }

    // Verificar paciente e dispositivo
    const patient = await prisma.patient.findUnique({
      where: { id: patientId }
    })

    if (!patient) {
      return NextResponse.json(
        { error: 'Paciente não encontrado' },
        { status: 404 }
      )
    }

    // Se deviceId fornecido, verificar
    let device = null
    if (deviceId) {
      device = await prisma.connectedDevice.findUnique({
        where: { id: deviceId }
      })
    }

    // Buscar limites personalizados do paciente
    const customThresholds = await prisma.readingThreshold.findMany({
      where: { patientId, isActive: true }
    })

    const thresholdsMap = new Map(
      customThresholds.map(t => [t.readingType, t])
    )

    // Processar e inserir leituras
    const processedReadings = readings.map((reading: {
      readingType: ReadingType
      primaryValue: number
      secondaryValue?: number
      tertiaryValue?: number
      unit: string
      measuredAt: string
      context?: ReadingContext
      notes?: string
      isManual?: boolean
      rawData?: Record<string, unknown>
    }) => {
      const customThreshold = thresholdsMap.get(reading.readingType)
      const { isAbnormal, alertSeverity } = evaluateReading(
        reading.readingType,
        reading.primaryValue,
        customThreshold ? {
          criticalLow: customThreshold.criticalLow || undefined,
          warningLow: customThreshold.warningLow || undefined,
          normalMin: customThreshold.normalMin || undefined,
          normalMax: customThreshold.normalMax || undefined,
          warningHigh: customThreshold.warningHigh || undefined,
          criticalHigh: customThreshold.criticalHigh || undefined
        } : undefined
      )

      return {
        patientId,
        deviceId: deviceId || null,
        readingType: reading.readingType,
        primaryValue: reading.primaryValue,
        secondaryValue: reading.secondaryValue,
        tertiaryValue: reading.tertiaryValue,
        unit: reading.unit,
        measuredAt: new Date(reading.measuredAt),
        context: reading.context,
        notes: reading.notes,
        isManual: reading.isManual ?? !deviceId,
        isAbnormal,
        alertSeverity,
        rawData: reading.rawData as Prisma.InputJsonValue | undefined
      }
    })

    // Inserir em batch
    const result = await prisma.deviceReading.createMany({
      data: processedReadings,
      skipDuplicates: true
    })

    // Atualizar última sincronização do dispositivo
    if (device) {
      await prisma.connectedDevice.update({
        where: { id: deviceId },
        data: {
          lastSyncAt: new Date(),
          connectionStatus: 'CONNECTED'
        }
      })
    }

    // Verificar se há alertas críticos
    const criticalReadings = processedReadings.filter(
      r => r.alertSeverity === 'CRITICAL' || r.alertSeverity === 'HIGH'
    )

    if (criticalReadings.length > 0) {
      // Criar notificação de alerta
      // TODO: Implementar notificação push/email
      console.log(`⚠️ ${criticalReadings.length} leituras críticas para paciente ${patientId}`)
    }

    return NextResponse.json({
      success: true,
      imported: result.count,
      alerts: criticalReadings.length
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating readings:', error)
    return NextResponse.json(
      { error: 'Erro ao registrar leituras' },
      { status: 500 }
    )
  }
}
