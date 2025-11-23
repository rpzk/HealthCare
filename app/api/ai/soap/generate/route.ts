import { NextRequest, NextResponse } from 'next/server'
import { withDoctorAuth } from '@/lib/with-auth'
import { rateLimiters } from '@/lib/rate-limiter'
import { generateSoapFromTranscript } from '@/lib/ai-soap'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const POST = withDoctorAuth(async (req: NextRequest, { user }) => {
  const rl = rateLimiters.aiMedical(req)
  if (rl instanceof NextResponse) return rl

  const body = await req.json().catch(() => ({})) as any
  const transcript = body.transcript || ''
  const locale = body.locale || 'pt-BR'
  const speciality = body.speciality || undefined
  if (!transcript || transcript.length < 10) {
    return NextResponse.json({ error: 'Transcript insuficiente' }, { status: 400 })
  }
  try {
    const soap = await generateSoapFromTranscript({ transcript, locale, speciality })
    // Opcional: anexar who/user id
    return NextResponse.json({ soap, generatedBy: user.id })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Falha ao gerar SOAP' }, { status: 500 })
  }
})
