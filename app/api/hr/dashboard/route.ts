import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { rateLimiters } from '@/lib/rate-limiter'

// Direct Prisma client to avoid bundling issues
const { PrismaClient } = require('@prisma/client')
const globalForPrisma = globalThis as unknown as { prisma: InstanceType<typeof PrismaClient> }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// GET - HR Dashboard summary
export const GET = withAuth(async (req: NextRequest, { user }) => {
  const rl = rateLimiters.default(req)
  if (rl instanceof NextResponse) return rl

  // Only managers can see dashboard
  if (!['ADMIN', 'MANAGER'].includes(user.role)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    
    const [
      totalStaff,
      activeStaff,
      pendingLeaveRequests,
      approvedLeavesToday,
      scheduledToday,
      leaveRequestsByType,
      upcomingLeaves,
      activeSchedules
    ] = await Promise.all([
      // Total staff
      prisma.user.count({
        where: { role: { notIn: ['PATIENT'] } }
      }),
      
      // Active staff
      prisma.user.count({
        where: { role: { notIn: ['PATIENT'] }, isActive: true }
      }),
      
      // Pending leave requests
      prisma.leaveRequest.count({
        where: { status: 'PENDING' }
      }),
      
      // Staff on leave today
      prisma.leaveRequest.count({
        where: {
          status: { in: ['APPROVED', 'IN_PROGRESS'] },
          startDate: { lte: today },
          endDate: { gte: today }
        }
      }),
      
      // Scheduled staff today
      prisma.scheduleEntry.count({
        where: {
          date: {
            gte: today,
            lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
          }
        }
      }),
      
      // Leave requests by type this month
      prisma.leaveRequest.groupBy({
        by: ['type'],
        where: {
          createdAt: { gte: startOfMonth, lte: endOfMonth }
        },
        _count: { type: true }
      }),
      
      // Upcoming leaves (next 7 days)
      prisma.leaveRequest.findMany({
        where: {
          status: 'APPROVED',
          startDate: {
            gte: today,
            lte: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
          }
        },
        include: {
          user: {
            select: { id: true, name: true, role: true, speciality: true }
          }
        },
        orderBy: { startDate: 'asc' },
        take: 10
      }),
      
      // Active schedules
      prisma.workSchedule.findMany({
        where: {
          isActive: true,
          endDate: { gte: today }
        },
        include: {
          _count: { select: { entries: true } }
        },
        orderBy: { startDate: 'asc' },
        take: 5
      })
    ])

    // Get staff currently on leave
    const staffOnLeave = await prisma.leaveRequest.findMany({
      where: {
        status: { in: ['APPROVED', 'IN_PROGRESS'] },
        startDate: { lte: today },
        endDate: { gte: today }
      },
      include: {
        user: {
          select: { id: true, name: true, role: true, speciality: true }
        }
      }
    })

    // Format leave types
    const leaveTypeLabels: Record<string, string> = {
      VACATION: 'Férias',
      SICK_LEAVE: 'Licença Médica',
      MATERNITY: 'Licença Maternidade',
      PATERNITY: 'Licença Paternidade',
      BEREAVEMENT: 'Luto',
      PERSONAL: 'Particular',
      TRAINING: 'Treinamento',
      COMPENSATORY: 'Folga Compensatória',
      OTHER: 'Outro'
    }

    const leavesByType = leaveRequestsByType.map((item: { type: string; _count: { type: number } }) => ({
      type: item.type,
      label: leaveTypeLabels[item.type] || item.type,
      count: item._count.type
    }))

    return NextResponse.json({
      summary: {
        totalStaff,
        activeStaff,
        inactiveStaff: totalStaff - activeStaff,
        pendingLeaveRequests,
        staffOnLeaveToday: approvedLeavesToday,
        staffScheduledToday: scheduledToday
      },
      leavesByType,
      staffOnLeave: staffOnLeave.map((leave: { type: string; [key: string]: unknown }) => ({
        ...leave,
        typeLabel: leaveTypeLabels[leave.type] || leave.type
      })),
      upcomingLeaves: upcomingLeaves.map((leave: { type: string; [key: string]: unknown }) => ({
        ...leave,
        typeLabel: leaveTypeLabels[leave.type] || leave.type
      })),
      activeSchedules
    })
  } catch (error: any) {
    console.error('Error fetching HR dashboard:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar dashboard', details: error.message },
      { status: 500 }
    )
  }
})
