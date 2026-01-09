import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { TermAudience } from '@prisma/client'

export async function POST(req: Request) {
  try {
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      null
    const userAgent = req.headers.get('user-agent') || null
    const body = await req.json()
    const { token, name, cpf, phone, birthDate, gender, password, acceptedTerms, biometricConsents } = body

    if (!token || !name || !cpf || !password || !acceptedTerms) {
      return NextResponse.json(
        { error: 'Campos obrigatórios não preenchidos', code: 'MISSING_FIELDS' },
        { status: 400 }
      )
    }

    if (!Array.isArray(acceptedTerms)) {
      return NextResponse.json(
        { error: 'acceptedTerms deve ser uma lista', code: 'INVALID_TERMS' },
        { status: 400 }
      )
    }

    // Validate invite
    const invite = await prisma.registrationInvite.findUnique({
      where: { token }
    })

    if (!invite || invite.status !== 'PENDING' || invite.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Convite inválido ou expirado', code: 'INVALID_INVITE' },
        { status: 400 }
      )
    }

    const audience = invite.role === 'PATIENT' ? TermAudience.PATIENT : TermAudience.PROFESSIONAL

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: invite.email },
      include: { patient: true }
    })

    if (existingUser) {
      // Se já existe E já é paciente
      if (existingUser.patient) {
        return NextResponse.json(
          { error: 'Você já possui cadastro. Faça login para acessar o sistema.', code: 'USER_IS_PATIENT' },
          { status: 400 }
        )
      }
      // Se existe mas NÃO é paciente, sugerir ativar perfil
      return NextResponse.json(
        { 
          error: 'Você já possui uma conta no sistema. Faça login e acesse "Perfil → Ativar Perfil de Paciente" para completar seu cadastro como paciente.',
          code: 'USER_EXISTS_NOT_PATIENT',
          loginUrl: '/auth/login'
        },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Transaction to create User, Person, TermAcceptances and update Invite
    await prisma.$transaction(async (tx) => {
      // Required active terms for this audience
      const requiredTerms = await tx.term.findMany({
        where: {
          isActive: true,
          OR: [{ audience: TermAudience.ALL }, { audience }],
        },
        select: {
          id: true,
          slug: true,
          title: true,
          version: true,
          content: true,
        },
      })

      const requiredTermIds = new Set(requiredTerms.map((t) => t.id))
      const acceptedTermIds = new Set(acceptedTerms.filter((t: unknown) => typeof t === 'string'))

      if (acceptedTermIds.size !== acceptedTerms.length) {
        throw new Error('acceptedTerms contém valores inválidos')
      }

      const missing = requiredTerms.filter((t) => !acceptedTermIds.has(t.id))
      if (missing.length > 0) {
        throw new Error('Você precisa aceitar todos os termos obrigatórios')
      }

      const extra = acceptedTerms.filter((id: string) => !requiredTermIds.has(id))
      if (extra.length > 0) {
        throw new Error('acceptedTerms contém termos não reconhecidos')
      }

      // Create Person first (Person-centric model)
      const person = await tx.person.create({
        data: {
          name,
          cpf,
          email: invite.email,
          phone,
          birthDate: birthDate ? new Date(birthDate) : undefined,
          gender: gender as any,
          // Create User linked to Person
          user: {
            create: {
              email: invite.email,
              name,
              password: hashedPassword,
              role: invite.role, // Manter o role do convite (incluindo PATIENT)
              isActive: true,
            }
          }
        },
        include: {
          user: true
        }
      })

      if (!person.user) {
        throw new Error('Failed to create user')
      }

      // If role is PATIENT, create Patient record
      if (invite.role === 'PATIENT') {
        const patient = await tx.patient.create({
          data: {
            name,
            email: invite.email,
            cpf,
            phone,
            birthDate: new Date(birthDate),
            gender: gender as any,
            userId: person.user.id,
            personId: person.id
          }
        })

        // Create biometric consents if provided
        // Map frontend consent types to BiometricDataType enum values
        if (biometricConsents && typeof biometricConsents === 'object') {
          const consentMapping: Record<string, string[]> = {
            'FACIAL_RECOGNITION': [], // Not stored as biometric data type
            'FINGERPRINT': [],        // Not stored as biometric data type
            'VOICE_RECOGNITION': [],  // Not stored as biometric data type
            'VITAL_SIGNS': ['HEART_RATE', 'BLOOD_PRESSURE', 'OXYGEN_SATURATION', 'BODY_TEMPERATURE']
          }
          
          for (const [frontendType, dataTypes] of Object.entries(consentMapping)) {
            const isGranted = biometricConsents[frontendType] === true
            for (const dataType of dataTypes) {
              await tx.patientBiometricConsent.create({
                data: {
                  patientId: patient.id,
                  dataType: dataType as 'HEART_RATE' | 'BLOOD_PRESSURE' | 'OXYGEN_SATURATION' | 'BODY_TEMPERATURE',
                  isGranted,
                  grantedAt: isGranted ? new Date() : null,
                  purpose: `Monitoramento de ${dataType.toLowerCase().replace('_', ' ')} via dispositivos vestíveis`,
                  ipAddress,
                  userAgent
                }
              })
            }
          }
        }
      }

      // Record Term Acceptances
      for (const term of requiredTerms) {
        await tx.termAcceptance.create({
          data: {
            userId: person.user.id,
            termId: term.id,
            termSlug: term.slug,
            termTitle: term.title,
            termVersion: term.version,
            termContent: term.content,
            ipAddress,
            userAgent,
          }
        })
      }

      // Mark invite as used
      await tx.registrationInvite.update({
        where: { id: invite.id },
        data: { status: 'USED' }
      })
    })

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
