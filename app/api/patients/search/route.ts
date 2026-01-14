import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { prisma } from '@/lib/prisma'
import { getPatientAccessFilter } from '@/lib/patient-access'

export const runtime = 'nodejs'

export const GET = withAuth(async (request, { user }) => {
  try {
    const q = new URL(request.url).searchParams.get('q') || ''
    if (q.length < 1) {
      return NextResponse.json([])
    }

    // Buscar pacientes por nome ou email com filtro de acesso
    const filter = getPatientAccessFilter(user.id, user.role)

    const patients = await prisma.patient.findMany({
      where: {
        AND: [
          filter as any, // Filter retorna um tipo complexo
          {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } },
              { phone: { contains: q, mode: 'insensitive' } },
            ],
          },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        birthDate: true,
        riskLevel: true,
      },
      take: 10,
    })

    // Calcular idade
    const result = patients.map(p => ({
      id: p.id,
      name: p.name,
      email: p.email,
      phone: p.phone,
      birthDate: p.birthDate,
      age: p.birthDate ? Math.floor((Date.now() - p.birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : undefined,
      riskLevel: p.riskLevel,
    }))

    return NextResponse.json(result)
  } catch (error) {
    console.error('Erro ao buscar pacientes:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar pacientes' },
      { status: 500 }
    )
  }
})
