import { NextRequest, NextResponse } from 'next/server'
import { ConsultationService } from '@/lib/consultation-service'
import { withAuth, AuthenticatedApiHandler } from '@/lib/with-auth'
import { auditLogger, AuditAction } from '@/lib/audit-logger'

// GET - Horários disponíveis para um médico em uma data
export const GET = withAuth(async (request: NextRequest, { user }) => {
  try {
    const { searchParams } = new URL(request.url)
    const doctorId = searchParams.get('doctorId')
    const date = searchParams.get('date')

    if (!doctorId || !date) {
      auditLogger.logError(
        user.id,
        user.email,
        user.role,
        AuditAction.CONSULTATION_READ,
        'Available Slots',
        'Parâmetros obrigatórios não fornecidos',
        { doctorId, date }
      )

      return NextResponse.json(
        { error: 'Parâmetros doctorId e date são obrigatórios' },
        { status: 400 }
      )
    }

    const targetDate = new Date(date)
    if (isNaN(targetDate.getTime())) {
      auditLogger.logError(
        user.id,
        user.email,
        user.role,
        AuditAction.CONSULTATION_READ,
        'Available Slots',
        'Data inválida fornecida',
        { doctorId, date }
      )

      return NextResponse.json(
        { error: 'Data inválida' },
        { status: 400 }
      )
    }

    // Não permitir datas no passado
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (targetDate < today) {
      auditLogger.logError(
        user.id,
        user.email,
        user.role,
        AuditAction.CONSULTATION_READ,
        'Available Slots',
        'Tentativa de agendar para data passada',
        { doctorId, date }
      )

      return NextResponse.json(
        { error: 'Não é possível agendar para datas passadas' },
        { status: 400 }
      )
    }

    const availableSlots = await ConsultationService.getAvailableSlots(doctorId, targetDate)

    auditLogger.logSuccess(
      user.id,
      user.email,
      user.role,
      AuditAction.CONSULTATION_READ,
      'Available Slots',
      { doctorId, date, slotsCount: availableSlots.length }
    )

    return NextResponse.json({ 
      date: targetDate.toISOString().split('T')[0],
      availableSlots: availableSlots.map(slot => ({
        time: slot.toISOString(),
        displayTime: slot.toLocaleTimeString('pt-BR', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })
      }))
    })

  } catch (error: any) {
    const { searchParams } = new URL(request.url)
    
    auditLogger.logError(
      user.id,
      user.email,
      user.role,
      AuditAction.CONSULTATION_READ,
      'Available Slots',
      error.message,
      { 
        doctorId: searchParams.get('doctorId'), 
        date: searchParams.get('date') 
      }
    )

    console.error('Erro ao buscar horários disponíveis:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}) as AuthenticatedApiHandler
