import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

// Instância própria do Prisma para evitar problemas de bundling
const globalForRegister = globalThis as typeof globalThis & {
  registerPrisma?: PrismaClient
}

function getRegisterPrisma(): PrismaClient {
  if (!globalForRegister.registerPrisma) {
    globalForRegister.registerPrisma = new PrismaClient({
      log: ['error']
    })
  }
  return globalForRegister.registerPrisma
}

export async function POST(req: Request) {
  try {
    const prisma = getRegisterPrisma()
    const body = await req.json()
    const { token, name, cpf, phone, birthDate, gender, password, acceptedTerms } = body

    if (!token || !name || !cpf || !password || !acceptedTerms) {
      return new NextResponse('Missing required fields', { status: 400 })
    }

    // Validate invite
    const invite = await prisma.registrationInvite.findUnique({
      where: { token }
    })

    if (!invite || invite.status !== 'PENDING' || invite.expiresAt < new Date()) {
      return new NextResponse('Invalid or expired invite', { status: 400 })
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: invite.email }
    })

    if (existingUser) {
      return new NextResponse('User already exists', { status: 400 })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Transaction to create User, Person, TermAcceptances and update Invite
    await prisma.$transaction(async (tx) => {
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
              role: invite.role === 'PATIENT' ? 'OTHER' : invite.role,
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
        await tx.patient.create({
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
      }

      // Record Term Acceptances
      if (Array.isArray(acceptedTerms)) {
        for (const termId of acceptedTerms) {
          await tx.termAcceptance.create({
            data: {
              userId: person.user.id,
              termId: termId,
              ipAddress: '0.0.0.0', // Should get from request headers
              userAgent: 'Browser' // Should get from request headers
            }
          })
        }
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
    return new NextResponse(error.message || 'Internal Server Error', { status: 500 })
  }
}
