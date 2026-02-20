import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
export const dynamic = 'force-dynamic'

import { sanitizeSearchQuery, sanitizeText } from '@/lib/sanitization'
import { logger } from '@/lib/logger'

type StatusFilter = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'EXPIRED' | 'CANCELLED'

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const statusFilter = sanitizeSearchQuery(searchParams.get('status') || '')
    const limitParam = sanitizeText(searchParams.get('limit') || '')
    const includeCompleted = searchParams.get('includeCompleted') !== 'false'

    const allowedStatuses: StatusFilter[] = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'EXPIRED', 'CANCELLED']
    const parsedStatuses = statusFilter
      ? statusFilter.split(',').map(s => sanitizeText(s).toUpperCase()).filter((s): s is StatusFilter => allowedStatuses.includes(s as StatusFilter))
      : []
    const statuses: StatusFilter[] | undefined = parsedStatuses.length ? parsedStatuses : undefined
    const parsedLimit = Number.parseInt(limitParam, 10)
    const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 100) : 50

    const userId = session.user.id
    const userEmail = session.user.email ?? undefined

    // Only include the email predicate if we actually have a non-null email
    const orWhere: Array<Record<string, unknown>> = [{ userId }]
    if (typeof userEmail === 'string' && userEmail.trim() !== '') {
      orWhere.push({ email: userEmail })
    }

    const patient = await prisma.patient.findFirst({
      where: {
        OR: orWhere
      }
    })

    if (!patient) {
      return NextResponse.json({ questionnaires: [] })
    }

    const questionnaires = await prisma.patientQuestionnaire.findMany({
      where: {
        patientId: patient.id,
        ...(statuses ? { status: { in: statuses } } : undefined),
        ...(includeCompleted ? {} : { status: { not: 'COMPLETED' as StatusFilter } })
      },
      include: {
        template: {
          select: {
            id: true,
            name: true,
            description: true,
            estimatedMinutes: true,
          }
        },
      },
      orderBy: { sentAt: 'desc' },
      take: limit
    })

    const now = new Date()
    const mapped = questionnaires.map(q => {
      const progress = q.status === 'COMPLETED' ? 100 : q.progressPercent || 0
      const expiresAt = q.expiresAt ?? null
      const isExpired = expiresAt ? expiresAt.getTime() < now.getTime() : false
      const state = q.status === 'COMPLETED'
        ? 'completed'
        : q.status === 'CANCELLED'
          ? 'cancelled'
          : isExpired || q.status === 'EXPIRED'
            ? 'expired'
            : q.status === 'IN_PROGRESS'
              ? 'in-progress'
              : 'pending'

      const dueInHours = expiresAt ? Math.round((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60)) : null
      const isDueSoon = dueInHours !== null && dueInHours <= 48 && dueInHours >= 0

      return {
        id: q.id,
        templateId: q.templateId,
        title: q.template?.name || 'Questionário',
        description: q.template?.description || 'Avaliação de saúde',
        questions: 0, // Categories removed - would need separate query
        time: q.template?.estimatedMinutes ? `${q.template.estimatedMinutes} min` : '—',
        completed: q.status === 'COMPLETED',
        progress,
        status: q.status,
        sentAt: q.sentAt,
        expiresAt,
        startedAt: q.startedAt,
        completedAt: q.completedAt,
        state,
        dueInHours,
        isDueSoon,
        sentBy: null,
        lastQuestionId: q.lastQuestionId,
      }
    })

    const ordered = mapped.sort((a, b) => {
      const statusWeight = (s: string) => {
        switch (s) {
          case 'PENDING': return 1
          case 'IN_PROGRESS': return 2
          case 'COMPLETED': return 4
          case 'EXPIRED': return 3
          case 'CANCELLED': return 5
          default: return 6
        }
      }
      const diff = statusWeight(a.status) - statusWeight(b.status)
      if (diff !== 0) return diff
      return new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()
    })

    return NextResponse.json({ questionnaires: ordered })
  } catch (error) {
    logger.error('Error fetching patient questionnaires (self):', error)
    return NextResponse.json({ error: 'Erro ao carregar questionários' }, { status: 500 })
  }
}
