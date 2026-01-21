import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { BIService } from '@/lib/bi-service';
import { startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic';

/**
 * GET /api/bi/consultations-trend
 * Retorna tendência de consultas dos últimos 6 meses
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

    // Apenas ADMIN, MANAGER, DOCTOR
    if (!['ADMIN', 'MANAGER', 'DOCTOR'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      );
    }

    const trend = await BIService.getConsultationsLast6Months();

    return NextResponse.json(trend, { status: 200 });
  } catch (error) {
    logger.error('Erro ao buscar tendência de consultas:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar tendência' },
      { status: 500 }
    );
  }
}
