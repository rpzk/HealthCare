/**
 * API para upload de assinatura digital
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const { consultationId, signatureDataUrl } = body

    if (!consultationId || !signatureDataUrl) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }

    // Verificar se a consulta existe
    const consultation = await prisma.consultation.findUnique({
      where: { id: consultationId },
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

    // Por enquanto, vamos armazenar a assinatura no campo notes da consulta
    // Em produção, crie uma tabela específica para assinaturas digitais
    const signatureType = consultation.patientId === session.user.id ? 'PATIENT' : 'DOCTOR'
    
    await prisma.consultation.update({
      where: { id: consultationId },
      data: {
        notes: `${consultation.notes || ''}\n\n[SIGNATURE_${signatureType}] ${signatureDataUrl.substring(0, 100)}...`,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Assinatura registrada com sucesso',
    })
  } catch (error: any) {
    console.error('Erro ao salvar assinatura:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao salvar assinatura' },
      { status: 500 }
    )
  }
}
