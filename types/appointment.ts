/**
 * Appointment-related types
 */

export type AppointmentStatus = 'SCHEDULED' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW' | 'RESCHEDULED'
export type AppointmentType = 'ROUTINE' | 'URGENT' | 'FOLLOW_UP' | 'INITIAL_ASSESSMENT'

export interface Appointment {
  id: string
  patientId: string
  doctorId: string
  type: AppointmentType
  status: AppointmentStatus
  scheduledAt: Date
  startedAt?: Date
  endedAt?: Date
  duration: number // in minutes
  reason?: string
  notes?: string
  location?: string
  reminderSentAt?: Date
  reminderMethod?: 'EMAIL' | 'SMS' | 'WHATSAPP'
  createdAt: Date
  updatedAt: Date
}

export interface AppointmentSlot {
  id: string
  doctorId: string
  startTime: Date
  endTime: Date
  duration: number
  isAvailable: boolean
  appointmentId?: string
}

export interface AppointmentRequest {
  id: string
  patientId: string
  preferredDates: Date[]
  reason: string
  urgencyLevel: 'LOW' | 'MEDIUM' | 'HIGH'
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SCHEDULED'
  createdAt: Date
  respondedAt?: Date
}

export interface AppointmentStats {
  totalAppointments: number
  completedAppointments: number
  cancelledAppointments: number
  noShowAppointments: number
  averageWaitTime: number // in minutes
}
