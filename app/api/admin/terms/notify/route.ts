/**
 * API para Notificar Usuários sobre Novos Termos (LGPD)
 * POST: Cria notificações para todos os usuários afetados por um novo termo
 * GET: Lista termos que precisam de notificação
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'

// GET - Lista termos ativos que têm usuários sem aceite
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || !['ADMIN', 'MANAGER'].includes(session.user.role || '')) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // Buscar termos ativos
    const activeTerms = await prisma.term.findMany({
      where: { isActive: true },
      select: {
        id: true,
        slug: true,
        title: true,
        version: true,
        audience: true,
        updatedAt: true,
        _count: {
          select: { acceptances: true }
        }
      },
      orderBy: { updatedAt: 'desc' }
    })

    // Contar usuários por audience
    const [totalUsers, totalPatients] = await Promise.all([
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ where: { isActive: true, role: 'PATIENT' } })
    ])

    const termsWithStats = await Promise.all(
      activeTerms.map(async (term) => {
        // Contar usuários elegíveis que não aceitaram
        let eligibleCount = totalUsers
        if (term.audience === 'PATIENT') {
          eligibleCount = totalPatients
        } else if (term.audience === 'PROFESSIONAL') {
          eligibleCount = totalUsers - totalPatients
        }

        const pendingCount = eligibleCount - term._count.acceptances
        
        return {
          id: term.id,
          slug: term.slug,
          title: term.title,
          version: term.version,
          audience: term.audience,
          updatedAt: term.updatedAt,
          totalAcceptances: term._count.acceptances,
          pendingAcceptances: Math.max(0, pendingCount),
          eligibleUsers: eligibleCount
        }
      })
    )

    return NextResponse.json({
      terms: termsWithStats,
      summary: {
        totalTerms: activeTerms.length,
        totalUsers,
        totalPatients
      }
    })
  } catch (error) {
    logger.error({ error }, 'Erro ao listar termos para notificação')
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// POST - Criar notificações para usuários que não aceitaram um termo
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || !['ADMIN', 'MANAGER'].includes(session.user.role || '')) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const body = await request.json()
    const { termId } = body

    if (!termId) {
      return NextResponse.json({ error: 'termId é obrigatório' }, { status: 400 })
    }

    // Buscar o termo
    const term = await prisma.term.findUnique({
      where: { id: termId },
      select: {
        id: true,
        slug: true,
        title: true,
        version: true,
        audience: true
      }
    })

    if (!term) {
      return NextResponse.json({ error: 'Termo não encontrado' }, { status: 404 })
    }

    // Buscar usuários que já aceitaram
    const acceptedUserIds = await prisma.termAcceptance.findMany({
      where: { termId },
      select: { userId: true }
    }).then(list => list.map(a => a.userId))

    // Definir filtro de usuários por audience
    let userFilter: any = { isActive: true }
    if (term.audience === 'PATIENT') {
      userFilter.role = 'PATIENT'
    } else if (term.audience === 'PROFESSIONAL') {
      userFilter.role = { notIn: ['PATIENT'] }
    }

    // Excluir quem já aceitou
    if (acceptedUserIds.length > 0) {
      userFilter.id = { notIn: acceptedUserIds }
    }

    // Buscar usuários que precisam aceitar
    const usersToNotify = await prisma.user.findMany({
      where: userFilter,
      select: { id: true, email: true, name: true }
    })

    if (usersToNotify.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Todos os usuários elegíveis já aceitaram este termo',
        notifiedCount: 0
      })
    }

    // Verificar notificações já enviadas para este termo (evitar spam)
    const existingNotifications = await prisma.notification.findMany({
      where: {
        type: 'TERM_UPDATE',
        metadata: {
          path: ['termId'],
          equals: termId
        }
      },
      select: { userId: true }
    })
    const alreadyNotifiedIds = new Set(existingNotifications.map(n => n.userId))

    // Filtrar usuários que ainda não foram notificados
    const usersToActuallyNotify = usersToNotify.filter(u => !alreadyNotifiedIds.has(u.id))

    if (usersToActuallyNotify.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Todos os usuários elegíveis já foram notificados',
        notifiedCount: 0,
        alreadyNotifiedCount: usersToNotify.length
      })
    }

    // Criar notificações em batch
    const notifications = usersToActuallyNotify.map(user => ({
      userId: user.id,
      type: 'TERM_UPDATE',
      priority: 'high',
      title: '📋 Novos Termos Disponíveis',
      message: `O termo "${term.title}" (versão ${term.version}) foi atualizado e requer sua aceitação para continuar usando o sistema.`,
      metadata: {
        termId: term.id,
        termSlug: term.slug,
        termTitle: term.title,
        termVersion: term.version,
        actionUrl: '/terms/accept'
      },
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 dias
    }))

    await prisma.notification.createMany({
      data: notifications
    })

    // Registrar auditoria
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        userEmail: session.user.email || '',
        userRole: session.user.role || 'ADMIN',
        action: 'TERM_NOTIFICATION_SENT',
        resourceType: 'Term',
        resourceId: termId,
        success: true,
        metadata: {
          termTitle: term.title,
          termVersion: term.version,
          notifiedUsers: usersToActuallyNotify.length
        }
      }
    })

    logger.info({ 
      termId, 
      termTitle: term.title, 
      notifiedCount: usersToActuallyNotify.length 
    }, 'Notificações de termo enviadas')

    return NextResponse.json({
      success: true,
      message: `Notificações enviadas para ${usersToActuallyNotify.length} usuários`,
      notifiedCount: usersToActuallyNotify.length,
      skippedCount: alreadyNotifiedIds.size
    }, { status: 201 })

  } catch (error) {
    logger.error({ error }, 'Erro ao enviar notificações de termo')
    return NextResponse.json({ error: 'Erro ao processar notificações' }, { status: 500 })
  }
}
