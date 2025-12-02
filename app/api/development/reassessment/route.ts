import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NotificationService } from '@/lib/notification-service'

// Types for reassessment
interface ReassessmentSchedule {
  id: string
  userId: string
  userName: string
  assessmentType: 'stratum' | 'strength' | 'both'
  lastAssessmentDate: Date
  nextDueDate: Date
  daysUntilDue: number
  status: 'upcoming' | 'due' | 'overdue'
  notificationsSent: number
}

interface ReassessmentStats {
  total: number
  upcoming: number
  due: number
  overdue: number
  completedThisYear: number
  averageCompletionRate: number
}

// GET - Get reassessment schedules
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') // upcoming | due | overdue | all
    const limit = parseInt(searchParams.get('limit') || '50')

    const today = new Date()

    // Get all users with their latest assessments
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        stratumAssessments: {
          where: { status: 'COMPLETED' },
          orderBy: { completedAt: 'desc' },
          take: 1,
          select: { completedAt: true }
        },
        strengthAssessments: {
          where: { status: 'COMPLETED' },
          orderBy: { completedAt: 'desc' },
          take: 1,
          select: { completedAt: true }
        }
      }
    })

    const schedules: ReassessmentSchedule[] = []

    for (const user of users) {
      // Check stratum assessment
      if (user.stratumAssessments[0]?.completedAt) {
        const lastDate = user.stratumAssessments[0].completedAt
        const nextDueDate = new Date(lastDate.getTime() + 365 * 24 * 60 * 60 * 1000)
        const daysUntilDue = Math.ceil((nextDueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        
        let assessmentStatus: 'upcoming' | 'due' | 'overdue' = 'upcoming'
        if (daysUntilDue < 0) {
          assessmentStatus = 'overdue'
        } else if (daysUntilDue <= 30) {
          assessmentStatus = 'due'
        }

        if (!status || status === 'all' || status === assessmentStatus) {
          schedules.push({
            id: `stratum-${user.id}`,
            userId: user.id,
            userName: user.name || 'Usuário',
            assessmentType: 'stratum',
            lastAssessmentDate: lastDate,
            nextDueDate,
            daysUntilDue,
            status: assessmentStatus,
            notificationsSent: 0
          })
        }
      }

      // Check strength assessment
      if (user.strengthAssessments[0]?.completedAt) {
        const lastDate = user.strengthAssessments[0].completedAt
        const nextDueDate = new Date(lastDate.getTime() + 365 * 24 * 60 * 60 * 1000)
        const daysUntilDue = Math.ceil((nextDueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        
        let assessmentStatus: 'upcoming' | 'due' | 'overdue' = 'upcoming'
        if (daysUntilDue < 0) {
          assessmentStatus = 'overdue'
        } else if (daysUntilDue <= 30) {
          assessmentStatus = 'due'
        }

        if (!status || status === 'all' || status === assessmentStatus) {
          schedules.push({
            id: `strength-${user.id}`,
            userId: user.id,
            userName: user.name || 'Usuário',
            assessmentType: 'strength',
            lastAssessmentDate: lastDate,
            nextDueDate,
            daysUntilDue,
            status: assessmentStatus,
            notificationsSent: 0
          })
        }
      }
    }

    // Sort by days until due (most urgent first)
    schedules.sort((a, b) => a.daysUntilDue - b.daysUntilDue)

    // Calculate stats
    const stats: ReassessmentStats = {
      total: schedules.length,
      upcoming: schedules.filter(s => s.status === 'upcoming').length,
      due: schedules.filter(s => s.status === 'due').length,
      overdue: schedules.filter(s => s.status === 'overdue').length,
      completedThisYear: await getCompletedThisYear(),
      averageCompletionRate: await calculateCompletionRate()
    }

    return NextResponse.json({
      schedules: schedules.slice(0, limit),
      stats,
      generatedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error fetching reassessment schedules:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar agendamentos' },
      { status: 500 }
    )
  }
}

// POST - Send reassessment reminders
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { scheduleIds } = body

    if (!scheduleIds || !Array.isArray(scheduleIds) || scheduleIds.length === 0) {
      return NextResponse.json(
        { error: 'IDs de agendamentos são obrigatórios' },
        { status: 400 }
      )
    }

    const results = []

    for (const scheduleId of scheduleIds) {
      const [type, usrId] = scheduleId.split('-')
      
      // Get user info
      const user = await prisma.user.findUnique({
        where: { id: usrId },
        select: { id: true, name: true, email: true }
      })

      if (!user) continue

      const assessmentName = type === 'stratum' ? 'Avaliação de Stratum' : 'Avaliação de Forças'

      // Create in-app notification
      const notification = await NotificationService.createNotification({
        userId: user.id,
        type: 'system',
        priority: 'medium',
        title: `Reavaliação Pendente`,
        message: `${assessmentName} está pendente. Por favor, realize a reavaliação.`,
        metadata: { 
          userId: user.id,
          assessmentType: type,
          actionUrl: `/development`
        }
      })

      results.push({
        scheduleId,
        userName: user.name,
        notificationCreated: !!notification,
        emailSent: false
      })
    }

    return NextResponse.json({
      success: true,
      results,
      remindersSent: results.length
    })

  } catch (error) {
    console.error('Error sending reminders:', error)
    return NextResponse.json(
      { error: 'Erro ao enviar lembretes' },
      { status: 500 }
    )
  }
}

// Helper function to get completed assessments this year
async function getCompletedThisYear(): Promise<number> {
  const startOfYear = new Date(new Date().getFullYear(), 0, 1)
  
  const stratumCount = await prisma.stratumAssessment.count({
    where: {
      status: 'COMPLETED',
      completedAt: { gte: startOfYear }
    }
  })

  const strengthCount = await prisma.strengthAssessment.count({
    where: {
      status: 'COMPLETED',
      completedAt: { gte: startOfYear }
    }
  })

  return stratumCount + strengthCount
}

// Helper function to calculate completion rate
async function calculateCompletionRate(): Promise<number> {
  const today = new Date()
  const oneYearAgo = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000)

  // Get total users with any assessment
  const usersWithAssessments = await prisma.user.count({
    where: {
      OR: [
        { stratumAssessments: { some: { status: 'COMPLETED' } } },
        { strengthAssessments: { some: { status: 'COMPLETED' } } }
      ]
    }
  })

  // Get users with recent assessments (within last year)
  const usersWithRecentAssessments = await prisma.user.count({
    where: {
      OR: [
        { stratumAssessments: { some: { status: 'COMPLETED', completedAt: { gte: oneYearAgo } } } },
        { strengthAssessments: { some: { status: 'COMPLETED', completedAt: { gte: oneYearAgo } } } }
      ]
    }
  })

  if (usersWithAssessments === 0) return 100
  return Math.round((usersWithRecentAssessments / usersWithAssessments) * 100)
}
