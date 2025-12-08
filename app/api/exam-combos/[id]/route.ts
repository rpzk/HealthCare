import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Schema de validação para editar combo
const UpdateExamComboSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').optional(),
  description: z.string().optional().nullable(),
  category: z.enum([
    'LABORATORY', 'RADIOLOGY', 'ECG', 'PHYSIOTHERAPY', 'APAC',
    'CYTOPATHOLOGY', 'MAMMOGRAPHY', 'ULTRASOUND', 'LAB_ALTERNATIVE',
    'RAD_ALTERNATIVE', 'OTHER_1', 'OTHER_2'
  ]).optional().nullable(),
  isActive: z.boolean().optional(),
  isPublic: z.boolean().optional(),
  items: z.array(z.object({
    examId: z.string(),
    order: z.number().optional().default(0),
    notes: z.string().optional().nullable(),
    isRequired: z.boolean().optional().default(true),
  })).optional(),
});

// GET - Obter combo específico
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = await params;

    const combo = await prisma.examCombo.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            exam: {
              select: {
                id: true,
                name: true,
                abbreviation: true,
                description: true,
                examCategory: true,
                preparation: true,
                minAge: true,
                maxAge: true,
                sexRestriction: true,
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

    if (!combo) {
      return NextResponse.json({ error: 'Combo não encontrado' }, { status: 404 });
    }

    // Verificar permissão (público ou criado pelo usuário)
    if (!combo.isPublic && combo.createdById !== session.user.id) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    return NextResponse.json(combo);
  } catch (error) {
    console.error('Erro ao buscar combo:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar combo' },
      { status: 500 }
    );
  }
}

// PUT - Atualizar combo
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = await params;

    // Verificar se o combo existe e pertence ao usuário
    const existingCombo = await prisma.examCombo.findUnique({
      where: { id },
      select: { createdById: true },
    });

    if (!existingCombo) {
      return NextResponse.json({ error: 'Combo não encontrado' }, { status: 404 });
    }

    // Apenas o criador ou admin pode editar
    const isAdmin = session.user.role === 'ADMIN';
    if (existingCombo.createdById !== session.user.id && !isAdmin) {
      return NextResponse.json(
        { error: 'Você não tem permissão para editar este combo' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = UpdateExamComboSchema.parse(body);

    // Se está atualizando os items, verificar se os exames existem
    if (validatedData.items) {
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
    }

    // Verificar se já existe outro combo com o mesmo nome
    if (validatedData.name) {
      const duplicateCombo = await prisma.examCombo.findFirst({
        where: {
          name: validatedData.name,
          id: { not: id },
        },
      });

      if (duplicateCombo) {
        return NextResponse.json(
          { error: 'Já existe outro combo com este nome' },
          { status: 400 }
        );
      }
    }

    // Atualizar o combo
    const combo = await prisma.$transaction(async (tx) => {
      // Se está atualizando items, deletar os antigos primeiro
      if (validatedData.items) {
        await tx.examComboItem.deleteMany({
          where: { comboId: id },
        });
      }

      return tx.examCombo.update({
        where: { id },
        data: {
          ...(validatedData.name && { name: validatedData.name }),
          ...(validatedData.description !== undefined && { description: validatedData.description }),
          ...(validatedData.category !== undefined && { category: validatedData.category }),
          ...(validatedData.isActive !== undefined && { isActive: validatedData.isActive }),
          ...(validatedData.isPublic !== undefined && { isPublic: validatedData.isPublic }),
          ...(validatedData.items && {
            items: {
              create: validatedData.items.map((item, index) => ({
                examId: item.examId,
                order: item.order ?? index,
                notes: item.notes,
                isRequired: item.isRequired ?? true,
              })),
            },
          }),
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
    });

    return NextResponse.json(combo);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Erro ao atualizar combo:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar combo' },
      { status: 500 }
    );
  }
}

// DELETE - Excluir combo
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = await params;

    // Verificar se o combo existe e pertence ao usuário
    const existingCombo = await prisma.examCombo.findUnique({
      where: { id },
      select: { createdById: true, name: true },
    });

    if (!existingCombo) {
      return NextResponse.json({ error: 'Combo não encontrado' }, { status: 404 });
    }

    // Apenas o criador ou admin pode deletar
    const isAdmin = session.user.role === 'ADMIN';
    if (existingCombo.createdById !== session.user.id && !isAdmin) {
      return NextResponse.json(
        { error: 'Você não tem permissão para excluir este combo' },
        { status: 403 }
      );
    }

    // Deletar o combo (items serão deletados por cascade)
    await prisma.examCombo.delete({
      where: { id },
    });

    return NextResponse.json({
      message: `Combo "${existingCombo.name}" excluído com sucesso`,
    });
  } catch (error) {
    console.error('Erro ao excluir combo:', error);
    return NextResponse.json(
      { error: 'Erro ao excluir combo' },
      { status: 500 }
    );
  }
}
