import { NextRequest, NextResponse } from 'next/server'
import { ConsultationService } from '@/lib/consultation-service'

// GET - Horários disponíveis para um médico em uma data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const doctorId = searchParams.get('doctorId')
    const date = searchParams.get('date')

    if (!doctorId || !date) {
      return NextResponse.json(
        { error: 'Parâmetros doctorId e date são obrigatórios' },
        { status: 400 }
      )
    }

    const targetDate = new Date(date)
    if (isNaN(targetDate.getTime())) {
      return NextResponse.json(
        { error: 'Data inválida' },
        { status: 400 }
      )
    }

    // Não permitir datas no passado
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (targetDate < today) {
      return NextResponse.json(
        { error: 'Não é possível agendar para datas passadas' },
        { status: 400 }
      )
    }

    const availableSlots = await ConsultationService.getAvailableSlots(doctorId, targetDate)

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

  } catch (error) {
    console.error('Erro ao buscar horários disponíveis:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
