/**
 * API de Logs de Auditoria
 * Acesso administrativo ao histórico de auditoria do sistema
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'

const ADMIN_ROLES = ['ADMIN', 'MANAGER', 'DPO']

// GET - Listar logs de auditoria
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || !ADMIN_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)
    const action = searchParams.get('action')
    const resourceType = searchParams.get('resourceType')
    const userId = searchParams.get('userId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const success = searchParams.get('success')
    const searchEmail = searchParams.get('email')

    // Construir filtros
    const where: any = {}
    
    if (action) {
      where.action = action
    }
    
    if (resourceType) {
      where.resourceType = resourceType
    }
    
    if (userId) {
      where.userId = userId
    }
    
    if (searchEmail) {
      where.userEmail = { contains: searchEmail, mode: 'insensitive' }
    }
    
    if (success !== null && success !== undefined) {
      where.success = success === 'true'
    }
    
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt.gte = new Date(startDate)
      if (endDate) where.createdAt.lte = new Date(endDate)
    }

    // Buscar logs
    const [logs, totalCount] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.auditLog.count({ where })
    ])

    // Estatísticas gerais (últimas 24h)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const [
      totalLast24h,
      failedLast24h,
      actionStats,
      uniqueUsers
    ] = await Promise.all([
      prisma.auditLog.count({ where: { createdAt: { gte: yesterday } } }),
      prisma.auditLog.count({ where: { createdAt: { gte: yesterday }, success: false } }),
      prisma.auditLog.groupBy({
        by: ['action'],
        where: { createdAt: { gte: yesterday } },
        _count: true,
        orderBy: { _count: { action: 'desc' } },
        take: 10
      }),
      prisma.auditLog.findMany({
        where: { createdAt: { gte: yesterday } },
        select: { userId: true },
        distinct: ['userId']
      })
    ])

    // Formatar logs
    const formattedLogs = logs.map(log => ({
      id: log.id,
      timestamp: log.createdAt,
      userId: log.userId,
      userEmail: log.userEmail,
      userRole: log.userRole,
      action: log.action,
      resourceType: log.resourceType,
      resourceId: log.resourceId,
      success: log.success,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      errorMessage: log.errorMessage,
      metadata: log.metadata
    }))

    logger.info({ 
      adminId: session.user.id, 
      filters: { action, resourceType, userId }, 
      resultsCount: formattedLogs.length 
    }, 'Logs de auditoria consultados')

    return NextResponse.json({
      logs: formattedLogs,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      },
      statistics: {
        last24Hours: {
          total: totalLast24h,
          failed: failedLast24h,
          uniqueUsers: uniqueUsers.length,
          topActions: actionStats.map(s => ({
            action: s.action,
            count: s._count
          }))
        }
      },
      filters: {
        availableActions: [
          'LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT',
          'PASSKEY_LOGIN_SUCCESS', 'PASSKEY_LOGIN_FAILED',
          'CREATE', 'READ', 'UPDATE', 'DELETE',
          'EXPORT', 'SIGN', 'PRINT', 'SEND',
          'AI_INTERACTION', 'PRESCRIPTION_CREATED', 'CERTIFICATE_SIGNED'
        ],
        availableResourceTypes: [
          'Authentication', 'User', 'Patient', 'Professional',
          'Consultation', 'Prescription', 'MedicalRecord',
          'ExamRequest', 'Referral', 'Certificate', 'Appointment'
        ]
      }
    })

  } catch (error) {
    logger.error({ error }, 'Erro ao buscar logs de auditoria')
    return NextResponse.json({ error: 'Erro ao buscar logs' }, { status: 500 })
  }
}
