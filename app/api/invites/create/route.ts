import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import { emailService } from '@/lib/email-service'
import crypto from 'crypto'

// Instância própria do Prisma para evitar problemas de bundling
const globalForInvites = globalThis as typeof globalThis & {
  invitesPrisma?: PrismaClient
}

function getInvitesPrisma(): PrismaClient {
  if (!globalForInvites.invitesPrisma) {
    globalForInvites.invitesPrisma = new PrismaClient({
      log: ['error']
    })
  }
  return globalForInvites.invitesPrisma
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  // Check permissions (optional, for now just allow authenticated users)
  // if (session.user.role !== 'ADMIN' && session.user.role !== 'RECEPTIONIST') ...

  try {
    const prisma = getInvitesPrisma()
    const body = await req.json()
    const { email, role } = body

    if (!email) {
      return new NextResponse('Email is required', { status: 400 })
    }

    // Check if invite already exists and is pending
    const existingInvite = await prisma.registrationInvite.findFirst({
      where: {
        email,
        status: 'PENDING',
        expiresAt: { gt: new Date() }
      }
    })

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'

    if (existingInvite) {
      return NextResponse.json({
        inviteId: existingInvite.id,
        token: existingInvite.token,
        link: `${baseUrl}/register/${existingInvite.token}`
      })
    }

    // Generate token
    const token = crypto.randomBytes(32).toString('hex')
    
    // Set expiration (e.g., 7 days)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const invite = await prisma.registrationInvite.create({
      data: {
        email,
        role: role || 'PATIENT',
        token,
        expiresAt,
        status: 'PENDING'
      }
    })

    // Tentar enviar e-mail (não falha a requisição se o e-mail falhar)
    const link = `${baseUrl}/register/${invite.token}`
    try {
      await emailService.sendInviteEmail(email, link)
    } catch (emailError) {
      console.error('[invites] Failed to send invite email:', emailError)
    }

    return NextResponse.json({
      inviteId: invite.id,
      token: invite.token,
      link
    })

  } catch (error) {
    console.error('Error creating invite:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
