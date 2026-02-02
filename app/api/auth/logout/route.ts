/**
 * API de Logout com Auditoria LGPD
 * Registra o evento de logout antes de encerrar a sessão
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    const ipAddress = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'
    
    if (session?.user) {
      // Registrar logout na auditoria
      await prisma.auditLog.create({
        data: {
          userId: session.user.id || 'unknown',
          userEmail: session.user.email || 'unknown',
          userRole: session.user.role || 'USER',
          action: 'LOGOUT',
          resourceType: 'Authentication',
          success: true,
          ipAddress,
          userAgent,
          metadata: {
            sessionEnd: new Date().toISOString()
          }
        }
      })
      
      logger.info({ 
        userId: session.user.id, 
        email: session.user.email 
      }, 'Logout registrado com sucesso')
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Logout registrado' 
    })
  } catch (error) {
    logger.error({ error }, 'Erro ao registrar logout')
    // Não falhar o logout por erro de auditoria
    return NextResponse.json({ 
      success: true, 
      message: 'Logout processado' 
    })
  }
}
