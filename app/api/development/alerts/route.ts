import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NotificationService } from '@/lib/notification-service'

// Types for alerts
interface DevelopmentAlert {
  id: string
  type: 'reassessment' | 'goal_deadline' | 'streak' | 'achievement' | 'milestone'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  title: string
  message: string
  userId?: string
  userName?: string
  dueDate?: Date
  daysRemaining?: number
  actionUrl?: string
  metadata?: Record<string, unknown>
}

// GET - Retrieve development alerts for current user or all users (for managers)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const scope = searchParams.get('scope') || 'personal' // personal | team | all
    const type = searchParams.get('type') // filter by alert type
    const priority = searchParams.get('priority') // filter by priority

    const alerts: DevelopmentAlert[] = []
    const today = new Date()
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)

    // 1. REASSESSMENT ALERTS - Check for overdue or upcoming reassessments
    if (!type || type === 'reassessment') {
      // Check Stratum Assessments
      const stratumAssessments = await prisma.stratumAssessment.findMany({
        where: {
          status: 'COMPLETED'
        },
        include: {
          user: {
            select: { id: true, name: true }
          }
        },
        orderBy: { completedAt: 'desc' }
      })

      // Group by user to get latest assessment
      const userLastStratum = new Map<string, { date: Date; user: { id: string; name: string | null } }>()
      for (const assessment of stratumAssessments) {
        if (!userLastStratum.has(assessment.userId) && assessment.completedAt) {
          userLastStratum.set(assessment.userId, {
            date: assessment.completedAt,
            user: assessment.user
          })
        }
      }

      // Check which users need reassessment
      for (const [userId, data] of userLastStratum) {
        const daysSinceAssessment = Math.floor((today.getTime() - data.date.getTime()) / (1000 * 60 * 60 * 24))
        
        if (daysSinceAssessment >= 365) {
          const daysOverdue = daysSinceAssessment - 365
          alerts.push({
            id: `stratum-overdue-${userId}`,
            type: 'reassessment',
            priority: daysOverdue > 30 ? 'urgent' : 'high',
            title: 'Reavaliação de Stratum Vencida',
            message: `${data.user.name || 'Usuário'} está com reavaliação de stratum atrasada há ${daysOverdue} dias.`,
            userId,
            userName: data.user.name || undefined,
            dueDate: new Date(data.date.getTime() + 365 * 24 * 60 * 60 * 1000),
            daysRemaining: -daysOverdue,
            actionUrl: `/development`,
            metadata: { assessmentType: 'stratum', daysSinceAssessment }
          })
        } else if (daysSinceAssessment >= 335) {
          const daysUntilDue = 365 - daysSinceAssessment
          alerts.push({
            id: `stratum-due-${userId}`,
            type: 'reassessment',
            priority: daysUntilDue <= 7 ? 'high' : 'medium',
            title: 'Reavaliação de Stratum Próxima',
            message: `${data.user.name || 'Usuário'} precisa de reavaliação de stratum em ${daysUntilDue} dias.`,
            userId,
            userName: data.user.name || undefined,
            dueDate: new Date(data.date.getTime() + 365 * 24 * 60 * 60 * 1000),
            daysRemaining: daysUntilDue,
            actionUrl: `/development`,
            metadata: { assessmentType: 'stratum', daysSinceAssessment }
          })
        }
      }

      // Check Strength Assessments
      const strengthAssessments = await prisma.strengthAssessment.findMany({
        where: {
          status: 'COMPLETED'
        },
        include: {
          user: {
            select: { id: true, name: true }
          }
        },
        orderBy: { completedAt: 'desc' }
      })

      // Group by user to get latest assessment
      const userLastStrength = new Map<string, { date: Date; user: { id: string; name: string | null } }>()
      for (const assessment of strengthAssessments) {
        if (assessment.userId && !userLastStrength.has(assessment.userId) && assessment.completedAt) {
          userLastStrength.set(assessment.userId, {
            date: assessment.completedAt,
            user: assessment.user!
          })
        }
      }

      // Check which users need reassessment
      for (const [userId, data] of userLastStrength) {
        const daysSinceAssessment = Math.floor((today.getTime() - data.date.getTime()) / (1000 * 60 * 60 * 24))
        
        if (daysSinceAssessment >= 365) {
          const daysOverdue = daysSinceAssessment - 365
          alerts.push({
            id: `strength-overdue-${userId}`,
            type: 'reassessment',
            priority: daysOverdue > 30 ? 'urgent' : 'high',
            title: 'Reavaliação de Forças Vencida',
            message: `${data.user.name || 'Usuário'} está com reavaliação de forças atrasada há ${daysOverdue} dias.`,
            userId,
            userName: data.user.name || undefined,
            dueDate: new Date(data.date.getTime() + 365 * 24 * 60 * 60 * 1000),
            daysRemaining: -daysOverdue,
            actionUrl: `/development`,
            metadata: { assessmentType: 'strength', daysSinceAssessment }
          })
        } else if (daysSinceAssessment >= 335) {
          const daysUntilDue = 365 - daysSinceAssessment
          alerts.push({
            id: `strength-due-${userId}`,
            type: 'reassessment',
            priority: daysUntilDue <= 7 ? 'high' : 'medium',
            title: 'Reavaliação de Forças Próxima',
            message: `${data.user.name || 'Usuário'} precisa de reavaliação de forças em ${daysUntilDue} dias.`,
            userId,
            userName: data.user.name || undefined,
            dueDate: new Date(data.date.getTime() + 365 * 24 * 60 * 60 * 1000),
            daysRemaining: daysUntilDue,
            actionUrl: `/development`,
            metadata: { assessmentType: 'strength', daysSinceAssessment }
          })
        }
      }
    }

    // 2. GOAL DEADLINE ALERTS
    if (!type || type === 'goal_deadline') {
      const upcomingGoals = await prisma.developmentGoal.findMany({
        where: {
          status: { in: ['NOT_STARTED', 'IN_PROGRESS'] },
          targetDate: {
            gte: today,
            lte: thirtyDaysFromNow
          }
        },
        include: {
          plan: {
            include: {
              user: {
                select: { id: true, name: true }
              }
            }
          }
        },
        orderBy: { targetDate: 'asc' }
      })

      for (const goal of upcomingGoals) {
        if (!goal.targetDate) continue
        const daysUntilDeadline = Math.ceil((goal.targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        
        alerts.push({
          id: `goal-deadline-${goal.id}`,
          type: 'goal_deadline',
          priority: daysUntilDeadline <= 3 ? 'high' : daysUntilDeadline <= 7 ? 'medium' : 'low',
          title: 'Meta com Prazo Próximo',
          message: `Meta "${goal.title}" de ${goal.plan.user?.name || 'Usuário'} vence em ${daysUntilDeadline} dias.`,
          userId: goal.plan.userId || undefined,
          userName: goal.plan.user?.name || undefined,
          dueDate: goal.targetDate,
          daysRemaining: daysUntilDeadline,
          actionUrl: `/development/${goal.plan.id}`,
          metadata: { goalId: goal.id, progress: goal.progress }
        })
      }

      // Overdue goals
      const overdueGoals = await prisma.developmentGoal.findMany({
        where: {
          status: { in: ['NOT_STARTED', 'IN_PROGRESS'] },
          targetDate: {
            lt: today
          }
        },
        include: {
          plan: {
            include: {
              user: {
                select: { id: true, name: true }
              }
            }
          }
        },
        orderBy: { targetDate: 'asc' }
      })

      for (const goal of overdueGoals) {
        if (!goal.targetDate) continue
        const daysOverdue = Math.ceil((today.getTime() - goal.targetDate.getTime()) / (1000 * 60 * 60 * 24))
        
        alerts.push({
          id: `goal-overdue-${goal.id}`,
          type: 'goal_deadline',
          priority: daysOverdue > 14 ? 'urgent' : 'high',
          title: 'Meta Atrasada',
          message: `Meta "${goal.title}" de ${goal.plan.user?.name || 'Usuário'} está atrasada há ${daysOverdue} dias.`,
          userId: goal.plan.userId || undefined,
          userName: goal.plan.user?.name || undefined,
          dueDate: goal.targetDate,
          daysRemaining: -daysOverdue,
          actionUrl: `/development/${goal.plan.id}`,
          metadata: { goalId: goal.id, progress: goal.progress }
        })
      }
    }

    // 3. STREAK ALERTS - Users losing engagement
    if (!type || type === 'streak') {
      const plansWithActivity = await prisma.developmentPlan.findMany({
        where: {
          status: 'ACTIVE'
        },
        include: {
          user: {
            select: { id: true, name: true }
          },
          goals: {
            include: {
              actions: {
                orderBy: { completedAt: 'desc' },
                take: 1,
                where: { completed: true }
              }
            }
          }
        }
      })

      for (const plan of plansWithActivity) {
        let lastActivity: Date | null = null
        
        for (const goal of plan.goals) {
          for (const action of goal.actions) {
            if (action.completedAt && (!lastActivity || action.completedAt > lastActivity)) {
              lastActivity = action.completedAt
            }
          }
        }

        if (lastActivity) {
          const daysSinceActivity = Math.floor((today.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24))
          
          if (daysSinceActivity >= 14) {
            alerts.push({
              id: `streak-${plan.id}`,
              type: 'streak',
              priority: daysSinceActivity >= 30 ? 'high' : 'medium',
              title: 'Usuário Inativo',
              message: `${plan.user?.name || 'Usuário'} não registra atividade há ${daysSinceActivity} dias.`,
              userId: plan.userId || undefined,
              userName: plan.user?.name || undefined,
              daysRemaining: -daysSinceActivity,
              actionUrl: `/development/${plan.id}`,
              metadata: { planId: plan.id, lastActivity }
            })
          }
        }
      }
    }

    // 4. ACHIEVEMENT ALERTS - Users close to achievements
    if (!type || type === 'achievement') {
      const nearCompletionGoals = await prisma.developmentGoal.findMany({
        where: {
          status: 'IN_PROGRESS',
          progress: { gte: 80 }
        },
        include: {
          plan: {
            include: {
              user: {
                select: { id: true, name: true }
              }
            }
          }
        }
      })

      for (const goal of nearCompletionGoals) {
        alerts.push({
          id: `achievement-near-${goal.id}`,
          type: 'achievement',
          priority: 'low',
          title: 'Meta Quase Completa!',
          message: `${goal.plan.user?.name || 'Usuário'} está a ${100 - goal.progress}% de completar "${goal.title}".`,
          userId: goal.plan.userId || undefined,
          userName: goal.plan.user?.name || undefined,
          actionUrl: `/development/${goal.plan.id}`,
          metadata: { goalId: goal.id, progress: goal.progress }
        })
      }
    }

    // Filter by priority if specified
    let filteredAlerts = alerts
    if (priority) {
      filteredAlerts = alerts.filter(a => a.priority === priority)
    }

    // Filter by scope
    if (scope === 'personal') {
      filteredAlerts = filteredAlerts.filter(a => a.userId === session.user.id)
    }

    // Sort by priority (urgent > high > medium > low) then by due date
    const priorityOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 }
    filteredAlerts.sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority]
      if (priorityDiff !== 0) return priorityDiff
      
      const aDays = a.daysRemaining ?? Infinity
      const bDays = b.daysRemaining ?? Infinity
      return aDays - bDays
    })

    // Summary statistics
    const summary = {
      total: filteredAlerts.length,
      byPriority: {
        urgent: filteredAlerts.filter(a => a.priority === 'urgent').length,
        high: filteredAlerts.filter(a => a.priority === 'high').length,
        medium: filteredAlerts.filter(a => a.priority === 'medium').length,
        low: filteredAlerts.filter(a => a.priority === 'low').length
      },
      byType: {
        reassessment: filteredAlerts.filter(a => a.type === 'reassessment').length,
        goal_deadline: filteredAlerts.filter(a => a.type === 'goal_deadline').length,
        milestone: filteredAlerts.filter(a => a.type === 'milestone').length,
        streak: filteredAlerts.filter(a => a.type === 'streak').length,
        achievement: filteredAlerts.filter(a => a.type === 'achievement').length
      }
    }

    return NextResponse.json({
      alerts: filteredAlerts,
      summary
    })

  } catch (error) {
    console.error('Error fetching development alerts:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar alertas' },
      { status: 500 }
    )
  }
}

// POST - Create notifications from alerts
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { alertIds } = body

    if (!alertIds || !Array.isArray(alertIds) || alertIds.length === 0) {
      return NextResponse.json(
        { error: 'IDs de alertas são obrigatórios' },
        { status: 400 }
      )
    }

    const createdNotifications = []

    for (const alertId of alertIds) {
      const [type, , targetId] = alertId.split('-')
      
      const notification = await NotificationService.createNotification({
        userId: session.user.id,
        type: 'system',
        priority: 'medium',
        title: `Alerta de Desenvolvimento: ${type}`,
        message: `Alerta processado para ${targetId}`,
        metadata: { alertId, type, targetId }
      })

      createdNotifications.push(notification)
    }

    return NextResponse.json({
      success: true,
      notificationsCreated: createdNotifications.length
    })

  } catch (error) {
    console.error('Error creating notifications:', error)
    return NextResponse.json(
      { error: 'Erro ao criar notificações' },
      { status: 500 }
    )
  }
}
