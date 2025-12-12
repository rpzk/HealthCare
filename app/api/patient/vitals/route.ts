import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sanitizeText } from '@/lib/sanitization'

interface VitalPayload {
  systolicBP?: number
  diastolicBP?: number
  heartRate?: number
  respiratoryRate?: number
  temperature?: number
  weight?: number
  height?: number
  oxygenSaturation?: number
  bloodGlucose?: number
  notes?: string
  recordedAt?: string
}

const numberOrNull = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : undefined)
const toDateOrNow = (value?: string | null) => {
  if (!value) return new Date()
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed
}

async function resolvePatientFromSession(session: any) {
  const userId = session?.user?.id
  const userEmail = session?.user?.email
  if (!userId && !userEmail) return null
  return prisma.patient.findFirst({
    where: {
      OR: [
        userId ? { userId } : undefined,
        userEmail ? { email: userEmail } : undefined
      ].filter(Boolean) as any
    }
  })
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const patient = await resolvePatientFromSession(session)
    if (!patient) {
      return NextResponse.json([])
    }

    const vitals = await prisma.vitalSigns.findMany({
      where: { patientId: patient.id },
      orderBy: { recordedAt: 'desc' },
      take: 100
    })

    const formattedVitals = vitals.map(vital => ({
      id: vital.id,
      systolicBP: vital.systolicBP,
      diastolicBP: vital.diastolicBP,
      heartRate: vital.heartRate,
      respiratoryRate: vital.respiratoryRate,
      temperature: vital.temperature,
      weight: vital.weight,
      height: vital.height,
      bmi: vital.bmi,
      oxygenSaturation: vital.oxygenSaturation,
      bloodGlucose: vital.bloodGlucose,
      notes: vital.notes,
      recordedAt: vital.recordedAt.toISOString()
    }))

    return NextResponse.json(formattedVitals)
  } catch (error) {
    console.error('Erro ao buscar sinais vitais:', error)
    return NextResponse.json(
      { error: 'Erro ao carregar sinais vitais' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const patient = await resolvePatientFromSession(session)
    if (!patient) {
      return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })
    }

    const raw = (await req.json()) as VitalPayload

    const body: VitalPayload = {
      systolicBP: numberOrNull(raw.systolicBP),
      diastolicBP: numberOrNull(raw.diastolicBP),
      heartRate: numberOrNull(raw.heartRate),
      respiratoryRate: numberOrNull(raw.respiratoryRate),
      temperature: numberOrNull(raw.temperature),
      weight: numberOrNull(raw.weight),
      height: numberOrNull(raw.height),
      oxygenSaturation: numberOrNull(raw.oxygenSaturation),
      bloodGlucose: numberOrNull(raw.bloodGlucose),
      notes: sanitizeText(raw.notes || ''),
      recordedAt: raw.recordedAt,
    }

    const bmi = body.weight && body.height ? body.weight / Math.pow(body.height / 100, 2) : null

    const created = await prisma.vitalSigns.create({
      data: {
        patientId: patient.id,
        systolicBP: body.systolicBP ?? null,
        diastolicBP: body.diastolicBP ?? null,
        heartRate: body.heartRate ?? null,
        respiratoryRate: body.respiratoryRate ?? null,
        temperature: body.temperature ?? null,
        weight: body.weight ?? null,
        height: body.height ?? null,
        bmi: bmi ?? undefined,
        oxygenSaturation: body.oxygenSaturation ?? null,
        bloodGlucose: body.bloodGlucose ?? null,
        notes: body.notes || null,
        recordedAt: toDateOrNow(body.recordedAt)
      }
    })

    return NextResponse.json({ success: true, id: created.id })
  } catch (error) {
    console.error('Erro ao registrar sinais vitais:', error)
    return NextResponse.json(
      { error: 'Erro ao registrar sinais vitais' },
      { status: 500 }
    )
  }
}
