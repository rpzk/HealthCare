import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/auth'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { enqueueAI } from '@/lib/ai-bullmq-queue'

export const runtime = 'nodejs'

const bodySchema = z.object({
  id: z.string().min(1, 'id obrigatório'),
})

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  try {
    const body = await request.json()
    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten(), message: 'Entrada inválida' }, { status: 400 })
    }

    const { id: patientId } = parsed.data

    // Verify patient exists
    const patient = await prisma.patient.findUnique({ where: { id: patientId } })
    if (!patient) {
      return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })
    }

    // Create export record
    const exportRecord = await prisma.patientPdfExport.create({
      data: {
        patientId,
        status: 'PENDING',
        requestedBy: session.user.id,
      },
    })

    // Enqueue job
    const job = await enqueueAI('patient_pdf_export', {
      patientId,
      exportId: exportRecord.id,
    })

    return NextResponse.json({
      success: true,
      exportId: exportRecord.id,
      jobId: job.id,
      message: 'Exportação iniciada. Você pode acompanhar o progresso.',
    })
  } catch (e: any) {
    console.error('[Patient PDF Export] Error:', e)
    return NextResponse.json({ error: e?.message || 'Erro ao processar solicitação' }, { status: 500 })
  }
}

