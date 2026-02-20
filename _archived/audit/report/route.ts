import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { advancedAuditService } from '@/lib/advanced-audit-service';
import { startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

/**
 * GET /api/audit/report
 * Relatório de auditoria (apenas ADMIN)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'month';

    let startDate: Date;
    let endDate: Date;

    switch (period) {
      case 'week':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        endDate = new Date();
        break;
      case 'month':
        startDate = startOfMonth(new Date());
        endDate = endOfMonth(new Date());
        break;
      case 'quarter':
        startDate = startOfMonth(subMonths(new Date(), 3));
        endDate = endOfMonth(new Date());
        break;
      default:
        startDate = startOfMonth(new Date());
        endDate = endOfMonth(new Date());
    }

    const report = await advancedAuditService.getAuditReport(startDate, endDate);

    return NextResponse.json(report, { status: 200 });
  } catch (error) {
    logger.error('[Audit] Erro ao gerar relatório:', error);
    return NextResponse.json(
      { error: 'Erro ao gerar relatório' },
      { status: 500 }
    );
  }
}
