import { NextRequest, NextResponse } from 'next/server'
import { withDoctorAuth } from '@/lib/with-auth'
import { rateLimiters } from '@/lib/rate-limiter'
import { promises as fs } from 'fs'
import path from 'path'
import { enqueueAIJob } from '@/lib/ai-queue-factory'
import prisma from '@/lib/prisma'
import { TermAudience } from '@prisma/client'
import { assertUserAcceptedTerms } from '@/lib/terms-enforcement'
import { termsEnforcementErrorResponse } from '@/lib/terms-http'
import { transcribeFile } from '@/lib/stt-service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function saveFormFile(file: File, relDir: string, baseName?: string) {
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const ext = path.extname(file.name) || '.webm'
  const safeBase = (baseName || path.basename(file.name, ext)).replace(/[^a-zA-Z0-9_-]/g, '') || 'audio'
  const time = Date.now()
  const filename = `${safeBase}-${time}${ext}`
  const dir = path.join(process.cwd(), 'uploads', relDir)
  await fs.mkdir(dir, { recursive: true })
  const fullPath = path.join(dir, filename)
  await fs.writeFile(fullPath, buffer)
  return { fullPath, filename, relPath: path.join('uploads', relDir, filename) }
}

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

  // Parse multipart form-data
  const form = await req.formData().catch(() => null)
  if (!form) return NextResponse.json({ error: 'FormData inválido' }, { status: 400 })

  const file = form.get('audio')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Campo "audio" é obrigatório' }, { status: 400 })
  }

  // Salvar arquivo para processamento assíncrono futuro
  const saved = await saveFormFile(file, path.join('transcripts'))

  // Optionally enqueue async pipeline to transcribe + generate SOAP and persist as medical record
  const url = new URL(req.url)
  const enqueue = url.searchParams.get('enqueue') === 'true'
  const mode = url.searchParams.get('mode') || 'save'
  const patientId = form.get('patientId') as string | null
  const doctorId = form.get('doctorId') as string | null
  const locale = (form.get('locale') as string | null) || undefined
  const speciality = (form.get('speciality') as string | null) || undefined

  // If this operation is tied to a patient, enforce patient AI consent too.
  if (patientId) {
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { userId: true },
    })
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
      const res = termsEnforcementErrorResponse(e)
      if (res) return res
      throw e
    }
  }

  if (enqueue) {
    if (mode === 'draft') {
      const job = await enqueueAIJob('transcribe_and_generate_soap_draft', {
        filePath: saved.relPath,
        locale,
        speciality
      })
      return NextResponse.json({ ok: true, enqueued: true, draft: true, jobId: job.id, file: { path: saved.relPath } })
    } else {
      if (!patientId || !doctorId) {
        return NextResponse.json({ error: 'patientId e doctorId são obrigatórios para enfileirar' }, { status: 400 })
      }
      const job = await enqueueAIJob('transcribe_and_generate_soap', {
        filePath: saved.relPath,
        patientId,
        doctorId,
        locale,
        speciality
      })
      return NextResponse.json({ ok: true, enqueued: true, jobId: job.id, file: { path: saved.relPath } })
    }
  }

  // Synchronous STT (requires STT_URL); avoids mocked/placeholder transcripts.
  try {
    const stt = await transcribeFile(saved.fullPath)
    return NextResponse.json({ ok: true, transcript: stt.text, provider: stt.provider, file: { path: saved.relPath } })
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'Falha ao transcrever áudio. Configure STT_URL.', code: 'STT_UNAVAILABLE' },
      { status: 503 }
    )
  }
})
