import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger'

// POST - Incrementar contador de uso do combo
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = await params;

    // Verificar se o combo existe
    const combo = await prisma.examCombo.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!combo) {
      return NextResponse.json({ error: 'Combo não encontrado' }, { status: 404 });
    }

    // Incrementar contador de uso
    await prisma.examCombo.update({
      where: { id },
      data: {
        usageCount: { increment: 1 },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Erro ao registrar uso do combo:', error);
    return NextResponse.json(
      { error: 'Erro ao registrar uso' },
      { status: 500 }
    );
  }
}
