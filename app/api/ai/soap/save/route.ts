import { NextRequest, NextResponse } from 'next/server'
import { withDoctorAuth } from '@/lib/with-auth'
import { rateLimiters } from '@/lib/rate-limiter'
import { soapSchema } from '@/lib/ai-soap'
import { saveSoapAsMedicalRecord } from '@/lib/soap-persistence'
import prisma from '@/lib/prisma'
import { TermAudience } from '@prisma/client'
import { assertUserAcceptedTerms } from '@/lib/terms-enforcement'
import { termsEnforcementErrorResponse } from '@/lib/terms-http'

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
    const res = termsEnforcementErrorResponse(e)
    if (res) return res
    throw e
  }

  const body = await req.json().catch(() => ({})) as any
  const patientId = body.patientId as string | undefined
  const doctorId = body.doctorId as string | undefined || user.id
  const soap = body.soap
  if (!patientId || !soap) {
    return NextResponse.json({ error: 'patientId e soap são obrigatórios' }, { status: 400 })
  }

  const patientUser = await prisma.user.findFirst({
    where: { patientId },
    select: { id: true },
  })
  if (!patientUser?.id) {
    return NextResponse.json(
      { error: 'Paciente sem conta vinculada para consentimento de IA', code: 'PATIENT_NO_USER' },
      { status: 403 }
    )
  }

  try {
    await assertUserAcceptedTerms({
      prisma,
      userId: patientUser.id,
      audience: TermAudience.PATIENT,
      gates: ['AI'],
    })
  } catch (e) {
    const res = termsEnforcementErrorResponse(e)
    if (res) return res
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
