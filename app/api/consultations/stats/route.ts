export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { ConsultationService } from '@/lib/consultation-service-mock'
import { withAuth, AuthenticatedApiHandler } from '@/lib/with-auth'
import { auditLogger, AuditAction } from '@/lib/audit-logger'

// GET - Estatísticas de consultas
export const GET = withAuth(async (request: NextRequest, { user }) => {
  try {
    const { searchParams } = new URL(request.url)
    const doctorId = searchParams.get('doctorId') || undefined

  // Map optional doctorId into filters object
  const filters = doctorId ? { doctorId } : undefined
  const stats = await ConsultationService.getStats(filters)

    auditLogger.logSuccess(
      user.id,
      user.email,
      user.role,
      AuditAction.CONSULTATION_READ,
      'Consultation Stats',
      { doctorId: doctorId || 'all' }
    )

    return NextResponse.json({ stats })
  } catch (error: any) {
    const { searchParams } = new URL(request.url)
    
    auditLogger.logError(
      user.id,
      user.email,
      user.role,
      AuditAction.CONSULTATION_READ,
      'Consultation Stats',
      error.message,
      { doctorId: searchParams.get('doctorId') }
    )

    console.error('Erro ao buscar estatísticas de consultas:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}) as AuthenticatedApiHandler
