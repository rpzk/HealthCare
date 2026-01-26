import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { z } from 'zod'
import { writeFile, unlink } from 'fs/promises'
import { mkdir } from 'fs/promises'
import { join } from 'path'

// ============================================
// VALIDAÇÃO
// ============================================

const attachmentSchema = z.object({
  fileName: z.string().min(1).max(255),
  description: z.string().optional(),
})

const recordIdSchema = z.string().cuid()

// ============================================
// GET - Listar anexos do prontuário
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(async (_req, { params: authParams }) => {
    try {
      const recordId = recordIdSchema.parse(authParams.id || params.id)

      const record = await prisma.medicalRecord.findUnique({
        where: { id: recordId },
        select: { id: true },
      })

      if (!record) {
        return NextResponse.json({ error: 'Prontuário não encontrado' }, { status: 404 })
      }

      const attachments = await prisma.attachment.findMany({
        where: { medicalRecordId: recordId },
        select: {
          id: true,
          fileName: true,
          originalName: true,
          fileSize: true,
          mimeType: true,
          description: true,
          createdAt: true,
          filePath: true,
        },
        orderBy: { createdAt: 'desc' },
      })

      return NextResponse.json({
        data: attachments,
        meta: { count: attachments.length },
      })
    } catch (err) {
      if (err instanceof z.ZodError) {
        return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 })
      }
      logger.error({ err }, '[Medical Records Attachments GET] Error')
      return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
  })(request, { params })
}

// ============================================
// POST - Fazer upload de anexo
// ============================================

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(async (req, { params: authParams }) => {
    try {
      const recordId = recordIdSchema.parse(authParams.id || params.id)

      const record = await prisma.medicalRecord.findUnique({
        where: { id: recordId },
        select: { id: true },
      })

      if (!record) {
        return NextResponse.json({ error: 'Prontuário não encontrado' }, { status: 404 })
      }

      const formData = await req.formData()
      const file = formData.get('file') as File | null
      const description = formData.get('description') as string | null

      if (!file) {
        return NextResponse.json({ error: 'Arquivo não fornecido' }, { status: 400 })
      }

      const MAX_FILE_SIZE = 50 * 1024 * 1024
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `Arquivo muito grande. Máximo: ${MAX_FILE_SIZE / 1024 / 1024}MB` },
          { status: 413 }
        )
      }

      const ALLOWED_TYPES = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/tiff',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ]

      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json({ error: 'Tipo de arquivo não permitido' }, { status: 415 })
      }

      const uploadDir = join(process.cwd(), 'uploads', 'medical-records', recordId)
      const safeOriginalName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const storedFileName = `${Date.now()}-${safeOriginalName}`
      const absoluteFilePath = join(uploadDir, storedFileName)

      await mkdir(uploadDir, { recursive: true })

      const buffer = await file.arrayBuffer()
      await writeFile(absoluteFilePath, Buffer.from(buffer), { flag: 'w' })

      const attachment = await prisma.attachment.create({
        data: {
          medicalRecordId: recordId,
          fileName: storedFileName,
          originalName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          description: description || null,
          filePath: `/uploads/medical-records/${recordId}/${storedFileName}`,
        },
      })

      return NextResponse.json(
        { data: attachment, message: 'Arquivo enviado com sucesso' },
        { status: 201 }
      )
    } catch (err) {
      if (err instanceof z.ZodError) {
        return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 })
      }
      logger.error({ err }, '[Medical Records Attachments POST] Error')
      return NextResponse.json({ error: 'Erro ao fazer upload' }, { status: 500 })
    }
  })(request, { params })
}

// ============================================
// DELETE - Remover anexo
// ============================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(async (req, { params: authParams }) => {
    try {
      const recordId = recordIdSchema.parse(authParams.id || params.id)
      const { searchParams } = new URL(req.url)
      const attachmentIdRaw = searchParams.get('attachmentId')
      if (!attachmentIdRaw) {
        return NextResponse.json({ error: 'ID de anexo não fornecido' }, { status: 400 })
      }

      const attachmentId = recordIdSchema.parse(attachmentIdRaw)

      const attachment = await prisma.attachment.findUnique({
        where: { id: attachmentId },
        select: { id: true, medicalRecordId: true, filePath: true },
      })

      if (!attachment) {
        return NextResponse.json({ error: 'Anexo não encontrado' }, { status: 404 })
      }

      if (attachment.medicalRecordId !== recordId) {
        return NextResponse.json({ error: 'Anexo não pertence a este prontuário' }, { status: 400 })
      }

      if (attachment.filePath) {
        try {
          const relative = attachment.filePath.startsWith('/')
            ? attachment.filePath.slice(1)
            : attachment.filePath
          const absolute = join(process.cwd(), relative)
          await unlink(absolute)
        } catch (err) {
          logger.warn({ err }, 'Failed to delete file from storage')
        }
      }

      await prisma.attachment.delete({ where: { id: attachmentId } })

      return NextResponse.json({
        message: 'Anexo removido com sucesso',
        data: { id: attachmentId },
      })
    } catch (err) {
      if (err instanceof z.ZodError) {
        return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 })
      }
      logger.error({ err }, '[Medical Records Attachments DELETE] Error')
      return NextResponse.json({ error: 'Erro ao remover anexo' }, { status: 500 })
    }
  })(request, { params })
}
