import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { MedicalRecordsService } from '@/lib/medical-records-service'
import { medicalRecordsAuditService } from '@/lib/medical-records-audit-service'
import { fieldMaskingService } from '@/lib/medical-records-masking-service'
import { rateLimitingService } from '@/lib/medical-records-rate-limiting-service'
import { notificationService } from '@/lib/notification-service'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { z } from 'zod'

// ============================================
// SCHEMAS VALIDATION
// ============================================

const medicalRecordSchema = z.object({
  title: z.string().min(3, 'Título deve ter pelo menos 3 caracteres'),
  description: z.string().min(10, 'Descrição deve ter pelo menos 10 caracteres'),
  diagnosis: z.string().optional(),
  treatment: z.string().optional(),
  notes: z.string().optional(),
  recordType: z.enum(['CONSULTATION', 'EXAM', 'PROCEDURE', 'PRESCRIPTION', 'OTHER']).default('CONSULTATION'),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'CRITICAL']).default('NORMAL'),
  patientId: z.string().cuid('ID de paciente inválido')
})

const filterSchema = z.object({
  search: z.string().optional(),
  type: z.enum(['ALL', 'CONSULTATION', 'EXAM', 'PROCEDURE', 'PRESCRIPTION', 'OTHER']).optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'CRITICAL']).optional(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  patientId: z.string().cuid().optional(),
  doctorId: z.string().cuid().optional(),
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'priority']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
})

// ============================================
// GET - Advanced search with filters
// ============================================

export const GET = withAuth(async (request: NextRequest, { user: _user }) => {
  try {
    const user = _user as any
    const { searchParams } = new URL(request.url)

    // Parse and validate query parameters
    const queryParams = {
      search: searchParams.get('search') || undefined,
      type: searchParams.get('type') || undefined,
      priority: searchParams.get('priority') || undefined,
      severity: searchParams.get('severity') || undefined,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
      patientId: searchParams.get('patientId') || undefined,
      doctorId: searchParams.get('doctorId') || undefined,
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '10',
      sortBy: searchParams.get('sortBy') || 'createdAt',
      sortOrder: searchParams.get('sortOrder') || 'desc',
    }

    const validatedFilters = filterSchema.parse(queryParams)
    const page = Math.max(validatedFilters.page || 1, 1)
    const limit = Math.min(Math.max(validatedFilters.limit || 10, 1), 100)

    // ============================================
    // BUILD WHERE CLAUSE WITH RBAC
    // ============================================

    const where: any = { deletedAt: null }

    // RBAC: Filter records based on user role
    if (user.role === 'PATIENT') {
      // Pacientes só veem seus próprios prontuários
      const patient = await prisma.patient.findFirst({
        where: { userId: user.id },
        select: { id: true }
      })
      if (!patient) {
        return NextResponse.json(
          { data: [], pagination: { page, limit, total: 0, pages: 0 } }
        )
      }
      where.patientId = patient.id
    } else if (user.role === 'DOCTOR') {
      // Médicos veem:
      // 1. Seus próprios prontuários
      // 2. Prontuários de pacientes atribuídos
      const assignedPatients = await prisma.patientCareTeam.findMany({
        where: {
          userId: user.id,
          isActive: true
        },
        select: { patientId: true }
      })

      const patientIds = assignedPatients.map(p => p.patientId)
      where.OR = [
        { doctorId: user.id },
        { patientId: { in: patientIds } }
      ]
    }
    // ADMIN tem acesso a todos

    // ============================================
    // APPLY OPTIONAL FILTERS
    // ============================================

    if (validatedFilters.search) {
      where.OR = [
        { title: { contains: validatedFilters.search, mode: 'insensitive' } },
        { description: { contains: validatedFilters.search, mode: 'insensitive' } },
        { diagnosis: { contains: validatedFilters.search, mode: 'insensitive' } },
        { treatment: { contains: validatedFilters.search, mode: 'insensitive' } },
        { notes: { contains: validatedFilters.search, mode: 'insensitive' } },
        { patient: { name: { contains: validatedFilters.search, mode: 'insensitive' } } }
      ]
    }

    if (validatedFilters.type && validatedFilters.type !== 'ALL') {
      where.recordType = validatedFilters.type
    }

    if (validatedFilters.priority) {
      where.priority = validatedFilters.priority
    }

    if (validatedFilters.severity) {
      where.severity = validatedFilters.severity
    }

    if (validatedFilters.patientId) {
      where.patientId = validatedFilters.patientId
    }

    if (validatedFilters.doctorId) {
      where.doctorId = validatedFilters.doctorId
    }

    // Date range filtering
    if (validatedFilters.dateFrom || validatedFilters.dateTo) {
      where.createdAt = {}
      if (validatedFilters.dateFrom) {
        where.createdAt.gte = new Date(validatedFilters.dateFrom)
      }
      if (validatedFilters.dateTo) {
        where.createdAt.lte = new Date(validatedFilters.dateTo)
      }
    }

    // ============================================
    // FETCH PAGINATED RESULTS
    // ============================================

    const [total, records] = await Promise.all([
      prisma.medicalRecord.count({ where }),
      prisma.medicalRecord.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: {
          [validatedFilters.sortBy || 'createdAt']: validatedFilters.sortOrder || 'desc'
        },
        include: {
          patient: {
            select: { id: true, name: true, email: true, birthDate: true }
          },
          doctor: {
            select: { id: true, name: true, speciality: true }
          },
          attachments: {
            select: { id: true, fileName: true, fileSize: true }
          },
          aiAnalysis: {
            select: { id: true, analysisType: true, confidence: true, createdAt: true }
          }
        }
      })
    ])

    // Apply field masking
    const maskedRecords = records.map(r => fieldMaskingService.maskRecord(r, user.role))

    // Audit query
    await medicalRecordsAuditService.logRead(
      `query:${page}:${limit}`,
      user.id,
      user.role,
      (user as any).email,
      { filters: validatedFilters }
    )

    return NextResponse.json({
      data: maskedRecords,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      filters: {
        applied: validatedFilters,
        available: {
          types: ['ALL', 'CONSULTATION', 'EXAM', 'PROCEDURE', 'PRESCRIPTION', 'OTHER'],
          priorities: ['LOW', 'NORMAL', 'HIGH', 'CRITICAL'],
          severities: ['LOW', 'MEDIUM', 'HIGH']
        }
      }
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Filtros inválidos', details: error.errors },
        { status: 400 }
      )
    }
    logger.error({ error }, 'Error fetching medical records')
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
})

