/**
 * API para upload e listagem de gravações de teleconsultas
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { RecordingService } from '@/lib/recording-service'
import prisma from '@/lib/prisma'
import { getAudienceForRole, assertUserAcceptedTerms, TermsNotAcceptedError, TermsNotConfiguredError } from '@/lib/terms-enforcement'

export const runtime = 'nodejs'
export const maxDuration = 300 // 5 minutos para upload

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    try {
      await assertUserAcceptedTerms({
        prisma,
        userId: session.user.id,
        audience: getAudienceForRole(session.user.role),
        gates: ['TELEMEDICINE', 'RECORDING'],
      })
    } catch (e) {
      if (e instanceof TermsNotAcceptedError) {
        return NextResponse.json(
          {
            error: e.message,
            code: e.code,
            missing: e.missingTerms.map((t) => ({ id: t.id, slug: t.slug, title: t.title, audience: t.audience })),
          },
          { status: 403 }
        )
      }
      if (e instanceof TermsNotConfiguredError) {
        return NextResponse.json(
          { error: e.message, code: e.code, missing: e.missing },
          { status: 503 }
        )
      }
      throw e
    }

    const formData = await request.formData()
    const videoFile = formData.get('video') as File
    const consultationId = formData.get('consultationId') as string
    const duration = parseInt(formData.get('duration') as string)
    const startedAt = new Date(formData.get('startedAt') as string)
    const endedAt = new Date(formData.get('endedAt') as string)

    if (!videoFile || !consultationId || !duration) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }

    const videoBuffer = Buffer.from(await videoFile.arrayBuffer())

    const recording = await RecordingService.createRecording(
      videoBuffer,
      {
        consultationId,
        duration,
        fileSize: videoFile.size,
        format: videoFile.type.split('/')[1] || 'webm',
        startedAt,
        endedAt,
      },
      session.user.id
    )

    return NextResponse.json({
      success: true,
      recording,
    })
  } catch (error: any) {
    console.error('Erro ao criar gravação:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao processar gravação' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    try {
      await assertUserAcceptedTerms({
        prisma,
        userId: session.user.id,
        audience: getAudienceForRole(session.user.role),
        gates: ['TELEMEDICINE', 'RECORDING'],
      })
    } catch (e) {
      if (e instanceof TermsNotAcceptedError) {
        return NextResponse.json(
          {
            error: e.message,
            code: e.code,
            missing: e.missingTerms.map((t) => ({ id: t.id, slug: t.slug, title: t.title, audience: t.audience })),
          },
          { status: 403 }
        )
      }
      if (e instanceof TermsNotConfiguredError) {
        return NextResponse.json(
          { error: e.message, code: e.code, missing: e.missing },
          { status: 503 }
        )
      }
      throw e
    }

    const { searchParams } = new URL(request.url)
    const consultationId = searchParams.get('consultationId')

    if (!consultationId) {
      return NextResponse.json({ error: 'consultationId obrigatório' }, { status: 400 })
    }

    const recordings = await RecordingService.listConsultationRecordings(consultationId)

    return NextResponse.json({
      success: true,
      recordings,
    })
  } catch (error: any) {
    console.error('Erro ao listar gravações:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao listar gravações' },
      { status: 500 }
    )
  }
}
