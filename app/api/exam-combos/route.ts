import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Schema de validação para criar/editar combo
const ExamComboSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  description: z.string().optional(),
  category: z.enum([
    'LABORATORY', 'RADIOLOGY', 'ECG', 'PHYSIOTHERAPY', 'APAC',
    'CYTOPATHOLOGY', 'MAMMOGRAPHY', 'ULTRASOUND', 'LAB_ALTERNATIVE',
    'RAD_ALTERNATIVE', 'OTHER_1', 'OTHER_2'
  ]).optional().nullable(),
  isActive: z.boolean().optional().default(true),
  isPublic: z.boolean().optional().default(true),
  items: z.array(z.object({
    examId: z.string(),
    order: z.number().optional().default(0),
    notes: z.string().optional(),
    isRequired: z.boolean().optional().default(true),
  })).min(1, 'O combo deve ter pelo menos um exame'),
});

// GET - Listar combos de exames
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category');
    const activeOnly = searchParams.get('activeOnly') !== 'false';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const where: any = {};

    // Filtro de busca
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Filtro de categoria
    if (category) {
      where.category = category;
    }

    // Filtro de ativos
    if (activeOnly) {
      where.isActive = true;
    }

    // Filtro de público (ou criado pelo usuário)
    where.OR = [
      ...(where.OR || []),
      { isPublic: true },
      { createdById: session.user.id },
    ];

    const [combos, total] = await Promise.all([
      prisma.examCombo.findMany({
        where,
        include: {
          items: {
            include: {
              exam: {
                select: {
                  id: true,
                  name: true,
                  abbreviation: true,
                  examCategory: true,
                  preparation: true,
                },
              },
            },
            orderBy: { order: 'asc' },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: [
          { usageCount: 'desc' },
          { name: 'asc' },
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.examCombo.count({ where }),
    ]);

    return NextResponse.json({
      combos,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Erro ao listar combos de exames:', error);
    return NextResponse.json(
      { error: 'Erro ao listar combos de exames' },
      { status: 500 }
    );
  }
}

// POST - Criar novo combo de exames
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = ExamComboSchema.parse(body);

    // Verificar se os exames existem
    const examIds = validatedData.items.map(item => item.examId);
    const existingExams = await prisma.examCatalog.findMany({
      where: { id: { in: examIds } },
      select: { id: true },
    });

    if (existingExams.length !== examIds.length) {
      return NextResponse.json(
        { error: 'Um ou mais exames não foram encontrados' },
        { status: 400 }
      );
    }

    // Verificar se já existe combo com o mesmo nome
    const existingCombo = await prisma.examCombo.findFirst({
      where: { name: validatedData.name },
    });

    if (existingCombo) {
      return NextResponse.json(
        { error: 'Já existe um combo com este nome' },
        { status: 400 }
      );
    }

    // Criar o combo
    const combo = await prisma.examCombo.create({
      data: {
        name: validatedData.name,
        description: validatedData.description,
        category: validatedData.category,
        isActive: validatedData.isActive,
        isPublic: validatedData.isPublic,
        createdById: session.user.id,
        items: {
          create: validatedData.items.map((item, index) => ({
            examId: item.examId,
            order: item.order ?? index,
            notes: item.notes,
            isRequired: item.isRequired ?? true,
          })),
        },
      },
      include: {
        items: {
          include: {
            exam: {
              select: {
                id: true,
                name: true,
                abbreviation: true,
                examCategory: true,
                preparation: true,
              },
            },
          },
          orderBy: { order: 'asc' },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(combo, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Erro ao criar combo de exames:', error);
    return NextResponse.json(
      { error: 'Erro ao criar combo de exames' },
      { status: 500 }
    );
  }
}
