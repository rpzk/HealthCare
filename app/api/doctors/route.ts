import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  try {
    // Buscar usuários com roles médicas
    const doctors = await prisma.user.findMany({
      where: {
        role: {
          in: ['DOCTOR', 'NURSE', 'PHYSIOTHERAPIST', 'PSYCHOLOGIST', 'DENTIST', 'NUTRITIONIST']
        },
        isActive: true
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        crmNumber: true
      },
      orderBy: {
        name: 'asc'
      }
    })

    // Mapear para formato esperado
    const formattedDoctors = doctors.map(doc => ({
      id: doc.id,
      name: doc.name,
      email: doc.email,
      specialty: getRoleLabel(doc.role),
      crmNumber: doc.crmNumber || 'N/A'
    }))

    return NextResponse.json({ doctors: formattedDoctors })
  } catch (error) {
    console.error('Error fetching doctors:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    'DOCTOR': 'Médico',
    'NURSE': 'Enfermeiro(a)',
    'PHYSIOTHERAPIST': 'Fisioterapeuta',
    'PSYCHOLOGIST': 'Psicólogo(a)',
    'DENTIST': 'Dentista',
    'NUTRITIONIST': 'Nutricionista'
  }
  return labels[role] || role
}
