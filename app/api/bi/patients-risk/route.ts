import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { BIService } from '@/lib/bi-service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/bi/patients-risk
 * Retorna distribuição de pacientes por nível de risco
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

    if (!['ADMIN', 'MANAGER', 'DOCTOR', 'NURSE'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      );
    }

    const patientsByRisk = await BIService.getPatientsByRisk();

    return NextResponse.json(patientsByRisk, { status: 200 });
  } catch (error) {
    console.error('Erro ao buscar pacientes por risco:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar estatísticas' },
      { status: 500 }
    );
  }
}
