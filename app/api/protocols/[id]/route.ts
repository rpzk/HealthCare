/**
 * API de Protocolo Individual
 * 
 * GET    /api/protocols/[id] - Busca protocolo
 * PATCH  /api/protocols/[id] - Atualiza protocolo
 * DELETE /api/protocols/[id] - Remove protocolo
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { logger } from '@/lib/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const protocol = await prisma.protocol.findFirst({
      where: {
        id: params.id,
        OR: [
          { doctorId: session.user.id },
          { isPublic: true }
        ]
      },
      include: {
        prescriptions: {
          include: { medication: true },
          orderBy: { sortOrder: 'asc' }
        },
        exams: {
          include: { examCatalog: true },
          orderBy: { sortOrder: 'asc' }
        },
        referrals: {
          orderBy: { sortOrder: 'asc' }
        },
        diagnoses: {
          include: { medicalCode: true },
          orderBy: { sortOrder: 'asc' }
        },
        doctor: {
          select: { id: true, name: true, speciality: true }
        }
      }
    })

    if (!protocol) {
      return NextResponse.json(
        { error: 'Protocolo não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({ protocol })
  } catch (error) {
    logger.error('Erro ao buscar protocolo:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar protocolo' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Verificar se o protocolo pertence ao usuário
    const existing = await prisma.protocol.findFirst({
      where: {
        id: params.id,
        doctorId: session.user.id
      }
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Protocolo não encontrado ou sem permissão' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const {
      name,
      description,
      category,
      isPublic,
      tags,
      specialty,
      isActive,
      prescriptions,
      exams,
      referrals,
      diagnoses
    } = body

    // Atualizar protocolo básico
    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (category !== undefined) updateData.category = category
    if (isPublic !== undefined) updateData.isPublic = isPublic
    if (tags !== undefined) updateData.tags = tags
    if (specialty !== undefined) updateData.specialty = specialty
    if (isActive !== undefined) updateData.isActive = isActive

    // Se houver itens para atualizar, fazer replace completo
    if (prescriptions) {
      await prisma.protocolPrescription.deleteMany({
        where: { protocolId: params.id }
      })
      await prisma.protocolPrescription.createMany({
        data: prescriptions.map((rx: any, index: number) => ({
          protocolId: params.id,
          medicationId: rx.medicationId || null,
          medicationName: rx.medicationName || rx.medication,
          dosage: rx.dosage,
          frequency: rx.frequency,
          duration: rx.duration,
          instructions: rx.instructions,
          quantity: rx.quantity,
          route: rx.route,
          sortOrder: index
        }))
      })
    }

    if (exams) {
      await prisma.protocolExam.deleteMany({
        where: { protocolId: params.id }
      })
      await prisma.protocolExam.createMany({
        data: exams.map((exam: any, index: number) => ({
          protocolId: params.id,
          examCatalogId: exam.examCatalogId || null,
          examName: exam.examName || exam.examType,
          description: exam.description,
          priority: exam.priority || 'ROUTINE',
          notes: exam.notes,
          sortOrder: index
        }))
      })
    }

    if (referrals) {
      await prisma.protocolReferral.deleteMany({
        where: { protocolId: params.id }
      })
      await prisma.protocolReferral.createMany({
        data: referrals.map((ref: any, index: number) => ({
          protocolId: params.id,
          specialty: ref.specialty,
          description: ref.description,
          priority: ref.priority || 'ROUTINE',
          notes: ref.notes,
          sortOrder: index
        }))
      })
    }

    if (diagnoses) {
      await prisma.protocolDiagnosis.deleteMany({
        where: { protocolId: params.id }
      })
      await prisma.protocolDiagnosis.createMany({
        data: diagnoses.map((diag: any, index: number) => ({
          protocolId: params.id,
          medicalCodeId: diag.medicalCodeId || null,
          cidCode: diag.cidCode || diag.code,
          description: diag.description,
          isPrimary: diag.isPrimary || false,
          sortOrder: index
        }))
      })
    }

    const protocol = await prisma.protocol.update({
      where: { id: params.id },
      data: updateData,
      include: {
        prescriptions: { include: { medication: true } },
        exams: { include: { examCatalog: true } },
        referrals: true,
        diagnoses: { include: { medicalCode: true } }
      }
    })

    return NextResponse.json({ protocol })
  } catch (error) {
    logger.error('Erro ao atualizar protocolo:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar protocolo' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Verificar se o protocolo pertence ao usuário
    const existing = await prisma.protocol.findFirst({
      where: {
        id: params.id,
        doctorId: session.user.id
      }
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Protocolo não encontrado ou sem permissão' },
        { status: 404 }
      )
    }

    // Soft delete - apenas desativar
    await prisma.protocol.update({
      where: { id: params.id },
      data: { isActive: false }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Erro ao remover protocolo:', error)
    return NextResponse.json(
      { error: 'Erro ao remover protocolo' },
      { status: 500 }
    )
  }
}
