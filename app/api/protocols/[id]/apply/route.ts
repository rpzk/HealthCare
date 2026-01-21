/**
 * API para aplicar protocolo na consulta
 * 
 * POST /api/protocols/[id]/apply - Aplica protocolo e incrementa uso
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { logger } from '@/lib/logger'

export async function POST(
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
        ],
        isActive: true
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
        }
      }
    })

    if (!protocol) {
      return NextResponse.json(
        { error: 'Protocolo não encontrado' },
        { status: 404 }
      )
    }

    // Incrementar contador de uso
    await prisma.protocol.update({
      where: { id: params.id },
      data: { usageCount: { increment: 1 } }
    })

    // Transformar dados do protocolo para o formato esperado pelo frontend
    const data = {
      prescriptions: protocol.prescriptions.map(rx => ({
        id: `proto-${rx.id}`,
        medicationId: rx.medicationId,
        medication: rx.medicationName,
        dosage: rx.dosage,
        frequency: rx.frequency,
        duration: rx.duration,
        instructions: rx.instructions || '',
        quantity: rx.quantity,
        route: rx.route,
        // Dados do catálogo para exibição
        catalog: rx.medication ? {
          name: rx.medication.name,
          tradeName: rx.medication.tradeName,
          prescriptionType: rx.medication.prescriptionType,
          basicPharmacy: rx.medication.basicPharmacy,
          popularPharmacy: rx.medication.popularPharmacy,
          warnings: rx.medication.warnings
        } : null
      })),
      exams: protocol.exams.map(exam => ({
        id: `proto-${exam.id}`,
        examCatalogId: exam.examCatalogId,
        examType: exam.examName,
        description: exam.description || '',
        priority: exam.priority,
        notes: exam.notes,
        // Dados do catálogo
        catalog: exam.examCatalog ? {
          name: exam.examCatalog.name,
          abbreviation: exam.examCatalog.abbreviation,
          category: exam.examCatalog.examCategory,
          preparation: exam.examCatalog.preparation,
          susCode: exam.examCatalog.susCode
        } : null
      })),
      referrals: protocol.referrals.map(ref => ({
        id: `proto-${ref.id}`,
        specialty: ref.specialty,
        description: ref.description,
        priority: ref.priority,
        notes: ref.notes
      })),
      diagnoses: protocol.diagnoses.map(diag => ({
        id: `proto-${diag.id}`,
        medicalCodeId: diag.medicalCodeId,
        code: diag.cidCode,
        description: diag.description,
        isPrimary: diag.isPrimary,
        // Dados do catálogo
        catalog: diag.medicalCode ? {
          code: diag.medicalCode.code,
          display: diag.medicalCode.display,
          chapter: diag.medicalCode.chapter
        } : null
      }))
    }

    return NextResponse.json({
      success: true,
      protocol: {
        id: protocol.id,
        name: protocol.name,
        category: protocol.category
      },
      data
    })
  } catch (error) {
    logger.error('Erro ao aplicar protocolo:', error)
    return NextResponse.json(
      { error: 'Erro ao aplicar protocolo' },
      { status: 500 }
    )
  }
}
