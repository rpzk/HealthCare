import { NextRequest, NextResponse } from 'next/server'
import { withDoctorAuth } from '@/lib/with-auth'
import { rateLimiters } from '@/lib/rate-limiter'
import { soapSchema } from '@/lib/ai-soap'
import { saveSoapAsMedicalRecord } from '@/lib/soap-persistence'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const POST = withDoctorAuth(async (req: NextRequest, { user }) => {
  const rl = rateLimiters.aiMedical(req)
  if (rl instanceof NextResponse) return rl

  const body = await req.json().catch(() => ({})) as any
  const patientId = body.patientId as string | undefined
  const doctorId = body.doctorId as string | undefined || user.id
  const soap = body.soap
  if (!patientId || !soap) {
    return NextResponse.json({ error: 'patientId e soap são obrigatórios' }, { status: 400 })
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
