import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { DeviceDataSource, ReadingType, ReadingContext, Prisma } from '@prisma/client'
import { logger } from '@/lib/logger'

// POST - Iniciar sessão de sincronização
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { patientId, dataSource, readings } = body

    if (!patientId || !dataSource || !readings) {
      return NextResponse.json(
        { error: 'Dados obrigatórios faltando' },
        { status: 400 }
      )
    }

    // Verificar paciente
    const patient = await prisma.patient.findUnique({
      where: { id: patientId }
    })

    if (!patient) {
      return NextResponse.json(
        { error: 'Paciente não encontrado' },
        { status: 404 }
      )
    }

    // Criar sessão de sync
    const syncSession = await prisma.deviceSyncSession.create({
      data: {
        patientId,
        dataSource: dataSource as DeviceDataSource,
        status: 'IN_PROGRESS'
      }
    })

    try {
      // Processar leituras vindas do HealthKit/Health Connect
      const processedReadings = []
      let skipped = 0
      let errors = 0

      for (const reading of readings) {
        try {
          // Mapear tipos do HealthKit/Health Connect para nossos tipos
          const mappedType = mapHealthDataType(reading.type, dataSource)
          if (!mappedType) {
            skipped++
            continue
          }

          // Verificar se já existe (evitar duplicatas)
          const existing = await prisma.deviceReading.findFirst({
            where: {
              patientId,
              readingType: mappedType.readingType as ReadingType,
              measuredAt: new Date(reading.startDate || reading.measuredAt),
              primaryValue: reading.value
            }
          })

          if (existing) {
            skipped++
            continue
          }

          processedReadings.push({
            patientId,
            readingType: mappedType.readingType as ReadingType,
            primaryValue: reading.value,
            secondaryValue: reading.secondaryValue,
            unit: mappedType.unit,
            measuredAt: new Date(reading.startDate || reading.measuredAt),
            context: reading.context as ReadingContext | undefined,
            isManual: reading.sourceType === 'manual',
            rawData: reading as Prisma.InputJsonValue
          })
        } catch (e) {
          errors++
        }
      }

      // Inserir em batch
      if (processedReadings.length > 0) {
        await prisma.deviceReading.createMany({
          data: processedReadings,
          skipDuplicates: true
        })
      }

      // Atualizar sessão
      await prisma.deviceSyncSession.update({
        where: { id: syncSession.id },
        data: {
          status: errors > 0 ? 'PARTIAL' : 'COMPLETED',
          completedAt: new Date(),
          readingsImported: processedReadings.length,
          readingsSkipped: skipped,
          errors
        }
      })

      return NextResponse.json({
        success: true,
        sessionId: syncSession.id,
        imported: processedReadings.length,
        skipped,
        errors
      })
    } catch (error) {
      // Marcar sessão como falha
      await prisma.deviceSyncSession.update({
        where: { id: syncSession.id },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          errorMessage: error instanceof Error ? error.message : 'Erro desconhecido'
        }
      })
      throw error
    }
  } catch (error) {
    logger.error('Error syncing data:', error)
    return NextResponse.json(
      { error: 'Erro ao sincronizar dados' },
      { status: 500 }
    )
  }
}

// GET - Histórico de sincronizações
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const patientId = searchParams.get('patientId')

    if (!patientId) {
      return NextResponse.json(
        { error: 'ID do paciente é obrigatório' },
        { status: 400 }
      )
    }

    const sessions = await prisma.deviceSyncSession.findMany({
      where: { patientId },
      orderBy: { startedAt: 'desc' },
      take: 20
    })

    return NextResponse.json(sessions)
  } catch (error) {
    logger.error('Error fetching sync history:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar histórico' },
      { status: 500 }
    )
  }
}

