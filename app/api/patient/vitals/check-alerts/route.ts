import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function classify(value: number, t: { criticalLow?: number | null; warningLow?: number | null; normalMin?: number | null; normalMax?: number | null; warningHigh?: number | null; criticalHigh?: number | null }) {
  if (t.criticalLow !== null && t.criticalLow !== undefined && value < t.criticalLow) return 'CRITICAL_LOW'
  if (t.warningLow !== null && t.warningLow !== undefined && value < t.warningLow) return 'LOW'
  if (t.criticalHigh !== null && t.criticalHigh !== undefined && value > t.criticalHigh) return 'CRITICAL_HIGH'
  if (t.warningHigh !== null && t.warningHigh !== undefined && value > t.warningHigh) return 'HIGH'
  return 'NORMAL'
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const { systolicBP, diastolicBP, heartRate, temperature, oxygenSaturation, glucose } = body || {}

    const whereClause: any = { OR: [{ userId: session.user.id }] }
    if (session.user.email) whereClause.OR.push({ email: session.user.email })

    const patient = await prisma.patient.findFirst({
      where: whereClause,
      select: { id: true }
    })
    if (!patient) return NextResponse.json({ alerts: [] })

    const thresholds = await prisma.readingThreshold.findMany({
      where: {
        isActive: true,
        OR: [
          { patientId: patient.id },
          { patientId: null },
        ]
      }
    })

    const alerts: Array<{ type: string; level: string; message: string }> = []

    const findT = (type: string) => thresholds.find(t => t.readingType === type)

    if (systolicBP !== undefined && diastolicBP !== undefined) {
      const tSys = findT('BLOOD_PRESSURE_SYSTOLIC')
      const tDia = findT('BLOOD_PRESSURE_DIASTOLIC')
      if (tSys) {
        const level = classify(systolicBP, tSys)
        if (level !== 'NORMAL') alerts.push({ type: 'PA Sistólica', level, message: `Sistólica ${systolicBP} mmHg (${level})` })
      }
      if (tDia) {
        const level = classify(diastolicBP, tDia)
        if (level !== 'NORMAL') alerts.push({ type: 'PA Diastólica', level, message: `Diastólica ${diastolicBP} mmHg (${level})` })
      }
    }

    if (heartRate !== undefined) {
      const t = findT('HEART_RATE')
      if (t) {
        const level = classify(heartRate, t)
        if (level !== 'NORMAL') alerts.push({ type: 'FC', level, message: `FC ${heartRate} bpm (${level})` })
      }
    }

    if (temperature !== undefined) {
      const t = findT('BODY_TEMPERATURE')
      if (t) {
        const level = classify(temperature, t)
        if (level !== 'NORMAL') alerts.push({ type: 'Temperatura', level, message: `Temp ${temperature} °C (${level})` })
      }
    }

    if (oxygenSaturation !== undefined) {
      const t = findT('OXYGEN_SATURATION')
      if (t) {
        const level = classify(oxygenSaturation, t)
        if (level !== 'NORMAL') alerts.push({ type: 'SpO₂', level, message: `SpO₂ ${oxygenSaturation}% (${level})` })
      }
    }

    if (glucose !== undefined) {
      const t = findT('BLOOD_GLUCOSE')
      if (t) {
        const level = classify(glucose, t)
        if (level !== 'NORMAL') alerts.push({ type: 'Glicemia', level, message: `Glicemia ${glucose} mg/dL (${level})` })
      }
    }

    return NextResponse.json({ alerts })
  } catch (error) {
    console.error('Error checking alerts:', error)
    return NextResponse.json({ error: 'Erro ao avaliar alertas' }, { status: 500 })
  }
}