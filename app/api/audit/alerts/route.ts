export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { advancedAuditService } from '@/lib/advanced-audit-service';
import { logger } from '@/lib/logger'

/**
 * GET /api/audit/alerts
 * Lista alertas de auditoria (apenas ADMIN)
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
    const severity = searchParams.get('severity') as any;
    const alertType = searchParams.get('alertType') as any;

    const alerts = await advancedAuditService.getActiveAlerts({
      ...(severity && { severity }),
      ...(alertType && { alertType })
    });

    return NextResponse.json(alerts, { status: 200 });
  } catch (error) {
    logger.error('[Audit] Erro ao listar alertas:', error);
    return NextResponse.json(
      { error: 'Erro ao listar alertas' },
      { status: 500 }
    );
  }
}