// Mapear tipos do HealthKit/Health Connect para nossos tipos
function mapHealthDataType(
  type: string,
  source: string
): { readingType: string; unit: string } | null {
  // Mapeamento Apple HealthKit
  const healthKitMap: Record<string, { readingType: string; unit: string }> = {
    'HKQuantityTypeIdentifierHeartRate': { readingType: 'HEART_RATE', unit: 'bpm' },
    'HKQuantityTypeIdentifierBloodPressureSystolic': { readingType: 'BLOOD_PRESSURE_SYSTOLIC', unit: 'mmHg' },
    'HKQuantityTypeIdentifierBloodPressureDiastolic': { readingType: 'BLOOD_PRESSURE_DIASTOLIC', unit: 'mmHg' },
    'HKQuantityTypeIdentifierOxygenSaturation': { readingType: 'OXYGEN_SATURATION', unit: '%' },
    'HKQuantityTypeIdentifierBloodGlucose': { readingType: 'BLOOD_GLUCOSE', unit: 'mg/dL' },
    'HKQuantityTypeIdentifierBodyTemperature': { readingType: 'BODY_TEMPERATURE', unit: '°C' },
    'HKQuantityTypeIdentifierBodyMass': { readingType: 'WEIGHT', unit: 'kg' },
    'HKQuantityTypeIdentifierBodyMassIndex': { readingType: 'BMI', unit: 'kg/m²' },
    'HKQuantityTypeIdentifierStepCount': { readingType: 'STEPS', unit: 'steps' },
    'HKQuantityTypeIdentifierDistanceWalkingRunning': { readingType: 'DISTANCE', unit: 'km' },
    'HKQuantityTypeIdentifierActiveEnergyBurned': { readingType: 'CALORIES_BURNED', unit: 'kcal' },
    'HKQuantityTypeIdentifierRespiratoryRate': { readingType: 'RESPIRATORY_RATE', unit: 'rpm' },
    'HKQuantityTypeIdentifierHeartRateVariabilitySDNN': { readingType: 'HEART_RATE_VARIABILITY', unit: 'ms' },
    'HKQuantityTypeIdentifierBodyFatPercentage': { readingType: 'BODY_FAT', unit: '%' },
    'HKCategoryTypeIdentifierSleepAnalysis': { readingType: 'SLEEP_DURATION', unit: 'hours' },
  }

  // Mapeamento Google Health Connect
  const healthConnectMap: Record<string, { readingType: string; unit: string }> = {
    'HeartRate': { readingType: 'HEART_RATE', unit: 'bpm' },
    'BloodPressure': { readingType: 'BLOOD_PRESSURE', unit: 'mmHg' },
    'OxygenSaturation': { readingType: 'OXYGEN_SATURATION', unit: '%' },
    'BloodGlucose': { readingType: 'BLOOD_GLUCOSE', unit: 'mg/dL' },
    'BodyTemperature': { readingType: 'BODY_TEMPERATURE', unit: '°C' },
    'Weight': { readingType: 'WEIGHT', unit: 'kg' },
    'Steps': { readingType: 'STEPS', unit: 'steps' },
    'Distance': { readingType: 'DISTANCE', unit: 'km' },
    'ActiveCaloriesBurned': { readingType: 'CALORIES_BURNED', unit: 'kcal' },
    'RespiratoryRate': { readingType: 'RESPIRATORY_RATE', unit: 'rpm' },
    'BodyFat': { readingType: 'BODY_FAT', unit: '%' },
    'SleepSession': { readingType: 'SLEEP_DURATION', unit: 'hours' },
  }

  if (source === 'APPLE_HEALTHKIT') {
    return healthKitMap[type] || null
  }

  if (source === 'GOOGLE_FIT' || source === 'HEALTH_CONNECT') {
    return healthConnectMap[type] || null
  }

  // Mapeamento genérico
  const genericMap: Record<string, { readingType: string; unit: string }> = {
    'heart_rate': { readingType: 'HEART_RATE', unit: 'bpm' },
    'blood_pressure': { readingType: 'BLOOD_PRESSURE', unit: 'mmHg' },
    'oxygen': { readingType: 'OXYGEN_SATURATION', unit: '%' },
    'glucose': { readingType: 'BLOOD_GLUCOSE', unit: 'mg/dL' },
    'temperature': { readingType: 'BODY_TEMPERATURE', unit: '°C' },
    'weight': { readingType: 'WEIGHT', unit: 'kg' },
    'steps': { readingType: 'STEPS', unit: 'steps' },
  }

  return genericMap[type.toLowerCase()] || null
}
