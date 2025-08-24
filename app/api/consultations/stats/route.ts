import { NextRequest, NextResponse } from 'next/server'
import { ConsultationService } from '@/lib/consultation-service'

// GET - Estatísticas de consultas
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const doctorId = searchParams.get('doctorId') || undefined

    const stats = await ConsultationService.getStats(doctorId)

    return NextResponse.json({ stats })
  } catch (error) {
    console.error('Erro ao buscar estatísticas de consultas:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
