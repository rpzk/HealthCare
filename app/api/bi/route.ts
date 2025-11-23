import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { BIService } from '@/lib/bi-service'

export const GET = withAuth(async (req, { user }) => {
  // Only ADMIN or MANAGER roles should access BI
  if (user.role !== 'ADMIN') {
    return new NextResponse('Unauthorized', { status: 403 })
  }

  try {
    const [metrics, riskDistribution, consultationHistory] = await Promise.all([
      BIService.getKeyMetrics(),
      BIService.getPatientsByRisk(),
      BIService.getConsultationsLast6Months()
    ])

    return NextResponse.json({
      metrics,
      riskDistribution,
      consultationHistory
    })
  } catch (error) {
    console.error('[BI_API_ERROR]', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
})
