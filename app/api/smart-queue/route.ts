/**
 * API: Smart Queue (Fila de Espera Inteligente)
 * 
 * Endpoints:
 * - GET: Lista fila atual com posição e tempo estimado
 * - POST: Adiciona paciente à fila
 * - PATCH: Chama próximo ou atualiza status
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { SmartQueueService } from '@/lib/smart-queue-service'
import { z } from 'zod'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'

// Schema de validação
const addToQueueSchema = z.object({
  patientId: z.string().min(1),
  doctorId: z.string().optional(),
  specialty: z.string().optional(),
  priority: z.number().min(1).max(4).optional(),
  notes: z.string().optional()
})

const callNextSchema = z.object({
  action: z.literal('call_next'),
  doctorId: z.string().optional(),
  specialty: z.string().optional(),
  roomName: z.string().min(1)
})

const updateStatusSchema = z.object({
  action: z.enum(['in_progress', 'no_show', 'complete']),
  entryId: z.string().min(1)
})

// Roles permitidas
const ALLOWED_ROLES = [
  'ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'TECHNICIAN',
  'DENTIST', 'PHYSIOTHERAPIST', 'PSYCHOLOGIST', 'NUTRITIONIST'
]

/**
 * GET /api/smart-queue
 * Lista fila atual com estatísticas
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const doctorId = searchParams.get('doctorId') || undefined
    const specialty = searchParams.get('specialty') || undefined

    // Obter fila e estatísticas em paralelo
    const [queue, stats] = await Promise.all([
      SmartQueueService.getQueue({ doctorId, specialty }),
      SmartQueueService.getQueueStats(doctorId, specialty)
    ])

    return NextResponse.json({
      success: true,
      queue,
      stats,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    logger.error('[SmartQueue GET]', error)
    return NextResponse.json(
      { error: 'Erro ao obter fila' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/smart-queue
 * Adiciona paciente à fila
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    if (!ALLOWED_ROLES.includes(session.user.role as string)) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const body = await request.json()
    const data = addToQueueSchema.parse(body)

    const entry = await SmartQueueService.addToQueue({
      patientId: data.patientId,
      doctorId: data.doctorId,
      specialty: data.specialty,
      priority: data.priority,
      notes: data.notes
    })

    return NextResponse.json({
      success: true,
      entry,
      message: `Senha ${entry.ticketNumber} gerada. Posição: ${entry.position}`
    }, { status: 201 })
  } catch (error) {
    logger.error('[SmartQueue POST]', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: (error as Error).message || 'Erro ao adicionar à fila' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/smart-queue
 * Chama próximo ou atualiza status
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    if (!ALLOWED_ROLES.includes(session.user.role as string)) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const body = await request.json()

    // Chamar próximo
    if (body.action === 'call_next') {
      const data = callNextSchema.parse(body)
      
      const entry = await SmartQueueService.callNext({
        doctorId: data.doctorId,
        specialty: data.specialty,
        roomName: data.roomName,
        calledBy: session.user.id!
      })

      if (!entry) {
        return NextResponse.json({
          success: false,
          message: 'Nenhum paciente na fila'
        })
      }

      return NextResponse.json({
        success: true,
        entry,
        message: `Paciente ${entry.patientName} chamado para ${data.roomName}`
      })
    }

    // Atualizar status
    const data = updateStatusSchema.parse(body)

    switch (data.action) {
      case 'in_progress':
        await SmartQueueService.markAsInProgress(data.entryId)
        return NextResponse.json({ success: true, message: 'Atendimento iniciado' })
      
      case 'no_show':
        await SmartQueueService.markAsNoShow(data.entryId)
        return NextResponse.json({ success: true, message: 'Marcado como não compareceu' })
      
      case 'complete':
        // Completar atendimento (marcar como SCHEDULED que é proxy para completado)
        await SmartQueueService.markAsInProgress(data.entryId)
        return NextResponse.json({ success: true, message: 'Atendimento concluído' })
      
      default:
        return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
    }
  } catch (error) {
    logger.error('[SmartQueue PATCH]', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: (error as Error).message || 'Erro ao processar ação' },
      { status: 500 }
    )
  }
}
