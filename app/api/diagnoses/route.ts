import { NextResponse } from 'next/server'
import { withPatientAuth } from '@/lib/advanced-auth'
import { validateDiagnosisCreate, validateDiagnosisUpdate } from '@/lib/validation-schemas'
import { CodingService } from '@/lib/coding-service'
import { prisma } from '@/lib/prisma'

export const GET = withPatientAuth(async (req) => {
  const { searchParams } = new URL(req.url)
  const patientId = searchParams.get('patientId')
  if (!patientId) return NextResponse.json({ error: 'patientId é obrigatório' }, { status: 400 })
  const list = await (prisma as any).diagnosis.findMany({
    where: { patientId },
    orderBy: { createdAt: 'desc' },
    include: { primaryCode: true, secondaryCodes: { include: { code: true } } }
  })
  return NextResponse.json({ diagnoses: list })
})

export const POST = withPatientAuth( async (req) => {
  const body = await req.json()
  const v = validateDiagnosisCreate(body)
  if (!v.success) return NextResponse.json({ errors: v.errors }, { status: 400 })
  const data = v.data!
  const diag = await CodingService.recordDiagnosis({
    patientId: data.patientId,
    consultationId: data.consultationId,
    primaryCodeId: data.primaryCodeId,
    secondaryCodeIds: data.secondaryCodeIds,
    notes: data.notes,
    onsetDate: data.onsetDate ? new Date(data.onsetDate) : undefined,
    certainty: data.certainty
  })
  return NextResponse.json(diag, { status: 201 })
})

export const PUT = withPatientAuth(async (req) => {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 })
  const body = await req.json()
  const v = validateDiagnosisUpdate(body)
  if (!v.success) return NextResponse.json({ errors: v.errors }, { status: 400 })
  const d = v.data!
  const updated = await CodingService.updateDiagnosis(id, {
    status: d.status,
    resolvedDate: d.resolvedDate ? new Date(d.resolvedDate) : undefined,
    notes: d.notes,
    certainty: d.certainty,
    secondaryCodeIds: d.secondaryCodeIds
  })
  return NextResponse.json(updated)
})
