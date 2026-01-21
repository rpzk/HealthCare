import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { decrypt, encrypt, hashCPF } from '@/lib/crypto'
import { parseAllergies, serializeAllergies, normalizeBloodType } from '@/lib/patient-schemas'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const updateSchema = z.object({
  phone: z.string().min(8).max(20).optional(),
  cpf: z.string().min(11).max(14).optional(),
  bloodType: z.enum(['A+','A-','B+','B-','AB+','AB-','O+','O-']).optional(),
  allergies: z.array(z.string().min(1)).optional(),
  emergencyContact: z.object({
    name: z.string().min(1),
    phone: z.string().min(8).max(20),
    relation: z.string().min(1)
  }).optional(),
  address: z.object({
    street: z.string().min(1),
    number: z.string().optional(),
    complement: z.string().optional(),
    neighborhood: z.string().optional(),
    city: z.string().min(1),
    state: z.string().min(2).max(2),
    zipCode: z.string().optional(),
  }).optional(),
})

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
      cpf: decrypt(patient.cpf as string | null),
      birthDate: patient.birthDate?.toISOString() || null,
      gender: patient.gender,
      bloodType: normalizeBloodType(patient.bloodType),
      // the schema stores a free-form 'address' string and a relation 'addresses' -> we surface the primary address if present
      allergies: parseAllergies(decrypt(patient.allergies as string | null)),
      address: (patient.addresses && patient.addresses.length > 0) ? (() => {
        const primary = patient.addresses.find((a: any) => a.isPrimary) || patient.addresses[0]
        return {
          street: primary.street,
          number: primary.number,
          complement: primary.complement,
          neighborhood: primary.neighborhood,
          city: primary.city,
          state: primary.state,
          zipCode: primary.zipCode,
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
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error) {
    console.error('Erro ao buscar perfil do paciente:', error)
    return NextResponse.json(
      { error: 'Erro ao carregar perfil' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/patient/profile
 * Atualiza dados do próprio paciente (campos permitidos)
 */
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const userId = session.user.id
    const body = await req.json()
    const parsed = updateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const data = parsed.data

    // Buscar paciente
    const patient = await prisma.patient.findFirst({
      where: { userId },
      include: { addresses: true },
    })

    if (!patient) {
      return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })
    }

    // Montar updates
    const patientUpdate: any = {}
    if (data.phone) patientUpdate.phone = data.phone
    if (data.cpf) {
      const cpfValue = data.cpf.trim()
      if (cpfValue) {
        patientUpdate.cpf = encrypt(cpfValue)
        patientUpdate.cpfHash = hashCPF(cpfValue)
      }
    }
    if (data.bloodType) patientUpdate.bloodType = normalizeBloodType(data.bloodType)
    if (data.allergies && data.allergies.length > 0) {
      patientUpdate.allergies = encrypt(serializeAllergies(data.allergies))
    }
    if (data.emergencyContact) patientUpdate.emergencyContact = JSON.stringify(data.emergencyContact)

    // Atualizar endereço primário
    if (data.address) {
      const primary = patient.addresses.find((a) => a.isPrimary) || patient.addresses[0]
      if (primary) {
        await prisma.address.update({
          where: { id: primary.id },
          data: {
            street: data.address.street,
            number: data.address.number || '',
            complement: data.address.complement || null,
            neighborhood: data.address.neighborhood || null,
            city: data.address.city,
            state: data.address.state,
            zipCode: data.address.zipCode || null,
            isPrimary: true,
          },
        })
      } else {
        await prisma.address.create({
          data: {
            patientId: patient.id,
            street: data.address.street,
            number: data.address.number || '',
            complement: data.address.complement || null,
            neighborhood: data.address.neighborhood || null,
            city: data.address.city,
            state: data.address.state,
            zipCode: data.address.zipCode || null,
            isPrimary: true,
          },
        })
      }
    }

    // Atualizar paciente
    const updated = await prisma.patient.update({
      where: { id: patient.id },
      data: patientUpdate,
      include: { addresses: true },
    })

    return NextResponse.json({
      success: true,
      message: 'Dados atualizados com sucesso',
      patient: {
        id: updated.id,
        phone: updated.phone,
        cpf: decrypt(updated.cpf as string | null),
        bloodType: normalizeBloodType(updated.bloodType),
        allergies: parseAllergies(decrypt(updated.allergies as string | null)),
        emergencyContact: (function() {
          const raw = updated.emergencyContact
          if (!raw) return null
          try {
            const parsed = JSON.parse(raw)
            if (typeof parsed === 'object' && parsed !== null) return parsed
            return { name: String(parsed), phone: null, relation: 'Contato' }
          } catch (e) {
            return { name: String(raw), phone: null, relation: 'Contato' }
          }
        })(),
        address: (updated.addresses && updated.addresses.length > 0) ? (() => {
          const primary = updated.addresses.find((a: any) => a.isPrimary) || updated.addresses[0]
          return {
            street: primary.street,
            number: primary.number,
            complement: primary.complement,
            neighborhood: primary.neighborhood,
            city: primary.city,
            state: primary.state,
            zipCode: primary.zipCode,
          }
        })() : null,
      },
    })

  } catch (error) {
    console.error('Erro ao atualizar perfil do paciente:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar perfil' },
      { status: 500 }
    )
  }
}
