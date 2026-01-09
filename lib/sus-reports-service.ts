/**
 * SUS Reports Service
 * Gera relatórios SIAB (Produção Diária, Mensal, Estratificada, etc)
 */

import type { Consultation, Patient } from '@prisma/client'
import { startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns'
import { prisma } from '@/lib/prisma'

export interface DailyReportParams {
  healthUnitId: string
  reportDate: Date
  professionalId?: string
}

export interface MonthlyReportParams {
  healthUnitId: string
  month: number
  year: number
}

export class SUSReportsService {
  /**
   * Gera Relatório de Produção Diária (SIAB-AD)
   */
  static async generateDailyProductionReport(params: DailyReportParams) {
    const { healthUnitId, reportDate, professionalId } = params

    try {
      // Consultas do dia
      const dayStart = new Date(reportDate)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(reportDate)
      dayEnd.setHours(23, 59, 59, 999)

      // Query base de consultas
      let consultationQuery: any = {
        actualDate: {
          gte: dayStart,
          lte: dayEnd
        },
        status: 'COMPLETED' // Apenas consultas concluídas
      }

      // Se houver profissional específico
      if (professionalId) {
        consultationQuery.doctorId = professionalId
      }

      // Buscar consultas
      const consultations = await prisma.consultation.findMany({
        where: consultationQuery,
        include: {
          patient: true,
          doctor: true
        }
      })

      // Agregar consultas por tipo
      const aggregation = {
        clinicConsultations: consultations.filter(
          c => c.type === 'ROUTINE' || c.type === 'FOLLOW_UP'
        ).length,
        preNatalConsultations: consultations.filter(
          c => c.type === 'ROUTINE' && c.scheduledDemand
        ).length,
        pediatricConsultations: consultations.filter(
          c => c.type === 'ROUTINE'
        ).length,
        urgencyConsultations: consultations.filter(
          c => c.type === 'EMERGENCY'
        ).length,
        homeVisits: consultations.filter(
          c => c.homeVisit === true
        ).length,
        groupActivities: 0, // Removed - field not in schema
        totalConsultations: consultations.length
      }

      // Buscar ou criar relatório diário
      const report = await prisma.dailyProductionReport.upsert({
        where: {
          // Usar composição de campos único
          healthUnitId_reportDate_professionalId: {
            healthUnitId,
            reportDate: new Date(reportDate),
            professionalId: professionalId || ''
          }
        },
        update: {
          ...aggregation,
          updatedAt: new Date()
        },
        create: {
          healthUnitId,
          reportDate: new Date(reportDate),
          month: reportDate.getMonth() + 1,
          year: reportDate.getFullYear(),
          professionalId: professionalId || undefined,
          ...aggregation,
          createdBy: professionalId || 'SYSTEM',
          flagged: aggregation.totalConsultations === 0
        }
      })

      return report
    } catch (error) {
      console.error('Erro ao gerar relatório diário:', error)
      throw error
    }
  }

  /**
   * Gera Relatório de Produção Mensal (SIAB-PM)
   */
  static async generateMonthlyProductionReport(params: MonthlyReportParams) {
    const { healthUnitId, month, year } = params

    try {
      const monthStart = new Date(year, month - 1, 1)
      const monthEnd = new Date(year, month, 0)
      monthEnd.setHours(23, 59, 59, 999)

      // Buscar todas as consultas do mês
      const consultations = await prisma.consultation.findMany({
        where: {
          actualDate: {
            gte: monthStart,
            lte: monthEnd
          },
          status: 'COMPLETED'
        },
        include: {
          patient: true
        }
      })

      // Helper para calcular idade
      const calculateAge = (birthDate: Date): number => {
        const today = new Date()
        let age = today.getFullYear() - birthDate.getFullYear()
        const monthDiff = today.getMonth() - birthDate.getMonth()
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--
        }
        return age
      }

      // Agregar por faixa etária
      const ageGroupCounts = {
        under1: consultations.filter(
          c => calculateAge(c.patient.birthDate) < 1
        ).length,
        '1to4': consultations.filter(
          c => {
            const age = calculateAge(c.patient.birthDate)
            return age >= 1 && age <= 4
          }
        ).length,
        '5to9': consultations.filter(
          c => {
            const age = calculateAge(c.patient.birthDate)
            return age >= 5 && age <= 9
          }
        ).length,
        '10to14': consultations.filter(
          c => {
            const age = calculateAge(c.patient.birthDate)
            return age >= 10 && age <= 14
          }
        ).length,
        '15to19': consultations.filter(
          c => {
            const age = calculateAge(c.patient.birthDate)
            return age >= 15 && age <= 19
          }
        ).length,
        '20to49': consultations.filter(
          c => {
            const age = calculateAge(c.patient.birthDate)
            return age >= 20 && age <= 49
          }
        ).length,
        '50to59': consultations.filter(
          c => {
            const age = calculateAge(c.patient.birthDate)
            return age >= 50 && age <= 59
          }
        ).length,
        '60plus': consultations.filter(
          c => calculateAge(c.patient.birthDate) >= 60
        ).length
      }

      // Agregar por tipo
      const typeCounts = {
        clinicConsultations: consultations.filter(
          c => c.type === 'ROUTINE' || c.type === 'FOLLOW_UP'
        ).length,
        preNatalConsultations: consultations.filter(
          c => c.type === 'ROUTINE' && c.scheduledDemand
        ).length,
        pediatricConsultations: consultations.filter(
          c => c.type === 'ROUTINE'
        ).length,
        urgencyConsultations: consultations.filter(
          c => c.type === 'EMERGENCY'
        ).length
      }

      // Buscar unidade de saúde
      const healthUnit = await prisma.healthUnit.findUnique({
        where: { id: healthUnitId }
      })

      // Contar pacientes únicos e famílias (simulado)
      const uniquePatients = new Set(consultations.map(c => c.patientId)).size
      const familiesEstimate = Math.ceil(uniquePatients / 3.5) // Média de pessoas por família

      // Criar/atualizar relatório mensal
      const report = await prisma.monthlyProductionReport.upsert({
        where: {
          healthUnitId_month_year: {
            healthUnitId,
            month,
            year
          }
        },
        update: {
          totalConsultations: consultations.length,
          totalPatients: uniquePatients,
          newPatients: consultations.filter(c => {
            // Considerar novo se primeira consulta neste mês
            return c.createdAt >= monthStart
          }).length,
          totalFamilies: familiesEstimate,
          populationCovered: healthUnit?.staffCount ? uniquePatients * 3 : uniquePatients,
          ...typeCounts,
          consultationsUnder1: ageGroupCounts.under1,
          consultations1to4: ageGroupCounts['1to4'],
          consultations5to9: ageGroupCounts['5to9'],
          consultations10to14: ageGroupCounts['10to14'],
          consultations15to19: ageGroupCounts['15to19'],
          consultations20to49: ageGroupCounts['20to49'],
          consultations50to59: ageGroupCounts['50to59'],
          consultations60plus: ageGroupCounts['60plus'],
          updatedAt: new Date()
        },
        create: {
          healthUnitId,
          month,
          year,
          totalConsultations: consultations.length,
          totalPatients: uniquePatients,
          newPatients: consultations.filter(c => {
            return c.createdAt >= monthStart
          }).length,
          totalFamilies: familiesEstimate,
          populationCovered: healthUnit?.staffCount ? uniquePatients * 3 : uniquePatients,
          ...typeCounts,
          consultationsUnder1: ageGroupCounts.under1,
          consultations1to4: ageGroupCounts['1to4'],
          consultations5to9: ageGroupCounts['5to9'],
          consultations10to14: ageGroupCounts['10to14'],
          consultations15to19: ageGroupCounts['15to19'],
          consultations20to49: ageGroupCounts['20to49'],
          consultations50to59: ageGroupCounts['50to59'],
          consultations60plus: ageGroupCounts['60plus'],
          coveragePercentage: (uniquePatients / (healthUnit?.staffCount || 100)) * 100,
          createdBy: 'SYSTEM'
        }
      })

      return report
    } catch (error) {
      console.error('Erro ao gerar relatório mensal:', error)
      throw error
    }
  }

  /**
   * Gera Relatório de Situação de Saúde (SIAB-SS)
   */
  static async generateHealthSituationReport(params: MonthlyReportParams) {
    const { healthUnitId, month, year } = params

    try {
      const monthStart = new Date(year, month - 1, 1)
      const monthEnd = new Date(year, month, 0)

      // Contar pacientes com diagnósticos específicos
      const diagnoses = await prisma.diagnosis.findMany({
        where: {
          createdAt: {
            gte: monthStart,
            lte: monthEnd
          },
          status: 'ACTIVE'
        },
        include: {
          primaryCode: true
        }
      })

      // Categorizar diagnósticos
      const categorizeDisease = (codeDisplay: string): string[] => {
        const lower = codeDisplay.toLowerCase()
        const diseases = []

        if (lower.includes('diabetes')) diseases.push('diabetic')
        if (lower.includes('hipertensão') || lower.includes('hypertension'))
          diseases.push('hypertensive')
        if (lower.includes('tuberculose') || lower.includes('tuberculosis'))
          diseases.push('tuberculosis')
        if (lower.includes('hanseníase') || lower.includes('lepra'))
          diseases.push('leprous')
        if (lower.includes('hiv') || lower.includes('aids'))
          diseases.push('hiv')
        if (lower.includes('sífilis') || lower.includes('syphilis'))
          diseases.push('syphilis')

        return diseases
      }

      const report = await prisma.healthSituationReport.upsert({
        where: {
          healthUnitId_month_year: {
            healthUnitId,
            month,
            year
          }
        },
        update: {
          createdAt: new Date()
        },
        create: {
          healthUnitId,
          month,
          year,
          diabeticCases: diagnoses.filter(d =>
            categorizeDisease(d.primaryCode.display).includes('diabetic')
          ).length,
          hypertensiveCases: diagnoses.filter(d =>
            categorizeDisease(d.primaryCode.display).includes('hypertensive')
          ).length,
          tuberculosisCases: diagnoses.filter(d =>
            categorizeDisease(d.primaryCode.display).includes('tuberculosis')
          ).length,
          leprousCases: diagnoses.filter(d =>
            categorizeDisease(d.primaryCode.display).includes('leprous')
          ).length,
          hivCases: diagnoses.filter(d =>
            categorizeDisease(d.primaryCode.display).includes('hiv')
          ).length,
          syphilisCases: diagnoses.filter(d =>
            categorizeDisease(d.primaryCode.display).includes('syphilis')
          ).length,
          createdBy: 'SYSTEM'
        }
      })

      return report
    } catch (error) {
      console.error('Erro ao gerar relatório de situação de saúde:', error)
      throw error
    }
  }

  /**
   * Lista todos os relatórios mensais de uma unidade
   */
  static async getMonthlyReportsByUnit(healthUnitId: string) {
    try {
      return await prisma.monthlyProductionReport.findMany({
        where: { healthUnitId },
        orderBy: { createdAt: 'desc' },
        take: 12 // Últimos 12 meses
      })
    } catch (error) {
      console.error('Erro ao buscar relatórios mensais:', error)
      throw error
    }
  }

  /**
   * Lista relatórios diários de uma unidade
   */
  static async getDailyReportsByUnit(
    healthUnitId: string,
    monthYear?: { month: number; year: number }
  ) {
    try {
      const where: any = { healthUnitId }

      if (monthYear) {
        const { month, year } = monthYear
        where.AND = [
          {
            month
          },
          {
            year
          }
        ]
      }

      return await prisma.dailyProductionReport.findMany({
        where,
        orderBy: { reportDate: 'desc' },
        take: 30 // Últimos 30 dias
      })
    } catch (error) {
      console.error('Erro ao buscar relatórios diários:', error)
      throw error
    }
  }
}

export default new SUSReportsService()
