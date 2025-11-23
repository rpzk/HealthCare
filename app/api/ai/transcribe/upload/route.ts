import { NextRequest, NextResponse } from 'next/server'
import { withDoctorAuth } from '@/lib/with-auth'
import { rateLimiters } from '@/lib/rate-limiter'
import { promises as fs } from 'fs'
import path from 'path'
import { enqueueAI } from '@/lib/ai-bullmq-queue'

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

export const POST = withDoctorAuth(async (req: NextRequest) => {
  const rl = rateLimiters.aiMedical(req)
  if (rl instanceof NextResponse) return rl

  // Parse multipart form-data
  const form = await req.formData().catch(() => null)
  if (!form) return NextResponse.json({ error: 'FormData inválido' }, { status: 400 })

  const file = form.get('audio')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Campo "audio" é obrigatório' }, { status: 400 })
  }

  // Salvar arquivo para processamento assíncrono futuro
  const saved = await saveFormFile(file, path.join('transcripts'))

  // MVP: "Transcrição" falsa (eco do nome do arquivo). Substituir por STT real (Whisper/Deepgram etc.)
  const transcript = `Arquivo recebido (${saved.filename}). Integração STT será aplicada aqui.`

  // Optionally enqueue async pipeline to transcribe + generate SOAP and persist as medical record
  const url = new URL(req.url)
  const enqueue = url.searchParams.get('enqueue') === 'true'
  const mode = url.searchParams.get('mode') || 'save'
  const patientId = form.get('patientId') as string | null
  const doctorId = form.get('doctorId') as string | null
  const locale = (form.get('locale') as string | null) || undefined
  const speciality = (form.get('speciality') as string | null) || undefined

  if (enqueue) {
    if (mode === 'draft') {
      const job = await enqueueAI('transcribe_and_generate_soap_draft', {
        filePath: saved.relPath,
        locale,
        speciality
      })
      return NextResponse.json({ ok: true, enqueued: true, draft: true, jobId: job.id, file: { path: saved.relPath } })
    } else {
      if (!patientId || !doctorId) {
        return NextResponse.json({ error: 'patientId e doctorId são obrigatórios para enfileirar' }, { status: 400 })
      }
      const job = await enqueueAI('transcribe_and_generate_soap', {
        filePath: saved.relPath,
        patientId,
        doctorId,
        locale,
        speciality
      })
      return NextResponse.json({ ok: true, enqueued: true, jobId: job.id, file: { path: saved.relPath } })
    }
  }

  return NextResponse.json({ ok: true, transcript, file: { path: saved.relPath } })
})
