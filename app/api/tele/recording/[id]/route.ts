/**
 * API para obter URL de reprodução e excluir gravação específica
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { RecordingService } from '@/lib/recording-service'
import prisma from '@/lib/prisma'
import { getAudienceForRole, assertUserAcceptedTerms } from '@/lib/terms-enforcement'
import { termsEnforcementErrorResponse } from '@/lib/terms-http'

export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
      const res = termsEnforcementErrorResponse(e)
      if (res) return res
      throw e
    }

    const url = await RecordingService.getRecordingUrl(
      params.id,
      session.user.id,
      session.user.role || 'PATIENT'
    )

    return NextResponse.json({
      success: true,
      url,
    })
  } catch (error: any) {
    console.error('Erro ao obter URL:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao obter gravação' },
      { status: error.message === 'Acesso negado' ? 403 : 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
      const res = termsEnforcementErrorResponse(e)
      if (res) return res
      throw e
    }

    await RecordingService.deleteRecording(
      params.id,
      session.user.id,
      session.user.role || 'PATIENT'
    )

    return NextResponse.json({
      success: true,
    })
  } catch (error: any) {
    console.error('Erro ao excluir gravação:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao excluir gravação' },
      { status: error.message === 'Acesso negado' ? 403 : 500 }
    )
  }
}
