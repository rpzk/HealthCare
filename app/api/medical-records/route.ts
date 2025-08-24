import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { prisma } from '@/lib/prisma'

// GET - Buscar prontuários médicos
export const GET = withAuth(async (request, { user }) => {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const type = searchParams.get('type') || 'ALL'

    // Construir filtros
    const where: any = {}

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { diagnosis: { contains: search, mode: 'insensitive' } },
        { patient: { name: { contains: search, mode: 'insensitive' } } },
        { doctor: { name: { contains: search, mode: 'insensitive' } } }
      ]
    }

    if (type !== 'ALL') {
      where.recordType = type
    }

    // Se não for ADMIN, filtrar apenas prontuários do médico
    if (user.role !== 'ADMIN') {
      where.doctorId = user.id
    }

    // Buscar prontuários com paginação
    const [records, total] = await Promise.all([
      prisma.medicalRecord.findMany({
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
          },
          _count: {
            select: {
              attachments: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.medicalRecord.count({ where })
    ])

    return NextResponse.json({
      records,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    })
  } catch (error) {
    console.error('Erro ao buscar prontuários:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
})

// POST - Criar novo prontuário médico
export const POST = withAuth(async (request, { user }) => {
  try {
    const body = await request.json()
    const {
      title,
      description,
      diagnosis,
      treatment,
      notes,
      recordType,
      severity,
      patientId,
      isPrivate = false
    } = body

    // Validações básicas
    if (!title || !description || !patientId) {
      return NextResponse.json(
        { error: 'Título, descrição e paciente são obrigatórios' },
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

    // Criar prontuário
    const record = await prisma.medicalRecord.create({
      data: {
        title,
        description,
        diagnosis,
        treatment,
        notes,
        recordType: recordType || 'CONSULTATION',
        severity: severity || 'LOW',
        isPrivate,
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

    return NextResponse.json(record, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar prontuário:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
})
