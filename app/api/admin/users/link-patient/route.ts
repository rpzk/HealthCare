import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  assertUserAcceptedTerms,
  getAudienceForRole,
} from '@/lib/terms-enforcement'
import { termsEnforcementErrorResponse } from '@/lib/terms-http'
import { logger } from '@/lib/logger'
import { encrypt, hashCPF } from '@/lib/crypto'
import { normalizeCPF, parseBirthDateYYYYMMDDToNoonUtc } from '@/lib/patient-schemas'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST - Vincular usuário a paciente (criar novo ou vincular existente)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    try {
      await assertUserAcceptedTerms({
        prisma,
        userId: session.user.id,
        audience: getAudienceForRole(session.user.role),
        gates: ['ADMIN_PRIVILEGED'],
      })
    } catch (e) {
      const res = termsEnforcementErrorResponse(e)
      if (res) return res
      throw e
    }

    const body = await req.json()
    const { userId, action, patientId, patientData } = body

    // Verificar se usuário existe
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { patient: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    // Verificar se já está vinculado
    if (user.patientId) {
      return NextResponse.json({ 
        error: 'Este usuário já está vinculado a um paciente' 
      }, { status: 400 })
    }

    let linkedPatientId: string

    if (action === 'create') {
      // Criar novo paciente
      const { name, cpf, birthDate, gender, phone, address } = patientData

      if (!name) {
        return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
      }

      // Verificar se CPF já existe
      if (cpf) {
        const cpfDigits = normalizeCPF(String(cpf))
        const cpfHash = hashCPF(cpfDigits)
        const existingPatient = await prisma.patient.findFirst({
          where: {
            OR: [
              cpfHash ? { cpfHash } : undefined,
              { person: { cpf: cpfDigits } },
            ].filter(Boolean) as any,
          }
        })
        if (existingPatient) {
          return NextResponse.json({ 
            error: 'Já existe um paciente com este CPF' 
          }, { status: 400 })
        }
      }

      // Validar data de nascimento (obrigatória)
      if (!birthDate) {
        return NextResponse.json({ 
          error: 'Data de nascimento é obrigatória' 
        }, { status: 400 })
      }

      // Criar paciente
      const birth = parseBirthDateYYYYMMDDToNoonUtc(String(birthDate))
      const cpfDigits = cpf ? normalizeCPF(String(cpf)) : null
      const newPatient = await prisma.patient.create({
        data: {
          name,
          cpf: cpfDigits ? encrypt(cpfDigits) : null,
          cpfHash: cpfDigits ? hashCPF(cpfDigits) : null,
          birthDate: birth,
          gender: gender || 'OTHER',
          phone: phone || null,
          email: user.email,
        }
      })

      linkedPatientId = newPatient.id

      // Atualizar usuário com o patientId
      await prisma.user.update({
        where: { id: userId },
        data: { patientId: newPatient.id }
      })

    } else if (action === 'link') {
      // Vincular paciente existente
      if (!patientId) {
        return NextResponse.json({ error: 'ID do paciente é obrigatório' }, { status: 400 })
      }

      const patient = await prisma.patient.findUnique({
        where: { id: patientId }
      })

      if (!patient) {
        return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })
      }

      // Verificar se paciente já está vinculado a outro usuário (link real é User.patientId)
      const alreadyLinked = await prisma.user.findFirst({
        where: { patientId },
        select: { id: true },
      })
      if (alreadyLinked && alreadyLinked.id !== userId) {
        return NextResponse.json({ error: 'Este paciente já está vinculado a outro usuário' }, { status: 400 })
      }

      linkedPatientId = patientId

      // Atualizar usuário com o patientId
      await prisma.user.update({
        where: { id: userId },
        data: { patientId: patientId }
      })

    } else {
      return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true, 
      patientId: linkedPatientId,
      message: 'Paciente vinculado com sucesso' 
    })

  } catch (error) {
    logger.error('Erro ao vincular paciente:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
