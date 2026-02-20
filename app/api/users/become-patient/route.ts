import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { BiometricDataType } from '@prisma/client'
import { logger } from '@/lib/logger'
import { encrypt, hashCPF } from '@/lib/crypto'
import { normalizeCPF, parseBirthDateYYYYMMDDToNoonUtc, serializeAllergies } from '@/lib/patient-schemas'

// POST - Usuário existente ativa seu perfil de paciente
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      birthDate, 
      gender, 
      phone, 
      cpf,
      address,
      emergencyContact,
      allergies,
      medicalHistory,
      currentMedications,
      biometricConsents = [] 
    } = body

    // Verificar se já é paciente
    const existingUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { patient: true }
    })

    if (existingUser?.patient) {
      return NextResponse.json(
        { error: 'Você já possui um perfil de paciente ativo' },
        { status: 400 }
      )
    }

    // Validações básicas
    if (!birthDate || !gender) {
      return NextResponse.json(
        { error: 'Data de nascimento e gênero são obrigatórios' },
        { status: 400 }
      )
    }

    // Verificar se CPF já existe (se fornecido)
    if (cpf) {
      const cpfDigits = normalizeCPF(String(cpf))
      const cpfHash = hashCPF(cpfDigits)
      const existingCpf = await prisma.patient.findFirst({
        where: {
          OR: [
            cpfHash ? { cpfHash } : undefined,
            { person: { cpf: cpfDigits } },
          ].filter(Boolean) as any,
        }
      })
      if (existingCpf) {
        return NextResponse.json(
          { error: 'CPF já cadastrado no sistema' },
          { status: 400 }
        )
      }
    }

    // Obter IP e User Agent para auditoria
    const ipAddress = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    const now = new Date()

    // Criar paciente e vincular ao usuário em uma transação
    const result = await prisma.$transaction(async (tx) => {
      const birth = parseBirthDateYYYYMMDDToNoonUtc(String(birthDate))
      const cpfDigits = cpf ? normalizeCPF(String(cpf)) : null

      // 1. Criar registro de paciente
      const patient = await tx.patient.create({
        data: {
          name: existingUser!.name,
          email: existingUser!.email,
          birthDate: birth,
          gender,
          phone: phone || existingUser!.phone,
          cpf: cpfDigits ? encrypt(cpfDigits) : null,
          cpfHash: cpfDigits ? hashCPF(cpfDigits) : null,
          address,
          emergencyContact: emergencyContact
            ? (typeof emergencyContact === 'string' ? emergencyContact : JSON.stringify(emergencyContact))
            : null,
          allergies: Array.isArray(allergies)
            ? encrypt(serializeAllergies(allergies))
            : (typeof allergies === 'string' && allergies.trim() ? encrypt(allergies) : null),
          medicalHistory: typeof medicalHistory === 'string' && medicalHistory.trim() ? encrypt(medicalHistory) : null,
          currentMedications: typeof currentMedications === 'string' && currentMedications.trim() ? encrypt(currentMedications) : null
        }
      })

      // 2. Vincular paciente ao usuário
      await tx.user.update({
        where: { id: session.user.id },
        data: { patientId: patient.id }
      })

      // 3. Criar consentimentos biométricos
      const consentPromises = (biometricConsents as string[]).map(dataType =>
        tx.patientBiometricConsent.create({
          data: {
            patientId: patient.id,
            dataType: dataType as BiometricDataType,
            isGranted: true,
            grantedAt: now,
            purpose: 'Auto-monitoramento de saúde',
            ipAddress,
            userAgent
          }
        })
      )
      await Promise.all(consentPromises)

      return patient
    })

    return NextResponse.json({
      success: true,
      message: 'Perfil de paciente ativado com sucesso!',
      patient: {
        id: result.id,
        name: result.name
      }
    }, { status: 201 })

  } catch (error) {
    logger.error('Error creating patient profile:', error)
    return NextResponse.json(
      { error: 'Erro ao criar perfil de paciente' },
      { status: 500 }
    )
  }
}

// GET - Verificar se usuário já é paciente
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { 
        patient: {
          include: {
            biometricConsents: true
          }
        }
      }
    })

    return NextResponse.json({
      isPatient: !!user?.patient,
      patient: user?.patient || null
    })

  } catch (error) {
    logger.error('Error checking patient status:', error)
    return NextResponse.json(
      { error: 'Erro ao verificar status' },
      { status: 500 }
    )
  }
}
