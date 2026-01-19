export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import { ConsultationService } from '@/lib/consultation-service-mock'
import { withAuth, AuthenticatedApiHandler } from '@/lib/with-auth'
import { auditLogger, AuditAction } from '@/lib/audit-logger'

// GET - Próximas consultas
export const GET = withAuth(async (request, { user }) => {
  try {
    const { searchParams } = new URL(request.url)
    const doctorId = searchParams.get('doctorId') || undefined
    const limit = parseInt(searchParams.get('limit') || '5')

    const consultations = await ConsultationService.getUpcomingConsultations(doctorId, limit)

    auditLogger.logSuccess(
      user.id,
      user.email,
      user.role,
      AuditAction.CONSULTATION_READ,
      'Upcoming Consultations',
      { doctorId: doctorId || 'all', limit, count: consultations.length }
    )

    return NextResponse.json({ consultations })
  } catch (error: any) {
    const { searchParams } = new URL(request.url)
    
    auditLogger.logError(
      user.id,
      user.email,
      user.role,
      AuditAction.CONSULTATION_READ,
      'Upcoming Consultations',
      error.message,
      { doctorId: searchParams.get('doctorId') }
    )

    console.error('Erro ao buscar próximas consultas:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}) as AuthenticatedApiHandler
