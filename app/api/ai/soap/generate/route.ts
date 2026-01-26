import { NextRequest, NextResponse } from 'next/server'
import { withDoctorAuth } from '@/lib/with-auth'
import { rateLimiters } from '@/lib/rate-limiter'
import { generateSoapFromTranscript } from '@/lib/ai-soap'
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
  const transcript = body.transcript || ''
  const patientId = body.patientId as string | undefined
  const locale = body.locale || 'pt-BR'
  const speciality = body.speciality || undefined
  if (!transcript || transcript.length < 10) {
    return NextResponse.json({ error: 'Transcript insuficiente' }, { status: 400 })
  }

  if (patientId) {
    const patientUser = await prisma.user.findFirst({
      where: { patientId },
      select: { id: true },
    })
    if (patientUser?.id) {
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
    }
  }
  try {
    const soap = await generateSoapFromTranscript({ transcript, locale, speciality })
    // Opcional: anexar who/user id
    return NextResponse.json({ soap, generatedBy: user.id })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Falha ao gerar SOAP' }, { status: 500 })
  }
})
