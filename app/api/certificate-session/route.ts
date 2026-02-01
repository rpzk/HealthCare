/**
 * API de Sessão de Certificado Digital
 * 
 * Gerencia a sessão de autenticação do certificado A1:
 * - POST: Iniciar sessão (autenticar com senha)
 * - GET: Verificar status da sessão
 * - DELETE: Encerrar sessão
 * - PATCH: Bloquear/desbloquear sessão
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import {
  startCertificateSession,
  getCertificateSessionInfo,
  lockCertificateSession,
  unlockCertificateSession,
  endCertificateSession,
  CERTIFICATE_SESSION_CONFIG,
} from '@/lib/certificate-session'
import { z } from 'zod'

// ============================================
// POST - INICIAR SESSÃO DO CERTIFICADO
// ============================================

const StartSessionSchema = z.object({
  password: z.string().min(1, 'Senha do certificado obrigatória'),
  duration: z.number().optional(), // Duração em horas (1-12)
  inactivityTimeout: z.number().optional(), // Timeout de inatividade em minutos
})

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    
    const userId = session.user.id
    
    // Validar input
    const body = await req.json()
    const validation = StartSessionSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: validation.error.errors },
        { status: 400 }
      )
    }
    
    const { password, duration, inactivityTimeout } = validation.data
    
    // Verificar se usuário tem certificado A1
    const certificate = await prisma.digitalCertificate.findFirst({
      where: { userId, isActive: true, certificateType: 'A1' },
      select: { id: true, pfxPasswordHash: true, notAfter: true, subject: true },
    })
    
    if (!certificate) {
      return NextResponse.json(
        { error: 'Certificado A1 não encontrado', details: 'Configure seu certificado nas configurações' },
        { status: 400 }
      )
    }
    
    // Verificar validade do certificado
    if (certificate.notAfter < new Date()) {
      return NextResponse.json(
        { error: 'Certificado expirado', details: `Validade: ${certificate.notAfter.toLocaleDateString('pt-BR')}` },
        { status: 400 }
      )
    }
    
    // Validar senha do certificado
    const passwordHash = crypto
      .createHash('sha256')
      .update(password)
      .digest('hex')
    
    if (certificate.pfxPasswordHash && passwordHash !== certificate.pfxPasswordHash) {
      return NextResponse.json(
        { error: 'Senha do certificado incorreta' },
        { status: 401 }
      )
    }
    
    // Iniciar sessão
    const result = await startCertificateSession(userId, password, {
      duration: duration ? duration * 3600 : undefined, // Converter horas para segundos
      inactivityTimeout: inactivityTimeout ? inactivityTimeout * 60 : undefined, // Converter minutos para segundos
    })
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Erro ao iniciar sessão' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      message: 'Sessão do certificado iniciada',
      expiresAt: result.expiresAt,
      certificate: {
        subject: certificate.subject,
        validUntil: certificate.notAfter,
      },
    })
    
  } catch (error) {
    console.error('Erro ao iniciar sessão do certificado:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// ============================================
// GET - VERIFICAR STATUS DA SESSÃO
// ============================================

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    
    const userId = session.user.id
    
    // Verificar se tem certificado
    const certificate = await prisma.digitalCertificate.findFirst({
      where: { userId, isActive: true, certificateType: 'A1' },
      select: { 
        id: true, 
        subject: true, 
        notAfter: true, 
        issuer: true,
        lastUsedAt: true,
        usageCount: true,
      },
    })
    
    if (!certificate) {
      return NextResponse.json({
        hasCertificate: false,
        session: { active: false },
      })
    }
    
    // Verificar sessão
    const sessionInfo = await getCertificateSessionInfo(userId)
    
    return NextResponse.json({
      hasCertificate: true,
      certificate: {
        subject: certificate.subject,
        issuer: certificate.issuer,
        validUntil: certificate.notAfter,
        lastUsedAt: certificate.lastUsedAt,
        usageCount: certificate.usageCount,
        isExpired: certificate.notAfter < new Date(),
      },
      session: {
        active: sessionInfo.active,
        locked: sessionInfo.locked || false,
        createdAt: sessionInfo.createdAt,
        expiresAt: sessionInfo.expiresAt,
        lastActivity: sessionInfo.lastActivity,
        remainingTime: sessionInfo.remainingTime,
        remainingTimeFormatted: sessionInfo.remainingTime 
          ? formatRemainingTime(sessionInfo.remainingTime)
          : undefined,
      },
      config: {
        maxSessionDuration: CERTIFICATE_SESSION_CONFIG.MAX_SESSION_DURATION / 3600, // em horas
        defaultSessionDuration: CERTIFICATE_SESSION_CONFIG.DEFAULT_SESSION_DURATION / 3600,
        inactivityTimeout: CERTIFICATE_SESSION_CONFIG.INACTIVITY_TIMEOUT / 60, // em minutos
      },
    })
    
  } catch (error) {
    console.error('Erro ao verificar sessão:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// ============================================
// PATCH - BLOQUEAR/DESBLOQUEAR SESSÃO
// ============================================

const PatchSessionSchema = z.object({
  action: z.enum(['lock', 'unlock']),
  password: z.string().optional(), // Necessário apenas para unlock
})

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    
    const userId = session.user.id
    
    const body = await req.json()
    const validation = PatchSessionSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: validation.error.errors },
        { status: 400 }
      )
    }
    
    const { action, password } = validation.data
    
    if (action === 'lock') {
      const success = await lockCertificateSession(userId)
      
      return NextResponse.json({
        success,
        message: success ? 'Certificado bloqueado' : 'Erro ao bloquear',
      })
      
    } else if (action === 'unlock') {
      if (!password) {
        return NextResponse.json(
          { error: 'Senha necessária para desbloquear' },
          { status: 400 }
        )
      }
      
      const result = await unlockCertificateSession(userId, password)
      
      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 401 }
        )
      }
      
      return NextResponse.json({
        success: true,
        message: 'Certificado desbloqueado',
      })
    }
    
    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
    
  } catch (error) {
    console.error('Erro ao atualizar sessão:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// ============================================
// DELETE - ENCERRAR SESSÃO
// ============================================

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    
    const userId = session.user.id
    
    const success = await endCertificateSession(userId)
    
    return NextResponse.json({
      success,
      message: success ? 'Sessão encerrada' : 'Erro ao encerrar sessão',
    })
    
  } catch (error) {
    console.error('Erro ao encerrar sessão:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// ============================================
// HELPERS
// ============================================

function formatRemainingTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}min`
  
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  
  return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`
}
