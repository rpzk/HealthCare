import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { updateProfileSchema } from '@/lib/validation-schemas-api'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession(authOptions as any) as { user?: { email?: string } } | null
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        speciality: true,
        crmNumber: true,
        licenseNumber: true,
        licenseType: true,
        licenseState: true,
        createdAt: true,
        isActive: true,
        person: {
          select: {
            cpf: true,
            birthDate: true,
            gender: true,
            motherName: true,
          }
        },
        _count: {
          select: {
            consultations: true,
            patients: true,
            prescriptions: true,
            examRequests: true,
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    // Format the profile data
    const profile = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      specialty: user.speciality || '',
      crmNumber: user.crmNumber || '',
      licenseState: user.licenseState || '',
      crm: user.licenseType && user.licenseState && user.licenseNumber 
        ? `${user.licenseType}/${user.licenseState} ${user.licenseNumber}`
        : user.crmNumber && user.licenseState
          ? `CRM-${user.licenseState} ${user.crmNumber}`
          : user.crmNumber || '',
      role: user.role,
      status: user.isActive ? 'active' : 'inactive',
      joinDate: user.createdAt.toISOString().split('T')[0],
      person: user.person,
      stats: {
        totalPatients: user._count.patients,
        totalConsultations: user._count.consultations,
        totalPrescriptions: user._count.prescriptions,
        totalExams: user._count.examRequests,
      }
    }

    return NextResponse.json(profile)
  } catch (error) {
    logger.error('Erro ao buscar perfil:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions as any) as { user?: { email?: string } } | null
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    
    // Validate request body
    const parseResult = updateProfileSchema.safeParse(body)
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      )
    }
    
    let { name, phone, specialty, crmNumber, licenseState } = parseResult.data

    // Parse CRM no formato "12345/SP" ou "12345" se vier em crmNumber
    if (crmNumber?.includes('/')) {
      const [num, uf] = crmNumber.split('/').map(s => s.trim())
      if (num) crmNumber = num.replace(/\D/g, '') || num
      if (uf && uf.length === 2) licenseState = uf.toUpperCase()
    } else if (crmNumber) {
      crmNumber = crmNumber.replace(/\D/g, '') || crmNumber
    }

    const updatedUser = await prisma.user.update({
      where: { email: session.user.email },
      data: {
        name: name || undefined,
        phone: phone || undefined,
        speciality: specialty || undefined,
        crmNumber: crmNumber?.trim() ? crmNumber : null,
        licenseState: licenseState?.trim() ? licenseState : null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        speciality: true,
        crmNumber: true,
        licenseState: true,
      }
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Perfil atualizado com sucesso',
      user: updatedUser 
    })
  } catch (error) {
    logger.error('Erro ao atualizar perfil:', error)
    return NextResponse.json({ error: 'Erro ao atualizar perfil' }, { status: 500 })
  }
}
