import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const userId = session.user.id
    const userEmail = session.user.email

    // Buscar o paciente vinculado a este usuário
    const whereClause: any = { OR: [{ userId }] }
    if (userEmail) whereClause.OR.push({ email: userEmail })

    const patient = await prisma.patient.findFirst({
      where: whereClause,
      include: { addresses: true }
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
      // the schema stores a free-form 'address' string and a relation 'addresses' -> we surface the primary address if present
      allergies: patient.allergies ? patient.allergies.split(',').map(s => s.trim()).filter(Boolean) : [],
      address: (patient.addresses && patient.addresses.length > 0) ? (() => {
        const primary = patient.addresses.find((a: any) => a.isPrimary) || patient.addresses[0]
        return {
          street: primary.street,
          number: primary.number,
          city: primary.city,
          state: primary.state
        }
      })() : null,
      // emergencyContact is stored as a free-form string, sometimes JSON; try to parse if possible
      emergencyContact: (function() {
        const raw = patient.emergencyContact
        if (!raw) return null
        try {
          const parsed = JSON.parse(raw)
          if (typeof parsed === 'object' && parsed !== null) {
            return {
              name: parsed.name || parsed.nome || String(parsed),
              phone: parsed.phone || parsed.telefone || parsed.phoneNumber || null,
              relation: parsed.relation || parsed.relacao || 'Contato'
            }
          }
          return { name: String(parsed), phone: null, relation: 'Contato' }
        } catch (e) {
          // not JSON — return raw string as name
          return { name: String(raw), phone: null, relation: 'Contato' }
        }
      })()
    })

  } catch (error) {
    console.error('Erro ao buscar perfil do paciente:', error)
    return NextResponse.json(
      { error: 'Erro ao carregar perfil' },
      { status: 500 }
    )
  }
}
