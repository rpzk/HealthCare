import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { prisma } from '@/lib/prisma'

// GET - Buscar solicitações de exames
export const GET = withAuth(async (request, { user }) => {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || 'ALL'
    const urgency = searchParams.get('urgency') || 'ALL'

    // Construir filtros
    const where: any = {}

    if (search) {
      where.OR = [
        { examType: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { patient: { name: { contains: search, mode: 'insensitive' } } },
        { doctor: { name: { contains: search, mode: 'insensitive' } } }
      ]
    }

    if (status !== 'ALL') {
      where.status = status
    }

    if (urgency !== 'ALL') {
      where.urgency = urgency
    }

    // Se não for ADMIN, filtrar apenas solicitações do médico
    if (user.role !== 'ADMIN') {
      where.doctorId = user.id
    }

    // Buscar exames com paginação
    const [examRequests, total] = await Promise.all([
      prisma.examRequest.findMany({
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
        orderBy: [
          { urgency: 'desc' },
          { requestDate: 'desc' }
        ],
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.examRequest.count({ where })
    ])

    return NextResponse.json({
      examRequests,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    })
  } catch (error) {
    console.error('Erro ao buscar solicitações de exames:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
})

// POST - Criar nova solicitação de exame
export const POST = withAuth(async (request, { user }) => {
  try {
    const body = await request.json()
    const {
      examType,
      description,
      urgency,
      patientId,
      scheduledDate,
      notes
    } = body

    // Validações básicas
    if (!examType || !patientId) {
      return NextResponse.json(
        { error: 'Tipo de exame e paciente são obrigatórios' },
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

    // Criar solicitação de exame
    const examRequest = await prisma.examRequest.create({
      data: {
        examType,
        description,
        urgency: urgency || 'ROUTINE',
        status: 'REQUESTED',
        requestDate: new Date(),
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
        notes,
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

    return NextResponse.json(examRequest, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar solicitação de exame:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
})
