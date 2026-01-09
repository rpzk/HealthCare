import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { emailService } from '@/lib/email-service'
import crypto from 'crypto'

// Roles que podem convidar e quem podem convidar
const INVITE_PERMISSIONS: Record<string, string[]> = {
  ADMIN: ['ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'PATIENT'],
  DOCTOR: ['PATIENT'],
  NURSE: ['PATIENT'],
  RECEPTIONIST: ['PATIENT'],
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const userRole = (session.user as { role?: string }).role || 'PATIENT'
  const allowedRoles = INVITE_PERMISSIONS[userRole] || []

  if (allowedRoles.length === 0) {
    return NextResponse.json({ error: 'Você não tem permissão para enviar convites' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { email, role = 'PATIENT' } = body

    if (!email) {
      return NextResponse.json({ error: 'Email é obrigatório' }, { status: 400 })
    }

    // Verificar se o usuário pode convidar esse role
    if (!allowedRoles.includes(role)) {
      return NextResponse.json({ 
        error: `Você não tem permissão para convidar ${role}. Permitidos: ${allowedRoles.join(', ')}` 
      }, { status: 403 })
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
      // Mesmo com convite existente, reenvia o email
      const existingLink = `${baseUrl}/register/${existingInvite.token}`
      console.log('[invites] Convite existente encontrado, reenviando email para:', email)
      try {
        const emailSent = await emailService.sendInviteEmail(email, existingLink)
        console.log('[invites] Reenvio resultado:', emailSent ? '✅ Sucesso' : '❌ Falhou')
      } catch (emailError) {
        console.error('[invites] Failed to resend invite email:', emailError)
      }
      
      return NextResponse.json({
        inviteId: existingInvite.id,
        token: existingInvite.token,
        link: existingLink
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
    console.log('[invites] Tentando enviar e-mail de convite para:', email)
    try {
      const emailSent = await emailService.sendInviteEmail(email, link)
      console.log('[invites] Resultado do envio:', emailSent ? '✅ Sucesso' : '❌ Falhou')
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
