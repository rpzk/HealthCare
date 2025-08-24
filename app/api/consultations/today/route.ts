import { NextRequest, NextResponse } from 'next/server'
import { ConsultationService } from '@/lib/consultation-service'

// GET - Consultas de hoje
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const doctorId = searchParams.get('doctorId') || undefined

    const consultations = await ConsultationService.getTodayConsultations(doctorId)

    return NextResponse.json({ consultations })
  } catch (error) {
    console.error('Erro ao buscar consultas de hoje:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
