import { NextRequest, NextResponse } from 'next/server'
import { ConsultationService } from '@/lib/consultation-service'

// GET - Próximas consultas
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const doctorId = searchParams.get('doctorId') || undefined
    const limit = parseInt(searchParams.get('limit') || '5')

    const consultations = await ConsultationService.getUpcomingConsultations(doctorId, limit)

    return NextResponse.json({ consultations })
  } catch (error) {
    console.error('Erro ao buscar próximas consultas:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
