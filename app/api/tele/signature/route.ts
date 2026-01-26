/**
 * API para registrar assinatura manuscrita (imagem) na teleconsulta
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { mkdir, writeFile } from 'fs/promises'
import { join, resolve } from 'path'
import crypto from 'crypto'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const consultationId = searchParams.get('consultationId')
    const signatureId = searchParams.get('id')
    const download = searchParams.get('download') === '1'

    if (!consultationId) {
      return NextResponse.json({ error: 'consultationId é obrigatório' }, { status: 400 })
    }

    const consultation = await prisma.consultation.findUnique({
      where: { id: consultationId },
      select: { id: true, patientId: true, doctorId: true },
    })

    if (!consultation) {
      return NextResponse.json({ error: 'Consulta não encontrada' }, { status: 404 })
    }

    const isAuthorized =
      consultation.patientId === session.user.id ||
      consultation.doctorId === session.user.id

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    if (signatureId && download) {
      const record = await prisma.teleconsultationSignature.findFirst({
        where: {
          id: signatureId,
          consultationId: consultation.id,
        },
        select: {
          id: true,
          filePath: true,
          mimeType: true,
        },
      })

      if (!record) {
        return NextResponse.json({ error: 'Assinatura não encontrada' }, { status: 404 })
      }

      const relativePath = record.filePath.startsWith('/')
        ? record.filePath.slice(1)
        : record.filePath

      const uploadsRoot = resolve(process.cwd(), 'uploads')
      const absolutePath = resolve(process.cwd(), relativePath)

      if (!absolutePath.startsWith(uploadsRoot + '/')) {
        return NextResponse.json({ error: 'Caminho de arquivo inválido' }, { status: 400 })
      }

      const fileBuffer = await (await import('fs/promises')).readFile(absolutePath)
      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          'Content-Type': record.mimeType || 'application/octet-stream',
          'Content-Disposition': `inline; filename="${record.id}.png"`,
          'Cache-Control': 'private, max-age=0, must-revalidate',
        },
      })
    }

    const signatures = await prisma.teleconsultationSignature.findMany({
      where: { consultationId: consultation.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        consultationId: true,
        signerId: true,
        signerRole: true,
        mimeType: true,
        filePath: true,
        fileSize: true,
        sha256: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ data: signatures })
  } catch (error: any) {
    logger.error('Erro ao listar assinaturas:', error)
    return NextResponse.json(
      { error: error?.message || 'Erro ao listar assinaturas' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const contentType = request.headers.get('content-type') || ''

    let consultationId: string | null = null
    let signatureFile: File | null = null
    let signatureDataUrl: string | null = null

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      consultationId = (formData.get('consultationId') as string | null) ?? null
      signatureFile = (formData.get('signature') || formData.get('file')) as File | null
    } else {
      const body = await request.json()
      consultationId = body?.consultationId ?? null
      signatureDataUrl = body?.signatureDataUrl ?? null
    }

    if (!consultationId || (!signatureFile && !signatureDataUrl)) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }

    // Verificar se a consulta existe
    const consultation = await prisma.consultation.findUnique({
      where: { id: consultationId },
      select: {
        id: true,
        patientId: true,
        doctorId: true,
      },
    })

    if (!consultation) {
      return NextResponse.json({ error: 'Consulta não encontrada' }, { status: 404 })
    }

    // Verificar se o usuário é paciente ou médico da consulta
    const isAuthorized =
      consultation.patientId === session.user.id ||
      consultation.doctorId === session.user.id

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const signerRole = consultation.patientId === session.user.id ? 'PATIENT' : 'DOCTOR'

    const MAX_FILE_SIZE = 1024 * 1024
    const allowedTypes = ['image/png']

    let buffer: Buffer
    let mimeType: string

    if (signatureFile) {
      if (signatureFile.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `Arquivo muito grande. Máximo: ${MAX_FILE_SIZE / 1024}KB` },
          { status: 413 }
        )
      }
      if (!allowedTypes.includes(signatureFile.type)) {
        return NextResponse.json(
          { error: 'Tipo de arquivo não permitido. Envie PNG.' },
          { status: 415 }
        )
      }
      mimeType = signatureFile.type
      buffer = Buffer.from(await signatureFile.arrayBuffer())
    } else {
      if (!String(signatureDataUrl).startsWith('data:image/')) {
        return NextResponse.json({ error: 'Assinatura inválida' }, { status: 400 })
      }
      const match = String(signatureDataUrl).match(/^data:([^;]+);base64,(.+)$/)
      if (!match) {
        return NextResponse.json({ error: 'Assinatura inválida' }, { status: 400 })
      }
      mimeType = match[1]
      if (!allowedTypes.includes(mimeType)) {
        return NextResponse.json(
          { error: 'Tipo de assinatura não permitido. Envie PNG.' },
          { status: 415 }
        )
      }
      buffer = Buffer.from(match[2], 'base64')
      if (buffer.length > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `Assinatura muito grande. Máximo: ${MAX_FILE_SIZE / 1024}KB` },
          { status: 413 }
        )
      }
    }

    const sha256 = crypto.createHash('sha256').update(buffer).digest('hex')

    const uploadDir = join(process.cwd(), 'uploads', 'teleconsultations', consultation.id, 'signatures')
    await mkdir(uploadDir, { recursive: true })

    const fileName = `signature-${signerRole.toLowerCase()}-${Date.now()}.png`
    const absolutePath = join(uploadDir, fileName)
    await writeFile(absolutePath, buffer, { flag: 'w' })

    const publicPath = `/uploads/teleconsultations/${consultation.id}/signatures/${fileName}`

    const record = await prisma.teleconsultationSignature.create({
      data: {
        consultationId: consultation.id,
        signerId: session.user.id,
        signerRole,
        mimeType,
        filePath: publicPath,
        fileSize: buffer.length,
        sha256,
      },
      select: {
        id: true,
        consultationId: true,
        signerId: true,
        signerRole: true,
        mimeType: true,
        filePath: true,
        fileSize: true,
        sha256: true,
        createdAt: true,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Assinatura registrada com sucesso',
      signature: record,
    })
  } catch (error: any) {
    logger.error('Erro ao salvar assinatura:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao salvar assinatura' },
      { status: 500 }
    )
  }
}
