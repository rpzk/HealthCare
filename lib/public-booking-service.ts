/**
 * Public Booking Service (Simplified)
 * 
 * Serviço para agendamentos públicos via widget
 * Usa model Consultation
 */

import prisma from '@/lib/prisma'
import { addMinutes, format, startOfDay, endOfDay, isBefore, addDays, isWeekend } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// Types
export interface PublicSpecialty {
  id: string
  name: string
  availableProfessionals: number
}

export interface PublicProfessional {
  id: string
  name: string
  specialty: string
}

export interface PublicTimeSlot {
  time: string
  available: boolean
}

export interface PublicBookingRequest {
  specialtyId?: string
  professionalId?: string
  date: Date
  time: string
  patientName: string
  patientCpf: string
  patientPhone: string
  patientEmail?: string
  reason?: string
  isFirstVisit: boolean
  acceptedTerms: boolean
}

export interface PublicBookingResult {
  success: boolean
  bookingId?: string
  confirmationCode?: string
  appointmentDate?: Date
  professionalName?: string
  message: string
  errors?: string[]
}

// Service
export class PublicBookingService {
  
  async getAvailableSpecialties(): Promise<PublicSpecialty[]> {
    const professionals = await prisma.user.findMany({
      where: { role: 'DOCTOR', isActive: true },
      select: { id: true, speciality: true }
    })

    const specialtyMap = new Map<string, number>()
    for (const prof of professionals) {
      const spec = prof.speciality || 'Clínico Geral'
      specialtyMap.set(spec, (specialtyMap.get(spec) || 0) + 1)
    }

    return [...specialtyMap.entries()].map(([name, count], i) => ({
      id: `spec-${i}`,
      name,
      availableProfessionals: count
    }))
  }

  async getAvailableProfessionals(specialty?: string): Promise<PublicProfessional[]> {
    const professionals = await prisma.user.findMany({
      where: {
        role: 'DOCTOR',
        isActive: true,
        ...(specialty ? { speciality: { contains: specialty, mode: 'insensitive' } } : {})
      },
      select: { id: true, name: true, speciality: true }
    })

    return professionals.map(prof => ({
      id: prof.id,
      name: prof.name || 'Dr(a).',
      specialty: prof.speciality || 'Clínico Geral'
    }))
  }

