import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// POST - Seed questões iniciais (apenas ADMIN)
// Observação: endpoint mantido por compatibilidade, mas o "seed" automático foi desabilitado
// para evitar inserir dados não verificados. Cadastre questões reais via /api/stratum/questions.
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  return NextResponse.json(
    {
      error: 'Seed desabilitado. Cadastre questões reais via POST /api/stratum/questions (ADMIN) ou use a avaliação rápida (Time Span).'
    },
    { status: 400 }
  )
}
