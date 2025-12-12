import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { BIService } from '@/lib/bi-service';

/**
 * GET /api/bi/dashboard
 * Retorna dashboard completo de BI para gestores
 * 
 * Query params:
 * - period: 'today' | 'week' | 'month' (default: 'month')
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

    // Apenas ADMIN e MANAGER podem acessar
    if (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER') {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas gestores podem acessar o dashboard de BI.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const period = (searchParams.get('period') || 'month') as 'today' | 'week' | 'month';

    const dashboard = await BIService.getDashboardOverview(period);

    return NextResponse.json(dashboard, { status: 200 });
  } catch (error) {
    console.error('Erro ao buscar dashboard BI:', error);
    return NextResponse.json(
      { error: 'Erro ao gerar dashboard' },
      { status: 500 }
    );
  }
}
