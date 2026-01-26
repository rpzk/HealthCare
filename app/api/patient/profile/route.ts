import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { prisma } from '@/lib/prisma'
import { decrypt, encrypt, hashCPF } from '@/lib/crypto'
import {
  parseAllergies,
  serializeAllergies,
  normalizeBloodType,
  cpfSchema,
  bloodTypeSchema,
  formatCPF,
  parseBirthDateYYYYMMDDToNoonUtc,
  serializeBirthDateToIsoNoonUtc,
} from '@/lib/patient-schemas'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import type { Address } from '@prisma/client'
import type { BloodType } from '@/types'

type PatientLookup = {
  patientId: string | null
  email: string | null
}

interface PatientResponse {
  id: string
  name: string
  email: string
  phone: string | null
  cpf: string | null
  birthDate: string | null
  gender: string | null
  bloodType: BloodType | null
  allergies: string[]
  address: AddressResponse | null
  emergencyContact: EmergencyContactResponse | null
}

interface AddressResponse {
  street: string
  number: string
  complement: string | null
  neighborhood: string | null
  city: string
  state: string
  zipCode: string | null
}

interface EmergencyContactResponse {
  name: string
  phone: string | null
  relation: string
}

export const dynamic = 'force-dynamic'

const updateSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  birthDate: z.string().optional(),
  phone: z.string().min(8).max(20).optional(),
  cpf: cpfSchema.optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).nullable().optional(),
  bloodType: bloodTypeSchema.optional(),
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

    const lookup = await prisma.user.findUnique({
      where: { id: userId },
      select: { patientId: true, email: true },
    })

    const patientLookup: PatientLookup = {
      patientId: lookup?.patientId ?? null,
      email: lookup?.email ?? null,
    }

    const patient = patientLookup.patientId
      ? await prisma.patient.findUnique({
          where: { id: patientLookup.patientId },
          include: { addresses: true },
        })
      : patientLookup.email
        ? await prisma.patient.findFirst({
            where: { email: { equals: patientLookup.email, mode: 'insensitive' } },
            include: { addresses: true },
          })
        : null

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
      cpf: formatCPF(decrypt(patient.cpf as string | null)),
      birthDate: serializeBirthDateToIsoNoonUtc(patient.birthDate),
      gender: patient.gender,
      bloodType: normalizeBloodType(patient.bloodType),
      // the schema stores a free-form 'address' string and a relation 'addresses' -> we surface the primary address if present
      allergies: parseAllergies(decrypt(patient.allergies as string | null)),
      address: (patient.addresses && patient.addresses.length > 0) ? (() => {
        const primary = patient.addresses.find((a: Address) => a.isPrimary) || patient.addresses[0]
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
    logger.error('Erro ao buscar perfil do paciente:', error)
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

    const lookup = await prisma.user.findUnique({
      where: { id: userId },
      select: { patientId: true, email: true },
    })

    const patientLookup: PatientLookup = {
      patientId: lookup?.patientId ?? null,
      email: lookup?.email ?? null,
    }

    const patient = patientLookup.patientId
      ? await prisma.patient.findUnique({
          where: { id: patientLookup.patientId },
          include: { addresses: true },
        })
      : patientLookup.email
        ? await prisma.patient.findFirst({
            where: { email: { equals: patientLookup.email, mode: 'insensitive' } },
            include: { addresses: true },
          })
        : null

    if (!patient) {
      return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })
    }

    // Montar updates
    const patientUpdate: Prisma.PatientUpdateInput = {}
    if (data.name) patientUpdate.name = data.name
    if (data.birthDate) {
      const raw = String(data.birthDate).trim()
      const dateOnly = raw.slice(0, 10)
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
        patientUpdate.birthDate = parseBirthDateYYYYMMDDToNoonUtc(dateOnly)
      } else {
        const parsedDate = new Date(raw)
        if (isNaN(parsedDate.getTime())) {
          return NextResponse.json({ error: 'Data de nascimento inválida' }, { status: 400 })
        }
        patientUpdate.birthDate = parseBirthDateYYYYMMDDToNoonUtc(parsedDate.toISOString().slice(0, 10))
      }
    }
    if (data.phone) patientUpdate.phone = data.phone
    if (data.cpf) {
      patientUpdate.cpf = encrypt(data.cpf)
      patientUpdate.cpfHash = hashCPF(data.cpf)
    }
    if (data.gender != null) patientUpdate.gender = data.gender
    if (data.bloodType) patientUpdate.bloodType = normalizeBloodType(data.bloodType)
    if (data.allergies && data.allergies.length > 0) {
      patientUpdate.allergies = encrypt(serializeAllergies(data.allergies))
    }
    if (data.emergencyContact) patientUpdate.emergencyContact = JSON.stringify(data.emergencyContact)

    // Atualizar endereço primário
    if (data.address) {
      const normalizedZip = data.address.zipCode ? data.address.zipCode.replace(/\D/g, '') : ''
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
            zipCode: normalizedZip || null,
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
            zipCode: normalizedZip || null,
            isPrimary: true,
          },
        })
      }
    }

    // Atualizar paciente
    let updated
    try {
      updated = await prisma.patient.update({
        where: { id: patient.id },
        data: patientUpdate,
        include: { addresses: true },
      })
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        const target = Array.isArray(e.meta?.target) ? e.meta?.target : []
        if (target.includes('cpfHash')) {
          return NextResponse.json(
            { error: 'CPF já cadastrado para outro paciente' },
            { status: 409 }
          )
        }
      }
      throw e
    }

    return NextResponse.json({
      success: true,
      message: 'Dados atualizados com sucesso',
      patient: {
        id: updated.id,
        phone: updated.phone,
        cpf: formatCPF(decrypt(updated.cpf as string | null)),
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
          const primary = updated.addresses.find((a: Address) => a.isPrimary) || updated.addresses[0]
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
    logger.error('Erro ao atualizar perfil do paciente:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar perfil' },
      { status: 500 }
    )
  }
}
