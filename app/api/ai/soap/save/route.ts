import { NextRequest, NextResponse } from 'next/server'
import { withDoctorAuth } from '@/lib/with-auth'
import { rateLimiters } from '@/lib/rate-limiter'
import { soapSchema } from '@/lib/ai-soap'
import { saveSoapAsMedicalRecord } from '@/lib/soap-persistence'
import prisma from '@/lib/prisma'
import { TermAudience } from '@prisma/client'
import { assertUserAcceptedTerms, TermsNotAcceptedError, TermsNotConfiguredError } from '@/lib/terms-enforcement'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const POST = withDoctorAuth(async (req: NextRequest, { user }) => {
  const rl = rateLimiters.aiMedical(req)
  if (rl instanceof NextResponse) return rl

  try {
    await assertUserAcceptedTerms({
      prisma,
      userId: user.id,
      audience: TermAudience.PROFESSIONAL,
      gates: ['AI'],
    })
  } catch (e) {
    if (e instanceof TermsNotAcceptedError) {
      return NextResponse.json(
        {
          error: e.message,
          code: e.code,
          missing: e.missingTerms.map((t) => ({ id: t.id, slug: t.slug, title: t.title, audience: t.audience })),
        },
        { status: 403 }
      )
    }
    if (e instanceof TermsNotConfiguredError) {
      return NextResponse.json(
        { error: e.message, code: e.code, missing: e.missing },
        { status: 503 }
      )
    }
    throw e
  }

  const body = await req.json().catch(() => ({})) as any
  const patientId = body.patientId as string | undefined
  const doctorId = body.doctorId as string | undefined || user.id
  const soap = body.soap
  if (!patientId || !soap) {
    return NextResponse.json({ error: 'patientId e soap são obrigatórios' }, { status: 400 })
  }

  const patient = await prisma.patient.findUnique({ where: { id: patientId }, select: { userId: true } })
  if (!patient?.userId) {
    return NextResponse.json(
      { error: 'Paciente sem conta vinculada para consentimento de IA', code: 'PATIENT_NO_USER' },
      { status: 403 }
    )
  }

  try {
    await assertUserAcceptedTerms({
      prisma,
      userId: patient.userId,
      audience: TermAudience.PATIENT,
      gates: ['AI'],
    })
  } catch (e) {
    if (e instanceof TermsNotAcceptedError) {
      return NextResponse.json(
        {
          error: e.message,
          code: e.code,
          missing: e.missingTerms.map((t) => ({ id: t.id, slug: t.slug, title: t.title, audience: t.audience })),
        },
        { status: 403 }
      )
    }
    if (e instanceof TermsNotConfiguredError) {
      return NextResponse.json(
        { error: e.message, code: e.code, missing: e.missing },
        { status: 503 }
      )
    }
    throw e
  }
  const parsed = soapSchema.safeParse(soap)
  if (!parsed.success) {
    return NextResponse.json({ error: 'SOAP inválida', details: parsed.error.issues }, { status: 400 })
  }
  try {
    const saved = await saveSoapAsMedicalRecord({ patientId, doctorId, soap: parsed.data })
    return NextResponse.json({ ok: true, recordId: saved.id })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Falha ao salvar registro' }, { status: 500 })
  }
})