// POST - Criar novo prontuário médico
export const POST = withAuth(async (request: NextRequest, { user }) => {
  try {
    // Check rate limit for CREATE operations
    const rateLimitCheck = rateLimitingService.checkRateLimit(user.id, 'CREATE')
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        { error: 'Taxa de requisições excedida. Tente novamente mais tarde.' },
        { 
          status: 429,
          headers: {
            'Retry-After': String(rateLimitCheck.retryAfter || 60)
          }
        }
      )
    }

    const body = await request.json()

    // Validar com Zod
    const validationResult = medicalRecordSchema.safeParse(body)
    if (!validationResult.success) {
      const errors = validationResult.error.errors
        .map(err => `${err.path.join('.')}: ${err.message}`)
        .join('; ')
      
      // Log validation error
      await medicalRecordsAuditService.logError(
        'CREATE',
        'new',
        user.id,
        user.role || 'UNKNOWN',
        (user as any).email,
        `Validation error: ${errors}`
      )

      return NextResponse.json(
        { error: `Dados inválidos: ${errors}` },
        { status: 400 }
      )
    }

    const data = validationResult.data

    const record = await MedicalRecordsService.createMedicalRecord({
      title: data.title,
      description: data.description,
      diagnosis: data.diagnosis,
      treatment: data.treatment,
      notes: data.notes,
      recordType: data.recordType,
      priority: data.priority,
      patientId: data.patientId,
      doctorId: user.id
    })

    // Log successful creation
    await medicalRecordsAuditService.logCreate(
      record.id,
      record,
      user.id,
      user.role || 'DOCTOR',
      (user as any).email
    )

    // 🔔 Send notification to patient
    try {
      const patientUser = await prisma.user.findFirst({
        where: { patientId: data.patientId },
        select: { id: true },
      })

      if (patientUser?.id) {
        await notificationService.createNotification({
          userId: patientUser.id,
          type: 'MEDICAL_RECORD',
          title: 'Novo Prontuário Criado',
          message: `Um novo prontuário foi criado: ${data.title}`,
          priority: data.priority === 'CRITICAL' || data.priority === 'HIGH' ? 'HIGH' : 'NORMAL',
          metadata: {
            recordId: record.id,
            recordType: data.recordType,
            priority: data.priority
          }
        })
      }
    } catch (notifError) {
      logger.error({ error: notifError }, 'Failed to send notification for new record')
      // Don't fail the request if notification fails
    }

    // Apply masking before returning
    const maskedRecord = fieldMaskingService.maskRecord(record, user.role || 'DOCTOR')

    return NextResponse.json(maskedRecord, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar prontuário:', error)
    
    // Log error
    await medicalRecordsAuditService.logError(
      'CREATE',
      'new',
      user.id,
      user.role || 'UNKNOWN',
      (user as any).email,
      error instanceof Error ? error.message : 'Unknown error'
    )

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
})