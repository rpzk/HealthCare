import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { prisma } from '@/lib/prisma'

// GET - Buscar prescrições médicas
export const GET = withAuth(async (request, { user }) => {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || 'ALL'

    // Construir filtros
    const where: any = {}

    if (search) {
      where.OR = [
        { medication: { contains: search, mode: 'insensitive' } },
        { patient: { name: { contains: search, mode: 'insensitive' } } },
        { doctor: { name: { contains: search, mode: 'insensitive' } } }
      ]
    }

    if (status !== 'ALL') {
      where.status = status
    }

    // Se não for ADMIN, filtrar apenas prescrições do médico
    if (user.role !== 'ADMIN') {
      where.doctorId = user.id
    }

    // Buscar prescrições com paginação
    const [prescriptions, total] = await Promise.all([
      prisma.prescription.findMany({
        where,
        include: {
          patient: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          doctor: {
            select: {
              id: true,
              name: true,
              speciality: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.prescription.count({ where })
    ])

    return NextResponse.json({
      prescriptions,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    })
  } catch (error) {
    console.error('Erro ao buscar prescrições:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
})

// POST - Criar nova prescrição
export const POST = withAuth(async (request, { user }) => {
  try {
    const body = await request.json()
    const {
      medication,
      dosage,
      frequency,
      duration,
      instructions,
      patientId,
      startDate,
      endDate
    } = body

    // Validações básicas
    if (!medication || !dosage || !frequency || !duration || !patientId) {
      return NextResponse.json(
        { error: 'Medicamento, dosagem, frequência, duração e paciente são obrigatórios' },
        { status: 400 }
      )
    }

    // Verificar se o paciente existe
    const patient = await prisma.patient.findUnique({
      where: { id: patientId }
    })

    if (!patient) {
      return NextResponse.json(
        { error: 'Paciente não encontrado' },
        { status: 404 }
      )
    }

    // Criar prescrição
    const prescription = await prisma.prescription.create({
      data: {
        medication,
        dosage,
        frequency,
        duration,
        instructions,
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : null,
        status: 'ACTIVE',
        patientId,
        doctorId: user.id
      },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        doctor: {
          select: {
            id: true,
            name: true,
            speciality: true
          }
        }
      }
    })

    return NextResponse.json(prescription, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar prescrição:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
})
