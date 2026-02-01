/**
 * Multi-Clinic Service (Simplified)
 * 
 * Gerenciamento de múltiplas clínicas/unidades
 * Adaptado ao schema existente
 */

import prisma from '@/lib/prisma'
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns'

// Types
export interface Clinic {
  id: string
  name: string
  address?: string
  phone?: string
  isActive: boolean
  createdAt: Date
}

export interface ClinicStats {
  clinicId: string
  clinicName: string
  totalPatients: number
  totalConsultations: number
  activeUsers: number
  monthlyConsultations: number
}

export interface ClinicUser {
  userId: string
  userName: string
  role: string
  speciality?: string
  isActive: boolean
}

// Usando SystemSetting para armazenar dados de clínicas
const CLINIC_SETTINGS_KEY = 'multi_clinic_data'

// Service
export class MultiClinicService {
  
  async getClinics(): Promise<Clinic[]> {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: CLINIC_SETTINGS_KEY }
    })
    
    if (!setting?.value) {
      // Retorna clínica padrão baseada nas configurações do sistema
      const defaultClinic = await prisma.systemSetting.findUnique({
        where: { key: 'clinic_name' }
      })
      
      return [{
        id: 'default',
        name: defaultClinic?.value || 'Clínica Principal',
        isActive: true,
        createdAt: new Date()
      }]
    }
    
    try {
      return JSON.parse(setting.value) as Clinic[]
    } catch {
      return []
    }
  }
  
  async getClinicById(clinicId: string): Promise<Clinic | null> {
    const clinics = await this.getClinics()
    return clinics.find(c => c.id === clinicId) || null
  }
  
  async createClinic(data: Omit<Clinic, 'id' | 'createdAt'>): Promise<Clinic> {
    const clinics = await this.getClinics()
    
    const newClinic: Clinic = {
      id: `clinic-${Date.now()}`,
      ...data,
      createdAt: new Date()
    }
    
    clinics.push(newClinic)
    
    await prisma.systemSetting.upsert({
      where: { key: CLINIC_SETTINGS_KEY },
      update: { value: JSON.stringify(clinics) },
      create: { key: CLINIC_SETTINGS_KEY, value: JSON.stringify(clinics) }
    })
    
    return newClinic
  }
  
  async updateClinic(clinicId: string, data: Partial<Clinic>): Promise<Clinic | null> {
    const clinics = await this.getClinics()
    const index = clinics.findIndex(c => c.id === clinicId)
    
    if (index === -1) return null
    
    clinics[index] = { ...clinics[index], ...data }
    
    await prisma.systemSetting.upsert({
      where: { key: CLINIC_SETTINGS_KEY },
      update: { value: JSON.stringify(clinics) },
      create: { key: CLINIC_SETTINGS_KEY, value: JSON.stringify(clinics) }
    })
    
    return clinics[index]
  }
  
  async getClinicStats(clinicId?: string): Promise<ClinicStats[]> {
    const clinics = await this.getClinics()
    const stats: ClinicStats[] = []
    
    const now = new Date()
    const monthStart = startOfMonth(now)
    const monthEnd = endOfMonth(now)
    
    for (const clinic of clinics) {
      if (clinicId && clinic.id !== clinicId) continue
      
      // Para uma implementação completa, precisaríamos vincular pacientes/consultas a clínicas
      // Por ora, retornamos estatísticas globais para a clínica principal
      const totalPatients = await prisma.patient.count()
      const totalConsultations = await prisma.consultation.count()
      const activeUsers = await prisma.user.count({ where: { isActive: true } })
      const monthlyConsultations = await prisma.consultation.count({
        where: {
          scheduledDate: { gte: monthStart, lte: monthEnd }
        }
      })
      
      stats.push({
        clinicId: clinic.id,
        clinicName: clinic.name,
        totalPatients,
        totalConsultations,
        activeUsers,
        monthlyConsultations
      })
    }
    
    return stats
  }
  
  async getClinicUsers(clinicId: string): Promise<ClinicUser[]> {
    // Todos os usuários ativos (em implementação completa, filtraria por clínica)
    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        role: true,
        speciality: true,
        isActive: true
      }
    })
    
    return users.map(u => ({
      userId: u.id,
      userName: u.name || 'Sem nome',
      role: u.role,
      speciality: u.speciality || undefined,
      isActive: u.isActive
    }))
  }
  
  async getClinicAnalytics(clinicId: string, months = 6): Promise<{
    monthlyData: Array<{ month: string; consultations: number; patients: number }>
    topSpecialties: Array<{ specialty: string; count: number }>
    occupancyRate: number
  }> {
    const monthlyData: Array<{ month: string; consultations: number; patients: number }> = []
    
    for (let i = months - 1; i >= 0; i--) {
      const date = subMonths(new Date(), i)
      const monthStart = startOfMonth(date)
      const monthEnd = endOfMonth(date)
      
      const consultations = await prisma.consultation.count({
        where: { scheduledDate: { gte: monthStart, lte: monthEnd } }
      })
      
      const patients = await prisma.patient.count({
        where: { createdAt: { gte: monthStart, lte: monthEnd } }
      })
      
      monthlyData.push({
        month: format(date, 'MMM/yy'),
        consultations,
        patients
      })
    }
    
    // Top specialties
    const doctors = await prisma.user.findMany({
      where: { role: 'DOCTOR', isActive: true },
      select: { speciality: true }
    })
    
    const specialtyCount = new Map<string, number>()
    for (const doc of doctors) {
      const spec = doc.speciality || 'Clínico Geral'
      specialtyCount.set(spec, (specialtyCount.get(spec) || 0) + 1)
    }
    
    const topSpecialties = [...specialtyCount.entries()]
      .map(([specialty, count]) => ({ specialty, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
    
    // Occupancy rate (simplified - based on scheduled vs capacity)
    const thisMonth = await prisma.consultation.count({
      where: {
        scheduledDate: { gte: startOfMonth(new Date()), lte: endOfMonth(new Date()) },
        status: { in: ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED'] }
      }
    })
    
    const doctorCount = await prisma.user.count({ where: { role: 'DOCTOR', isActive: true } })
    const workingDays = 22
    const slotsPerDay = 16
    const totalCapacity = doctorCount * workingDays * slotsPerDay
    const occupancyRate = totalCapacity > 0 ? Math.min((thisMonth / totalCapacity) * 100, 100) : 0
    
    return {
      monthlyData,
      topSpecialties,
      occupancyRate: Math.round(occupancyRate)
    }
  }
  
  async getSystemOverview() {
    const clinics = await this.getClinics()
    const stats = await this.getClinicStats()
    
    const totalPatients = stats.reduce((sum, s) => sum + s.totalPatients, 0)
    const totalConsultations = stats.reduce((sum, s) => sum + s.totalConsultations, 0)
    const totalUsers = stats.reduce((sum, s) => sum + s.activeUsers, 0)
    
    return {
      totalClinics: clinics.length,
      activeClinics: clinics.filter(c => c.isActive).length,
      totalPatients,
      totalConsultations,
      totalUsers,
      clinicStats: stats
    }
  }
}

export const multiClinicService = new MultiClinicService()
