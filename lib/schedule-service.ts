import { prisma } from '@/lib/prisma'

export interface ScheduleRule {
  dayOfWeek: number // 0-6
  startTime: string // "08:00"
  endTime: string // "18:00"
  slotDuration: number // minutes
}

export class ScheduleService {
  static async setSchedule(doctorId: string, rules: ScheduleRule[]) {
    // Transaction to replace all rules
    return prisma.$transaction(async (tx) => {
      // Delete existing
      await tx.doctorSchedule.deleteMany({
        where: { doctorId }
      })
      
      // Create new
      for (const rule of rules) {
        await tx.doctorSchedule.create({
          data: {
            doctorId,
            ...rule
          }
        })
      }
    })
  }

  static async getSchedule(doctorId: string) {
    return prisma.doctorSchedule.findMany({
      where: { doctorId },
      orderBy: { dayOfWeek: 'asc' }
    })
  }

  static async addException(doctorId: string, date: Date, isAvailable: boolean, reason?: string) {
    return prisma.scheduleException.create({
      data: {
        doctorId,
        date,
        isAvailable,
        reason
      }
    })
  }

  static async getAvailability(doctorId: string, date: Date) {
    // Check exceptions first
    const startOfDay = new Date(date)
    startOfDay.setHours(0,0,0,0)
    const endOfDay = new Date(date)
    endOfDay.setHours(23,59,59,999)

    const exception = await prisma.scheduleException.findFirst({
      where: {
        doctorId,
        date: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    })

    if (exception) {
      return { available: exception.isAvailable, reason: exception.reason }
    }

    // Check regular schedule
    const dayOfWeek = date.getDay()
    const schedule = await prisma.doctorSchedule.findUnique({
      where: {
        doctorId_dayOfWeek: {
          doctorId,
          dayOfWeek
        }
      }
    })

    if (!schedule) return { available: false, reason: 'No schedule configured' }

    return { 
      available: true, 
      start: schedule.startTime, 
      end: schedule.endTime, 
      slotDuration: schedule.slotDuration 
    }
  }
}
