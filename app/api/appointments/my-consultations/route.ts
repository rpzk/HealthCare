import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/auth'
import { prisma } from '@/lib/prisma'

// Todos os roles que são considerados profissionais de saúde
const PROFESSIONAL_ROLES = [
  'DOCTOR',
  'NURSE',
  'PHYSIOTHERAPIST',
  'PSYCHOLOGIST',
  'NUTRITIONIST',
  'DENTIST',
  'HEALTH_AGENT',
  'TECHNICIAN',
  'PHARMACIST',
  'SOCIAL_WORKER',
  'RECEPTIONIST',
  'ADMIN' // Admin também pode acessar
]

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    console.log('[API my-consultations] Sessão:', JSON.stringify({
      hasSession: !!session,
      email: session?.user?.email,
      role: session?.user?.role,
      name: session?.user?.name
    }))

    if (!session?.user?.email) {
      console.log('[API my-consultations] Sem sessão ou email')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = session.user.role
    const isProfessional = PROFESSIONAL_ROLES.includes(userRole)
    
    console.log('[API my-consultations] Verificação de role:', {
      userRole,
      isProfessional,
      allowedRoles: PROFESSIONAL_ROLES
    })

    if (!isProfessional) {
      console.log('[API my-consultations] Role não permitido:', userRole)
      return NextResponse.json({ error: 'Only professionals can access this' }, { status: 403 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const statusParam = searchParams.get('status') || 'SCHEDULED'
    const days = parseInt(searchParams.get('days') || '30')

    // Validate status is a valid enum value
    const validStatuses = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']
    const status = validStatuses.includes(statusParam) ? statusParam : 'SCHEDULED'

    // Get consultations for this professional
    const consultations = await prisma.consultation.findMany({
      where: {
        doctorId: user.id,
        status: status as any,
        scheduledDate: {
          gte: new Date(),
          lte: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
        },
      },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            cpf: true,
          },
        },
      },
      orderBy: { scheduledDate: 'asc' },
    })

    // Get statistics
    const allConsultations = await prisma.consultation.findMany({
      where: { doctorId: user.id },
      select: { status: true },
    })

    const stats = {
      total: allConsultations.length,
      scheduled: allConsultations.filter((c) => c.status === 'SCHEDULED').length,
      inProgress: allConsultations.filter((c) => c.status === 'IN_PROGRESS').length,
      completed: allConsultations.filter((c) => c.status === 'COMPLETED').length,
      cancelled: allConsultations.filter((c) => c.status === 'CANCELLED').length,
    }

    return NextResponse.json({
      success: true,
      consultations: consultations.map((c) => ({
        id: c.id,
        patientName: c.patient?.name,
        patientEmail: c.patient?.email,
        patientPhone: c.patient?.phone,
        patientCPF: c.patient?.cpf,
        scheduledDate: c.scheduledDate,
        status: c.status,
        type: c.type,
        reason: c.chiefComplaint,
        notes: c.notes,
        createdAt: c.createdAt,
      })),
      stats,
    })
  } catch (error) {
    console.error('Error fetching consultations:', error)
    return NextResponse.json({ error: 'Failed to fetch consultations' }, { status: 500 })
  }
}

// POST - Approve/reject pending consultation
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!PROFESSIONAL_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Only professionals can access this' }, { status: 403 })
    }

    const body = await request.json()
    const { consultationId, action } = body // action: 'approve' | 'reject'

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get consultation
    const consultation = await prisma.consultation.findUnique({
      where: { id: consultationId },
      include: {
        patient: { select: { name: true, email: true } },
      },
    })

    if (!consultation || consultation.doctorId !== user.id) {
      return NextResponse.json({ error: 'Not found or not authorized' }, { status: 404 })
    }

    if (consultation.status !== 'SCHEDULED') {
      return NextResponse.json(
        { error: 'Only scheduled consultations can be approved/rejected' },
        { status: 400 }
      )
    }

    const newStatus = action === 'approve' ? 'IN_PROGRESS' : 'CANCELLED'

    const updated = await prisma.consultation.update({
      where: { id: consultationId },
      data: {
        status: newStatus,
        updatedAt: new Date(),
      },
      include: {
        patient: { select: { name: true, email: true } },
      },
    })

    return NextResponse.json({
      success: true,
      message: `Consultation ${action}d`,
      consultation: updated,
    })
  } catch (error) {
    console.error('Error updating consultation:', error)
    return NextResponse.json({ error: 'Failed to update consultation' }, { status: 500 })
  }
}
