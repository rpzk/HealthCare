/**
 * API para cancelar uma consulta não finalizada
 * 
 * POST /api/consultations/[id]/cancel
 * 
 * Body:
 * - reason: string (motivo do cancelamento)
 * 
 * Regras:
 * - Apenas consultas NÃO finalizadas podem ser canceladas
 * - Registro de quem cancelou e quando
 * - Mantém dados para auditoria
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const { id } = params
    const body = await request.json()
    const { reason } = body

    if (!reason || reason.trim().length < 3) {
      return NextResponse.json(
        { error: 'Motivo do cancelamento é obrigatório (mínimo 3 caracteres)' },
        { status: 400 }
      )
    }

    // Buscar a consulta
    const consultation = await prisma.consultation.findUnique({
      where: { id },
      include: {
        patient: {
          select: { name: true }
        },
        doctor: {
          select: { name: true }
        }
      }
    })

    if (!consultation) {
      return NextResponse.json(
        { error: 'Consulta não encontrada' },
        { status: 404 }
      )
    }

    // Verificar se a consulta já está finalizada
    if (consultation.status === 'COMPLETED') {
      return NextResponse.json(
        { error: 'Consultas finalizadas não podem ser canceladas. Isso é necessário para manter a integridade dos registros médicos.' },
        { status: 400 }
      )
    }

    // Verificar se já está cancelada
    if (consultation.status === 'CANCELLED') {
      return NextResponse.json(
        { error: 'Esta consulta já foi cancelada' },
        { status: 400 }
      )
    }

    // Cancelar a consulta
    const updatedConsultation = await prisma.consultation.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        // Keep a cancellation trace in notes so we don't rely on non-existent schema fields
        notes: (consultation.notes || '') + `\n[CANCELLED by ${session.user.name || session.user.id} at ${new Date().toISOString()}] Reason: ${reason.trim()}`
      },
      include: {
        patient: {
          select: { id: true, name: true }
        },
        doctor: {
          select: { id: true, name: true }
        },
      }
    })

    // Log para auditoria
    console.log(`[AUDIT] Consulta ${id} cancelada por ${session.user.name} (${session.user.id}). Motivo: ${reason}`)

    return NextResponse.json({
      success: true,
      message: 'Consulta cancelada com sucesso',
      consultation: {
        id: updatedConsultation.id,
        status: updatedConsultation.status,
        // note: cancellation metadata preserved inside 'notes' field when schema lacks dedicated fields
        notes: updatedConsultation.notes,
        patient: updatedConsultation.patient,
        doctor: updatedConsultation.doctor
      }
    })

  } catch (error) {
    console.error('[Cancel Consultation] Error:', error)
    return NextResponse.json(
      { error: 'Erro ao cancelar consulta' },
      { status: 500 }
    )
  }
}
