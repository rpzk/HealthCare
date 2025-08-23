import { NextRequest, NextResponse } from 'next/server'
import { DashboardService } from '../../../lib/dashboard-service'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const section = searchParams.get('section')

    switch (section) {
      case 'stats':
        const stats = await DashboardService.getStats()
        return NextResponse.json(stats)

      case 'appointments':
        const appointments = await DashboardService.getUpcomingAppointments()
        return NextResponse.json(appointments)

      case 'patients':
        const patients = await DashboardService.getRecentPatients()
        return NextResponse.json(patients)

      case 'all':
      default:
        const [allStats, allAppointments, allPatients] = await Promise.all([
          DashboardService.getStats(),
          DashboardService.getUpcomingAppointments(),
          DashboardService.getRecentPatients()
        ])

        return NextResponse.json({
          stats: allStats,
          appointments: allAppointments,
          patients: allPatients
        })
    }
  } catch (error) {
    console.error('Erro na API do dashboard:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
