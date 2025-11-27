/**
 * Unit Tests for Consultation Validation and Helpers
 * Tests pure functions without database dependencies
 */

import { describe, it, expect } from 'vitest'

describe('Consultation Validation Helpers', () => {
  // Time Slot Validation
  describe('Time Slot Validation', () => {
    const parseTimeSlot = (time: string): { hours: number; minutes: number } | null => {
      const match = time.match(/^(\d{1,2}):(\d{2})$/)
      if (!match) return null
      const hours = parseInt(match[1])
      const minutes = parseInt(match[2])
      if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null
      return { hours, minutes }
    }

    const isValidTimeSlot = (time: string, minHour = 7, maxHour = 20): boolean => {
      const parsed = parseTimeSlot(time)
      if (!parsed) return false
      return parsed.hours >= minHour && parsed.hours < maxHour
    }

    it('should accept valid time slots', () => {
      expect(isValidTimeSlot('08:00')).toBe(true)
      expect(isValidTimeSlot('14:30')).toBe(true)
      expect(isValidTimeSlot('19:00')).toBe(true)
    })

    it('should reject time outside business hours', () => {
      expect(isValidTimeSlot('06:00')).toBe(false)
      expect(isValidTimeSlot('21:00')).toBe(false)
    })

    it('should reject invalid time format', () => {
      expect(isValidTimeSlot('8:00')).toBe(true)  // 1 digit hour OK
      expect(isValidTimeSlot('08:0')).toBe(false) // 1 digit minute not OK
      expect(isValidTimeSlot('invalid')).toBe(false)
    })

    it('should parse time slots correctly', () => {
      expect(parseTimeSlot('08:30')).toEqual({ hours: 8, minutes: 30 })
      expect(parseTimeSlot('14:00')).toEqual({ hours: 14, minutes: 0 })
      expect(parseTimeSlot('25:00')).toBeNull()
      expect(parseTimeSlot('08:60')).toBeNull()
    })
  })

  // Duration Validation
  describe('Duration Validation', () => {
    const VALID_DURATIONS = [15, 20, 30, 45, 60, 90, 120]

    const isValidDuration = (minutes: number): boolean => {
      return VALID_DURATIONS.includes(minutes)
    }

    const formatDuration = (minutes: number): string => {
      if (minutes < 60) return `${minutes} minutos`
      const hours = Math.floor(minutes / 60)
      const mins = minutes % 60
      if (mins === 0) return `${hours} hora${hours > 1 ? 's' : ''}`
      return `${hours}h${mins}min`
    }

    it('should accept valid durations', () => {
      VALID_DURATIONS.forEach(d => {
        expect(isValidDuration(d)).toBe(true)
      })
    })

    it('should reject invalid durations', () => {
      expect(isValidDuration(10)).toBe(false)
      expect(isValidDuration(25)).toBe(false)
      expect(isValidDuration(100)).toBe(false)
    })

    it('should format durations correctly', () => {
      expect(formatDuration(30)).toBe('30 minutos')
      expect(formatDuration(60)).toBe('1 hora')
      expect(formatDuration(120)).toBe('2 horas')
      expect(formatDuration(90)).toBe('1h30min')
    })
  })

  // Consultation Type Validation
  describe('Consultation Type Validation', () => {
    const CONSULTATION_TYPES = {
      INITIAL: { label: 'Primeira Consulta', duration: 60, color: '#3B82F6' },
      FOLLOWUP: { label: 'Retorno', duration: 30, color: '#10B981' },
      EMERGENCY: { label: 'Emergência', duration: 45, color: '#EF4444' },
      EXAM: { label: 'Resultado de Exames', duration: 20, color: '#F59E0B' },
      PROCEDURE: { label: 'Procedimento', duration: 45, color: '#8B5CF6' },
    }

    const isValidConsultationType = (type: string): boolean => {
      return type in CONSULTATION_TYPES
    }

    const getTypeInfo = (type: string) => {
      return CONSULTATION_TYPES[type as keyof typeof CONSULTATION_TYPES] || null
    }

    it('should accept valid consultation types', () => {
      expect(isValidConsultationType('INITIAL')).toBe(true)
      expect(isValidConsultationType('FOLLOWUP')).toBe(true)
      expect(isValidConsultationType('EMERGENCY')).toBe(true)
    })

    it('should reject invalid types', () => {
      expect(isValidConsultationType('INVALID')).toBe(false)
      expect(isValidConsultationType('')).toBe(false)
    })

    it('should return correct type info', () => {
      const initial = getTypeInfo('INITIAL')
      expect(initial?.label).toBe('Primeira Consulta')
      expect(initial?.duration).toBe(60)

      expect(getTypeInfo('INVALID')).toBeNull()
    })
  })

  // Consultation Status Flow
  describe('Consultation Status Flow', () => {
    type ConsultationStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'

    const STATUS_FLOW: Record<ConsultationStatus, ConsultationStatus[]> = {
      SCHEDULED: ['IN_PROGRESS', 'CANCELLED', 'NO_SHOW'],
      IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
      COMPLETED: [], // Terminal state
      CANCELLED: [], // Terminal state
      NO_SHOW: ['SCHEDULED'], // Can reschedule
    }

    const canChangeStatus = (from: ConsultationStatus, to: ConsultationStatus): boolean => {
      return STATUS_FLOW[from]?.includes(to) ?? false
    }

    const getStatusLabel = (status: ConsultationStatus): string => {
      const labels: Record<ConsultationStatus, string> = {
        SCHEDULED: 'Agendado',
        IN_PROGRESS: 'Em Andamento',
        COMPLETED: 'Concluído',
        CANCELLED: 'Cancelado',
        NO_SHOW: 'Não Compareceu',
      }
      return labels[status]
    }

    it('should allow valid status transitions', () => {
      expect(canChangeStatus('SCHEDULED', 'IN_PROGRESS')).toBe(true)
      expect(canChangeStatus('SCHEDULED', 'CANCELLED')).toBe(true)
      expect(canChangeStatus('IN_PROGRESS', 'COMPLETED')).toBe(true)
      expect(canChangeStatus('NO_SHOW', 'SCHEDULED')).toBe(true)
    })

    it('should reject invalid transitions', () => {
      expect(canChangeStatus('COMPLETED', 'SCHEDULED')).toBe(false)
      expect(canChangeStatus('CANCELLED', 'IN_PROGRESS')).toBe(false)
      expect(canChangeStatus('SCHEDULED', 'COMPLETED')).toBe(false)
    })

    it('should return correct status labels', () => {
      expect(getStatusLabel('SCHEDULED')).toBe('Agendado')
      expect(getStatusLabel('COMPLETED')).toBe('Concluído')
      expect(getStatusLabel('NO_SHOW')).toBe('Não Compareceu')
    })
  })

  // Schedule Conflict Detection
  describe('Schedule Conflict Detection', () => {
    interface TimeSlot {
      start: Date
      end: Date
    }

    const hasConflict = (newSlot: TimeSlot, existingSlots: TimeSlot[]): boolean => {
      return existingSlots.some(slot => {
        return newSlot.start < slot.end && newSlot.end > slot.start
      })
    }

    it('should detect overlapping appointments', () => {
      const existing = [
        { start: new Date('2024-01-15T09:00'), end: new Date('2024-01-15T10:00') },
        { start: new Date('2024-01-15T14:00'), end: new Date('2024-01-15T15:00') },
      ]

      // Overlaps with first slot
      const conflict1 = { start: new Date('2024-01-15T09:30'), end: new Date('2024-01-15T10:30') }
      expect(hasConflict(conflict1, existing)).toBe(true)

      // No overlap
      const noConflict = { start: new Date('2024-01-15T11:00'), end: new Date('2024-01-15T12:00') }
      expect(hasConflict(noConflict, existing)).toBe(false)
    })

    it('should handle adjacent time slots without conflict', () => {
      const existing = [
        { start: new Date('2024-01-15T09:00'), end: new Date('2024-01-15T10:00') },
      ]

      // Starts exactly when previous ends - no conflict
      const adjacent = { start: new Date('2024-01-15T10:00'), end: new Date('2024-01-15T11:00') }
      expect(hasConflict(adjacent, existing)).toBe(false)
    })
  })

  // Appointment Reminders
  describe('Appointment Reminders', () => {
    const shouldSendReminder = (appointmentDate: Date, reminderHoursBefore: number): boolean => {
      const now = new Date()
      const reminderTime = new Date(appointmentDate.getTime() - reminderHoursBefore * 60 * 60 * 1000)
      
      // Should send if we're within 1 hour window of reminder time
      const diffMs = reminderTime.getTime() - now.getTime()
      return diffMs >= 0 && diffMs <= 60 * 60 * 1000
    }

    const formatReminderMessage = (
      patientName: string, 
      doctorName: string, 
      date: Date
    ): string => {
      const dateStr = date.toLocaleDateString('pt-BR')
      const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      return `Olá ${patientName}, lembrando de sua consulta com ${doctorName} em ${dateStr} às ${timeStr}.`
    }

    it('should format reminder message correctly', () => {
      const date = new Date('2024-01-15T14:30:00')
      const msg = formatReminderMessage('Maria', 'Dr. João', date)
      
      expect(msg).toContain('Maria')
      expect(msg).toContain('Dr. João')
      expect(msg).toContain('14:30')
    })
  })

  // Chief Complaint Validation
  describe('Chief Complaint Validation', () => {
    const validateChiefComplaint = (complaint: string): { valid: boolean; errors: string[] } => {
      const errors: string[] = []

      if (!complaint || complaint.trim().length === 0) {
        errors.push('Queixa principal é obrigatória')
      } else if (complaint.trim().length < 10) {
        errors.push('Queixa principal deve ter pelo menos 10 caracteres')
      } else if (complaint.length > 1000) {
        errors.push('Queixa principal deve ter no máximo 1000 caracteres')
      }

      return { valid: errors.length === 0, errors }
    }

    it('should accept valid complaints', () => {
      expect(validateChiefComplaint('Dor de cabeça há 3 dias').valid).toBe(true)
      expect(validateChiefComplaint('Febre e tosse persistente').valid).toBe(true)
    })

    it('should reject empty complaint', () => {
      expect(validateChiefComplaint('').valid).toBe(false)
      expect(validateChiefComplaint('   ').valid).toBe(false)
    })

    it('should reject too short complaint', () => {
      const result = validateChiefComplaint('Dor')
      expect(result.valid).toBe(false)
      expect(result.errors[0]).toContain('pelo menos 10 caracteres')
    })

    it('should reject too long complaint', () => {
      const longComplaint = 'A'.repeat(1001)
      const result = validateChiefComplaint(longComplaint)
      expect(result.valid).toBe(false)
      expect(result.errors[0]).toContain('máximo 1000 caracteres')
    })
  })

  // Urgency Level Classification
  describe('Urgency Level Classification', () => {
    type UrgencyLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

    const URGENCY_CONFIG: Record<UrgencyLevel, { color: string; maxWaitMinutes: number; label: string }> = {
      LOW: { color: '#22C55E', maxWaitMinutes: 120, label: 'Baixa' },
      MEDIUM: { color: '#F59E0B', maxWaitMinutes: 60, label: 'Média' },
      HIGH: { color: '#EF4444', maxWaitMinutes: 30, label: 'Alta' },
      CRITICAL: { color: '#7C3AED', maxWaitMinutes: 0, label: 'Crítica' },
    }

    const getUrgencyConfig = (level: UrgencyLevel) => URGENCY_CONFIG[level]

    const isOverdue = (urgency: UrgencyLevel, waitingMinutes: number): boolean => {
      return waitingMinutes > URGENCY_CONFIG[urgency].maxWaitMinutes
    }

    it('should return correct urgency config', () => {
      expect(getUrgencyConfig('LOW').maxWaitMinutes).toBe(120)
      expect(getUrgencyConfig('CRITICAL').maxWaitMinutes).toBe(0)
    })

    it('should detect overdue patients', () => {
      expect(isOverdue('LOW', 130)).toBe(true)
      expect(isOverdue('LOW', 60)).toBe(false)
      expect(isOverdue('CRITICAL', 5)).toBe(true)
    })
  })
})
