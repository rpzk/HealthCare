export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { DashboardService } from '@/lib/dashboard-service'
import { auditLogger, AuditAction } from '@/lib/audit-logger'

// GET - Dados do dashboard (usuários autenticados)
export const GET = withAuth(async (request, { user }) => {
  const { searchParams } = new URL(request.url)
  const section = searchParams.get('section')

  let data: any
  let actionDescription = ''

  switch (section) {
    case 'stats':
      actionDescription = 'Estatísticas gerais do dashboard'
      data = await DashboardService.getStats()
      break

    case 'appointments':
      actionDescription = 'Consultas próximas'
      data = await DashboardService.getUpcomingAppointments()
      break

    case 'patients':
      actionDescription = 'Pacientes recentes'
      data = await DashboardService.getRecentPatients()
      break

    case 'all':
    default:
      actionDescription = 'Dashboard completo'
      try {
        const [allStats, allAppointments, allPatients] = await Promise.all([
          DashboardService.getStats(),
          DashboardService.getUpcomingAppointments(),
          DashboardService.getRecentPatients()
        ])

        data = {
          stats: allStats,
          appointments: allAppointments,
          patients: allPatients
        }
      } catch (error: any) {
        console.error('[API] Dashboard error:', error);
        return NextResponse.json(
          { success: false, error: error.message || 'Internal Server Error', details: error.stack },
          { status: 500 }
        );
      }
      break
  }

  // Log de auditoria
  auditLogger.logSuccess(
    user.id,
    user.email,
    user.role,
    AuditAction.DATA_EXPORT,
    'dashboard',
    {
      section: section || 'all',
      actionDescription,
      dataSize: JSON.stringify(data).length
    }
  )

  return NextResponse.json({
    success: true,
    data,
    metadata: {
      section: section || 'all',
      retrievedAt: new Date().toISOString(),
      retrievedBy: user.email,
      userRole: user.role
    }
  })
})
