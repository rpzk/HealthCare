import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { z } from 'zod'
import { writeFile, unlink } from 'fs/promises'
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
  try {
    const session = await withAuth(async () => ({}))
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const recordId = recordIdSchema.parse(params.id)

    // Verificar se prontuário existe
    const record = await prisma.medicalRecord.findUnique({
      where: { id: recordId },
      select: { id: true, patientId: true, doctorId: true },
    })

    if (!record) {
      return NextResponse.json({ error: 'Prontuário não encontrado' }, { status: 404 })
    }

    // Buscar anexos
    const attachments = await prisma.attachment.findMany({
      where: { medicalRecordId: recordId },
      select: {
        id: true,
        fileName: true,
        fileSize: true,
        mimeType: true,
        description: true,
        createdAt: true,
        createdBy: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({
      data: attachments,
      meta: { count: attachments.length }
    })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 })
    }
    logger.error({ err }, '[Medical Records Attachments GET] Error')
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// ============================================
// POST - Fazer upload de anexo
// ============================================

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await withAuth(async () => ({}))
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const recordId = recordIdSchema.parse(params.id)

    // Verificar se prontuário existe
    const record = await prisma.medicalRecord.findUnique({
      where: { id: recordId },
      select: { id: true, patientId: true, doctorId: true },
    })

    if (!record) {
      return NextResponse.json({ error: 'Prontuário não encontrado' }, { status: 404 })
    }

    // Parse multipart form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const description = formData.get('description') as string | null

    if (!file) {
      return NextResponse.json({ error: 'Arquivo não fornecido' }, { status: 400 })
    }

    // Validar tipo e tamanho
    const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
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
      return NextResponse.json(
        { error: 'Tipo de arquivo não permitido' },
        { status: 415 }
      )
    }

    // Salvar arquivo
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'medical-records')
    const fileName = `${Date.now()}-${file.name}`
    const filePath = join(uploadDir, fileName)

    const buffer = await file.arrayBuffer()
    await writeFile(filePath, Buffer.from(buffer))

    // Registrar no banco de dados
    const attachment = await prisma.attachment.create({
      data: {
        medicalRecordId: recordId,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        description: description || null,
        createdBy: { connect: { id: session.user?.id || '' } },
        storagePath: `/uploads/medical-records/${fileName}`,
      },
      include: {
        createdBy: { select: { id: true, name: true } }
      }
    })

    return NextResponse.json(
      {
        data: attachment,
        message: 'Arquivo enviado com sucesso'
      },
      { status: 201 }
    )
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 })
    }
    logger.error({ err }, '[Medical Records Attachments POST] Error')
    return NextResponse.json({ error: 'Erro ao fazer upload' }, { status: 500 })
  }
}

// ============================================
// DELETE - Remover anexo
// ============================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; attachmentId?: string } }
) {
  try {
    const session = await withAuth(async () => ({}))
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const recordId = recordIdSchema.parse(params.id)
    const attachmentId = params.attachmentId ? recordIdSchema.parse(params.attachmentId) : null

    if (!attachmentId) {
      return NextResponse.json({ error: 'ID de anexo não fornecido' }, { status: 400 })
    }

    // Buscar anexo
    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
      select: { id: true, medicalRecordId: true, storagePath: true, createdById: true }
    })

    if (!attachment) {
      return NextResponse.json({ error: 'Anexo não encontrado' }, { status: 404 })
    }

    if (attachment.medicalRecordId !== recordId) {
      return NextResponse.json({ error: 'Anexo não pertence a este prontuário' }, { status: 400 })
    }

    // Apenas criador ou admin pode deletar
    if (session.user?.id !== attachment.createdById && session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // Deletar arquivo do storage
    if (attachment.storagePath) {
      try {
        const filePath = join(process.cwd(), 'public', attachment.storagePath)
        await unlink(filePath)
      } catch (err) {
        logger.warn({ err }, 'Failed to delete file from storage')
      }
    }

    // Deletar do banco de dados
    await prisma.attachment.delete({
      where: { id: attachmentId }
    })

    return NextResponse.json({
      message: 'Anexo removido com sucesso',
      data: { id: attachmentId }
    })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 })
    }
    logger.error({ err }, '[Medical Records Attachments DELETE] Error')
    return NextResponse.json({ error: 'Erro ao remover anexo' }, { status: 500 })
  }
}
