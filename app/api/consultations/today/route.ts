export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { ConsultationService } from '@/lib/consultation-service'
import { withAuth, AuthenticatedApiHandler } from '@/lib/with-auth'
import { auditLogger, AuditAction } from '@/lib/audit-logger'

// GET - Consultas de hoje
export const GET = withAuth(async (request: NextRequest, { user }) => {
  try {
    const { searchParams } = new URL(request.url)
    const doctorId = searchParams.get('doctorId') || undefined

    const consultations = await ConsultationService.getTodayConsultations(doctorId)

    auditLogger.logSuccess(
      user.id,
      user.email,
      user.role,
      AuditAction.CONSULTATION_READ,
      'Today Consultations',
      { doctorId: doctorId || 'all', count: consultations.length }
    )

    return NextResponse.json({ consultations })
  } catch (error: any) {
    const { searchParams } = new URL(request.url)
    
    auditLogger.logError(
      user.id,
      user.email,
      user.role,
      AuditAction.CONSULTATION_READ,
      'Today Consultations',
      error.message,
      { doctorId: searchParams.get('doctorId') }
    )

    console.error('Erro ao buscar consultas de hoje:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}) as AuthenticatedApiHandler
