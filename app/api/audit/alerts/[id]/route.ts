import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { advancedAuditService } from '@/lib/advanced-audit-service';

/**
 * PATCH /api/audit/alerts/[id]
 * Resolver ou marcar alerta como falso positivo
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const body = await request.json();
    const { action, notes } = body; // action: 'resolve' | 'false_positive'

    if (!action || !notes) {
      return NextResponse.json(
        { error: 'Ação e notas são obrigatórios' },
        { status: 400 }
      );
    }

    let result;
    if (action === 'resolve') {
      result = await advancedAuditService.resolveAlert(params.id, session.user.id, notes);
    } else if (action === 'false_positive') {
      result = await advancedAuditService.markFalsePositive(params.id, session.user.id, notes);
    } else {
      return NextResponse.json(
        { error: 'Ação inválida' },
        { status: 400 }
      );
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('[Audit] Erro ao atualizar alerta:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar alerta' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/audit/alerts/[id]
 * Detalhes de alerta com audit logs relacionados
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      );
    }

    const details = await advancedAuditService.getAlertDetails(params.id);

    if (!details) {
      return NextResponse.json(
        { error: 'Alerta não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(details, { status: 200 });
  } catch (error) {
    console.error('[Audit] Erro ao buscar detalhes:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar detalhes' },
      { status: 500 }
    );
  }
}
