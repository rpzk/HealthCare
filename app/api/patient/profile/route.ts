import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const userId = session.user.id
    const userEmail = session.user.email

    // Buscar o paciente vinculado a este usuário
    const patient = await prisma.patient.findFirst({
      where: {
        OR: [
          { userId: userId },
          { email: userEmail }
        ]
      },
      include: {
        address: true
      }
    })

    if (!patient) {
      return NextResponse.json({ 
        error: 'Paciente não encontrado',
        message: 'Seu perfil de paciente ainda não foi criado'
      }, { status: 404 })
    }

    // Retornar perfil do paciente
    return NextResponse.json({
      id: patient.id,
      name: patient.name,
      email: patient.email,
      phone: patient.phone,
      cpf: patient.cpf,
      birthDate: patient.birthDate?.toISOString() || null,
      gender: patient.gender,
      bloodType: patient.bloodType,
      allergies: patient.allergies || [],
      address: patient.address ? {
        street: patient.address.street,
        number: patient.address.number,
        city: patient.address.city,
        state: patient.address.state
      } : null,
      emergencyContact: patient.emergencyContactName ? {
        name: patient.emergencyContactName,
        phone: patient.emergencyContactPhone,
        relation: patient.emergencyContactRelation || 'Contato'
      } : null
    })

  } catch (error) {
    console.error('Erro ao buscar perfil do paciente:', error)
    return NextResponse.json(
      { error: 'Erro ao carregar perfil' },
      { status: 500 }
    )
  }
}