  async getAvailableSlots(date: Date, professionalId?: string): Promise<PublicTimeSlot[]> {
    if (isWeekend(date)) return []

    const baseSlots = this.generateBaseSlots()
    
    const existing = await prisma.consultation.findMany({
      where: {
        scheduledDate: { gte: startOfDay(date), lte: endOfDay(date) },
        status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
        ...(professionalId ? { doctorId: professionalId } : {})
      },
      select: { scheduledDate: true }
    })

    const occupiedTimes = new Set(existing.map((apt: { scheduledDate: Date }) => format(apt.scheduledDate, 'HH:mm')))

    const now = new Date()
    const minBookingTime = addMinutes(now, 120)
    const isToday = format(date, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd')

    return baseSlots.map(time => {
      const [hours, minutes] = time.split(':').map(Number)
      const slotDate = new Date(date)
      slotDate.setHours(hours, minutes, 0, 0)

      const isPast = isToday && isBefore(slotDate, minBookingTime)
      const isOccupied = occupiedTimes.has(time)

      return { time, available: !isPast && !isOccupied }
    })
  }

  async createBooking(request: PublicBookingRequest): Promise<PublicBookingResult> {
    const errors: string[] = []

    if (!request.patientName || request.patientName.length < 3) {
      errors.push('Nome completo é obrigatório')
    }
    if (!request.patientCpf || !this.isValidCPF(request.patientCpf)) {
      errors.push('CPF inválido')
    }
    if (!request.patientPhone || request.patientPhone.length < 10) {
      errors.push('Telefone inválido')
    }
    if (!request.acceptedTerms) {
      errors.push('É necessário aceitar os termos de uso')
    }

    if (errors.length > 0) {
      return { success: false, message: 'Dados inválidos', errors }
    }

    const appointmentDate = this.combineDateTime(request.date, request.time)
    
    if (isBefore(appointmentDate, addMinutes(new Date(), 120))) {
      return { success: false, message: 'Horário não disponível', errors: ['Mínimo 2h de antecedência'] }
    }

    // Verificar disponibilidade
    const existing = await prisma.consultation.findFirst({
      where: {
        scheduledDate: appointmentDate,
        doctorId: request.professionalId,
        status: { in: ['SCHEDULED', 'IN_PROGRESS'] }
      }
    })

    if (existing) {
      return { success: false, message: 'Horário ocupado', errors: ['Escolha outro horário'] }
    }

    // Buscar/criar paciente
    const cpfClean = request.patientCpf.replace(/\D/g, '')
    let patient = await prisma.patient.findFirst({ where: { cpf: cpfClean } })

    if (!patient) {
      patient = await prisma.patient.create({
        data: {
          name: request.patientName,
          cpf: cpfClean,
          phone: request.patientPhone.replace(/\D/g, ''),
          email: request.patientEmail || `${cpfClean}@temp.healthcare.local`,
          birthDate: new Date('1990-01-01'), // Placeholder
          gender: 'OTHER'
        }
      })
    }

    const confirmationCode = this.generateConfirmationCode()
    
    let professional = null
    if (request.professionalId) {
      professional = await prisma.user.findUnique({
        where: { id: request.professionalId },
        select: { name: true }
      })
    }

    const consultation = await prisma.consultation.create({
      data: {
        patientId: patient.id,
        doctorId: request.professionalId || '',
        scheduledDate: appointmentDate,
        type: request.isFirstVisit ? 'INITIAL' : 'FOLLOW_UP',
        status: 'SCHEDULED',
        notes: `Agendamento público | Código: ${confirmationCode}${request.reason ? ` | Motivo: ${request.reason}` : ''}`
      }
    })

    return {
      success: true,
      bookingId: consultation.id,
      confirmationCode,
      appointmentDate,
      professionalName: professional?.name || undefined,
      message: `Agendamento confirmado! Código: ${confirmationCode}`
    }
  }

  async getBookingByCode(code: string, cpf: string): Promise<{ found: boolean; consultation?: any }> {
    const cpfClean = cpf.replace(/\D/g, '')
    const patient = await prisma.patient.findFirst({ where: { cpf: cpfClean } })
    if (!patient) return { found: false }

    const consultation = await prisma.consultation.findFirst({
      where: {
        patientId: patient.id,
        notes: { contains: code }
      },
      include: { doctor: { select: { name: true } } }
    })

    if (!consultation) return { found: false }

    return {
      found: true,
      consultation: {
        id: consultation.id,
        date: consultation.scheduledDate,
        status: consultation.status,
        professionalName: consultation.doctor?.name
      }
    }
  }

  async cancelBooking(code: string, cpf: string): Promise<{ success: boolean; message: string }> {
    const booking = await this.getBookingByCode(code, cpf)
    if (!booking.found) return { success: false, message: 'Não encontrado' }

    await prisma.consultation.update({
      where: { id: booking.consultation.id },
      data: { status: 'CANCELLED', notes: 'Cancelado pelo paciente via widget' }
    })

    return { success: true, message: 'Cancelado com sucesso' }
  }

  private generateBaseSlots(): string[] {
    const slots: string[] = []
    for (let h = 8; h < 18; h++) {
      if (h >= 12 && h < 14) continue // Almoço
      slots.push(`${h.toString().padStart(2, '0')}:00`)
      slots.push(`${h.toString().padStart(2, '0')}:30`)
    }
    return slots
  }

  private combineDateTime(date: Date, time: string): Date {
    const [hours, minutes] = time.split(':').map(Number)
    const result = new Date(date)
    result.setHours(hours, minutes, 0, 0)
    return result
  }

  private generateConfirmationCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let code = ''
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)]
    }
    return code
  }

  private isValidCPF(cpf: string): boolean {
    const cleaned = cpf.replace(/\D/g, '')
    if (cleaned.length !== 11) return false
    if (/^(\d)\1+$/.test(cleaned)) return false
    
    let sum = 0
    for (let i = 0; i < 9; i++) sum += parseInt(cleaned[i]) * (10 - i)
    let digit = (sum * 10) % 11
    if (digit === 10) digit = 0
    if (digit !== parseInt(cleaned[9])) return false

    sum = 0
    for (let i = 0; i < 10; i++) sum += parseInt(cleaned[i]) * (11 - i)
    digit = (sum * 10) % 11
    if (digit === 10) digit = 0
    if (digit !== parseInt(cleaned[10])) return false

    return true
  }
}

export const publicBookingService = new PublicBookingService()
