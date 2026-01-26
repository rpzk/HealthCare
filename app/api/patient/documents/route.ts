import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'

export const POST = withAuth(async (req: NextRequest, { user }) => {
  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { patientId: true, email: true },
    })

    const patientIdFromUser = dbUser?.patientId ?? null
    const patient = patientIdFromUser
      ? await prisma.patient.findUnique({ where: { id: patientIdFromUser }, select: { id: true, name: true } })
      : await prisma.patient.findFirst({ where: { email: dbUser?.email ?? user.email }, select: { id: true, name: true } })

    if (!patient) {
      return NextResponse.json({ error: 'Registro de paciente não encontrado' }, { status: 404 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File
    const description = formData.get('description') as string || ''

    if (!file) {
      return NextResponse.json({ error: 'Arquivo não fornecido' }, { status: 400 })
    }

    // Validate file type (only PDFs, images, and common document types)
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipo de arquivo não permitido. Envie PDF, imagens ou documentos Word.' },
        { status: 400 }
      )
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'Arquivo muito grande. Tamanho máximo: 10MB' },
        { status: 400 }
      )
    }

    // Create upload directory if it doesn't exist
    const uploadDir = join(process.cwd(), 'uploads', 'patient-documents', patient.id)
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const originalName = file.name
    const extension = originalName.split('.').pop()
    const fileName = `${timestamp}-${originalName.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    const filePath = join(uploadDir, fileName)

    // Save file
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // Create database record
    const attachment = await prisma.attachment.create({
      data: {
        fileName,
        originalName,
        fileSize: file.size,
        mimeType: file.type,
        filePath: `/uploads/patient-documents/${patient.id}/${fileName}`,
        description,
        patientId: patient.id
      }
    })

    // Create notification for doctor/admin
    const adminUsers = await prisma.user.findMany({
      where: {
        role: { in: ['ADMIN', 'DOCTOR'] },
        isActive: true
      },
      select: { id: true }
    })

    await Promise.all(
      adminUsers.map(admin =>
        prisma.notification.create({
          data: {
            userId: admin.id,
            type: 'SYSTEM',
            title: 'Novo documento enviado',
            message: `${patient.name} enviou um novo documento: ${originalName}`,
            priority: 'LOW'
          }
        })
      )
    )

    return NextResponse.json({
      message: 'Documento enviado com sucesso',
      attachment: {
        id: attachment.id,
        fileName: attachment.originalName,
        fileSize: attachment.fileSize,
        uploadedAt: attachment.createdAt
      }
    }, { status: 201 })
  } catch (error) {
    logger.error({ err: error }, 'Error uploading document')
    return NextResponse.json(
      { error: 'Erro ao fazer upload do documento' },
      { status: 500 }
    )
  }
})

// GET patient's uploaded documents
export const GET = withAuth(async (req: NextRequest, { user }) => {
  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { patientId: true, email: true },
    })

    const patientIdFromUser = dbUser?.patientId ?? null
    const patient = patientIdFromUser
      ? await prisma.patient.findUnique({ where: { id: patientIdFromUser }, select: { id: true } })
      : await prisma.patient.findFirst({ where: { email: dbUser?.email ?? user.email }, select: { id: true } })

    if (!patient) {
      return NextResponse.json({ error: 'Registro de paciente não encontrado' }, { status: 404 })
    }

    const documents = await prisma.attachment.findMany({
      where: { patientId: patient.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        fileName: true,
        originalName: true,
        fileSize: true,
        mimeType: true,
        description: true,
        createdAt: true,
        filePath: true
      }
    })

    return NextResponse.json({ data: documents })
  } catch (error) {
    logger.error({ err: error }, 'Error fetching documents')
    return NextResponse.json(
      { error: 'Erro ao buscar documentos' },
      { status: 500 }
    )
  }
})
