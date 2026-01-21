import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic';

// GET - Autocomplete de combos de exames
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query') || '';
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (query.length < 1) {
      // Retornar combos mais usados se não houver busca
      const popularCombos = await prisma.examCombo.findMany({
        where: {
          isActive: true,
          OR: [
            { isPublic: true },
            { createdById: session.user.id },
          ],
        },
        select: {
          id: true,
          name: true,
          description: true,
          category: true,
          usageCount: true,
          items: {
            select: {
              exam: {
                select: {
                  id: true,
                  name: true,
                  abbreviation: true,
                  examCategory: true,
                },
              },
            },
            orderBy: { order: 'asc' },
          },
        },
        orderBy: { usageCount: 'desc' },
        take: limit,
      });

      return NextResponse.json(popularCombos);
    }

    const where: any = {
      isActive: true,
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
      ],
      AND: [
        {
          OR: [
            { isPublic: true },
            { createdById: session.user.id },
          ],
        },
      ],
    };

    if (category) {
      where.category = category;
    }

    const combos = await prisma.examCombo.findMany({
      where,
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
        usageCount: true,
        items: {
          select: {
            exam: {
              select: {
                id: true,
                name: true,
                abbreviation: true,
                examCategory: true,
              },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: [
        { usageCount: 'desc' },
        { name: 'asc' },
      ],
      take: limit,
    });

    return NextResponse.json(combos);
  } catch (error) {
    logger.error('Erro no autocomplete de combos:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar combos' },
      { status: 500 }
    );
  }
}
