import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import { updateProfileSchema } from '@/lib/validation-schemas-api'

export const dynamic = 'force-dynamic'

// Direct PrismaClient instantiation to avoid bundling issues
const globalForPrisma = globalThis as unknown as { profilePrisma: PrismaClient }

function getProfilePrisma() {
  if (!globalForPrisma.profilePrisma) {
    globalForPrisma.profilePrisma = new PrismaClient()
  }
  return globalForPrisma.profilePrisma
}

const prisma = getProfilePrisma()

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
      crm: user.licenseType && user.licenseState && user.licenseNumber 
        ? `${user.licenseType}/${user.licenseState} ${user.licenseNumber}`
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
    console.error('Erro ao buscar perfil:', error)
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
    
    const { name, phone, specialty } = parseResult.data

    const updatedUser = await prisma.user.update({
      where: { email: session.user.email },
      data: {
        name: name || undefined,
        phone: phone || undefined,
        speciality: specialty || undefined,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        speciality: true,
      }
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Perfil atualizado com sucesso',
      user: updatedUser 
    })
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error)
    return NextResponse.json({ error: 'Erro ao atualizar perfil' }, { status: 500 })
  }
}
