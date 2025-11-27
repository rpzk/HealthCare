/**
 * API de Protocolos/Preferências do Médico
 * 
 * GET  /api/protocols - Lista protocolos do médico
 * POST /api/protocols - Cria novo protocolo
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const includePublic = searchParams.get('includePublic') === 'true'

    const where: any = {
      OR: [
        { doctorId: session.user.id },
        ...(includePublic ? [{ isPublic: true }] : [])
      ],
      isActive: true
    }

    if (category) {
      where.category = category
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { tags: { hasSome: [search.toLowerCase()] } }
      ]
    }

    const protocols = await prisma.protocol.findMany({
      where,
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
      },
      orderBy: [
        { usageCount: 'desc' },
        { updatedAt: 'desc' }
      ]
    })

    return NextResponse.json({ protocols })
  } catch (error) {
    console.error('Erro ao listar protocolos:', error)
    return NextResponse.json(
      { error: 'Erro ao listar protocolos' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const {
      name,
      description,
      category = 'CUSTOM',
      isPublic = false,
      tags = [],
      specialty,
      prescriptions = [],
      exams = [],
      referrals = [],
      diagnoses = []
    } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Nome do protocolo é obrigatório' },
        { status: 400 }
      )
    }

    const protocol = await prisma.protocol.create({
      data: {
        name,
        description,
        category,
        isPublic,
        tags,
        specialty,
        doctorId: session.user.id,
        prescriptions: {
          create: prescriptions.map((rx: any, index: number) => ({
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
        },
        exams: {
          create: exams.map((exam: any, index: number) => ({
            examCatalogId: exam.examCatalogId || null,
            examName: exam.examName || exam.examType,
            description: exam.description,
            priority: exam.priority || 'ROUTINE',
            notes: exam.notes,
            sortOrder: index
          }))
        },
        referrals: {
          create: referrals.map((ref: any, index: number) => ({
            specialty: ref.specialty,
            description: ref.description,
            priority: ref.priority || 'ROUTINE',
            notes: ref.notes,
            sortOrder: index
          }))
        },
        diagnoses: {
          create: diagnoses.map((diag: any, index: number) => ({
            medicalCodeId: diag.medicalCodeId || null,
            cidCode: diag.cidCode || diag.code,
            description: diag.description,
            isPrimary: diag.isPrimary || false,
            sortOrder: index
          }))
        }
      },
      include: {
        prescriptions: true,
        exams: true,
        referrals: true,
        diagnoses: true
      }
    })

    return NextResponse.json({ protocol }, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar protocolo:', error)
    return NextResponse.json(
      { error: 'Erro ao criar protocolo' },
      { status: 500 }
    )
  }
}
