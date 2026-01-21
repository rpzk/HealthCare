import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { EmailService } from '@/lib/email-service'
import {
  assertUserAcceptedTerms,
  getAudienceForRole,
} from '@/lib/terms-enforcement'
import { termsEnforcementErrorResponse } from '@/lib/terms-http'
import { logger } from '@/lib/logger'

interface RouteParams {
  params: { id: string }
}

// GET - Detalhes de um profissional
export async function GET(req: Request, { params }: RouteParams) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const userRole = (session.user as { role?: string }).role
  if (userRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Apenas administradores podem acessar' }, { status: 403 })
  }

  try {
    await assertUserAcceptedTerms({
      prisma,
      userId: (session.user as any).id,
      audience: getAudienceForRole(userRole),
      gates: ['ADMIN_PRIVILEGED'],
    })
  } catch (e) {
    const res = termsEnforcementErrorResponse(e)
    if (res) return res
    throw e
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        speciality: true,
        phone: true,
        crmNumber: true,
        _count: {
          select: {
            consultations: true,
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'Profissional não encontrado' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: user })
  } catch (error) {
    logger.error('[staff] Error:', error)
    return NextResponse.json({ error: 'Erro ao buscar profissional' }, { status: 500 })
  }
}

// PATCH - Atualizar profissional (status, role, etc)
export async function PATCH(req: Request, { params }: RouteParams) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const userRole = (session.user as { role?: string }).role
  if (userRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Apenas administradores podem editar' }, { status: 403 })
  }

  try {
    await assertUserAcceptedTerms({
      prisma,
      userId: (session.user as any).id,
      audience: getAudienceForRole(userRole),
      gates: ['ADMIN_PRIVILEGED'],
    })
  } catch (e) {
    const res = termsEnforcementErrorResponse(e)
    if (res) return res
    throw e
  }

  try {
    const body = await req.json()
    const { action, ...data } = body

    // Ações especiais
    if (action === 'toggle-status') {
      const user = await prisma.user.findUnique({ where: { id: params.id } })
      if (!user) {
        return NextResponse.json({ error: 'Profissional não encontrado' }, { status: 404 })
      }
      
      const updated = await prisma.user.update({
        where: { id: params.id },
        data: { isActive: !user.isActive },
        select: { id: true, name: true, isActive: true }
      })
      
      return NextResponse.json({ 
        success: true, 
        message: `${updated.name} foi ${updated.isActive ? 'ativado' : 'desativado'}`,
        data: updated 
      })
    }

    if (action === 'reset-password') {
      // Gerar senha temporária
      const tempPassword = crypto.randomBytes(4).toString('hex') // 8 chars
      const hashedPassword = await bcrypt.hash(tempPassword, 10)
      
      const updated = await prisma.user.update({
        where: { id: params.id },
        data: { password: hashedPassword },
        select: { id: true, name: true, email: true }
      })

      // Enviar a senha temporária por e-mail (nunca expor na resposta HTTP)
      const emailService = EmailService.getInstance()
      await emailService.sendEmail({
        to: updated.email,
        subject: 'Sua senha temporária - HealthCare',
        html: `
          <div style="font-family: sans-serif; color: #333;">
            <h2>Olá, ${updated.name}!</h2>
            <p>Uma senha temporária foi gerada para sua conta.</p>
            <p><strong>Senha temporária:</strong> ${tempPassword}</p>
            <p>Por favor, acesse o sistema e altere sua senha imediatamente.</p>
          </div>
        `,
        text: `Olá, ${updated.name}. Sua senha temporária é: ${tempPassword}. Acesse o sistema e altere-a imediatamente.`
      })

      return NextResponse.json({ 
        success: true, 
        message: `Senha resetada para ${updated.name} e enviada por e-mail`
      })
    }

    // Atualização normal de dados
    const allowedFields = ['name', 'email', 'role', 'speciality', 'phone', 'crmNumber', 'isActive']
    const updateData: Record<string, unknown> = {}
    
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        updateData[field] = data[field]
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 })
    }

    const updated = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        speciality: true,
        phone: true,
        crmNumber: true,
      }
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    logger.error('[staff] Error:', error)
    return NextResponse.json({ error: 'Erro ao atualizar profissional' }, { status: 500 })
  }
}

// DELETE - Remover profissional (soft delete = desativar)
export async function DELETE(req: Request, { params }: RouteParams) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const userRole = (session.user as { role?: string }).role
  if (userRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Apenas administradores podem remover' }, { status: 403 })
  }

  try {
    await assertUserAcceptedTerms({
      prisma,
      userId: (session.user as any).id,
      audience: getAudienceForRole(userRole),
      gates: ['ADMIN_PRIVILEGED'],
    })
  } catch (e) {
    const res = termsEnforcementErrorResponse(e)
    if (res) return res
    throw e
  }

  try {
    // Soft delete - apenas desativa
    const updated = await prisma.user.update({
      where: { id: params.id },
      data: { isActive: false },
      select: { id: true, name: true }
    })

    return NextResponse.json({ 
      success: true, 
      message: `${updated.name} foi desativado`
    })
  } catch (error) {
    logger.error('[staff] Error:', error)
    return NextResponse.json({ error: 'Erro ao remover profissional' }, { status: 500 })
  }
}
