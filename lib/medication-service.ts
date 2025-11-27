/**
 * Serviço de Medicamentos
 * 
 * Fornece funcionalidades de busca, autocomplete e validação
 * para o catálogo de medicamentos do sistema.
 * 
 * Características:
 * - Busca por nome, sinônimo ou nome fantasia
 * - Filtros por tipo de receita, disponibilidade, via de administração
 * - Validação de restrições (idade, sexo)
 * - Autocomplete para prescrição
 */

import { prisma } from '@/lib/prisma'
import type { Medication, Prisma } from '@prisma/client'

export interface MedicationSearchOptions {
  query?: string
  prescriptionType?: string
  route?: string
  form?: string
  
  // Filtros de disponibilidade
  isBasicPharmacy?: boolean
  isMunicipal?: boolean
  isState?: boolean
  isHospital?: boolean
  isPopularPharmacy?: boolean
  isCommercial?: boolean
  isCompounded?: boolean
  
  // Filtros de restrição
  patientAge?: number
  patientSex?: 'M' | 'F'
  
  // Paginação
  page?: number
  limit?: number
  
  // Ordenação
  orderBy?: 'name' | 'code' | 'prescriptionType'
  orderDir?: 'asc' | 'desc'
}

export interface MedicationSearchResult {
  items: Medication[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface MedicationValidation {
  isValid: boolean
  warnings: string[]
  errors: string[]
}

export class MedicationService {
  /**
   * Busca medicamentos com filtros avançados
   * Usa os campos do modelo Medication conforme definido no schema.prisma
   */
  static async searchMedications(options: MedicationSearchOptions = {}): Promise<MedicationSearchResult> {
    const {
      query,
      prescriptionType,
      route,
      form,
      isBasicPharmacy,
      isMunicipal,
      isState,
      isHospital,
      isPopularPharmacy,
      isCommercial,
      isCompounded,
      patientAge,
      patientSex,
      page = 1,
      limit = 20,
      orderBy = 'name',
      orderDir = 'asc'
    } = options

    // Using any for dynamic Prisma query building (OR conditions require mutable array)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      active: true  // Campo correto no schema
    }

    // Busca textual - usando os campos corretos do modelo
    if (query) {
      const searchTerm = query.toLowerCase()
      where.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { synonym: { contains: searchTerm, mode: 'insensitive' } },
        { tradeName: { contains: searchTerm, mode: 'insensitive' } }
      ]
    }

    // Filtros específicos
    if (prescriptionType) {
      where.prescriptionType = prescriptionType
    }

    if (route) {
      where.route = route
    }

    if (form) {
      where.form = form
    }

    // Filtros de disponibilidade - usando nomes corretos do schema
    if (isBasicPharmacy !== undefined) where.basicPharmacy = isBasicPharmacy
    if (isMunicipal !== undefined) where.municipalPharmacy = isMunicipal
    if (isState !== undefined) where.statePharmacy = isState
    if (isHospital !== undefined) where.hospitalPharmacy = isHospital
    if (isPopularPharmacy !== undefined) where.popularPharmacy = isPopularPharmacy
    if (isCommercial !== undefined) where.commercialPharmacy = isCommercial
    if (isCompounded !== undefined) where.compoundPharmacy = isCompounded

    // Filtros de restrição por idade
    if (patientAge !== undefined) {
      where.AND = where.AND || []
      where.AND.push({
        OR: [
          { minAge: null },
          { minAge: { lte: patientAge } }
        ]
      })
      where.AND.push({
        OR: [
          { maxAge: null },
          { maxAge: { gte: patientAge } }
        ]
      })
    }

    // Filtros de restrição por sexo - usando M/F conforme schema
    if (patientSex) {
      where.AND = where.AND || []
      where.AND.push({
        OR: [
          { sexRestriction: null },
          { sexRestriction: patientSex }
        ]
      })
    }

    const skip = (page - 1) * limit

    const [items, total] = await Promise.all([
      prisma.medication.findMany({
        where,
        orderBy: { [orderBy]: orderDir },
        skip,
        take: limit
      }),
      prisma.medication.count({ where })
    ])

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  }

  /**
   * Autocomplete para campo de medicamento
   * Retorna até 10 sugestões mais relevantes
   */
  static async autocomplete(query: string, options: {
    patientAge?: number
    patientSex?: 'M' | 'F'
    availabilityFilter?: 'basic' | 'popular' | 'hospital' | 'all'
  } = {}): Promise<any[]> {
    if (!query || query.length < 2) {
      return []
    }

    const { patientAge, patientSex, availabilityFilter = 'all' } = options
    const searchTerm = query.toLowerCase()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      active: true,
      OR: [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { synonym: { contains: searchTerm, mode: 'insensitive' } },
        { tradeName: { contains: searchTerm, mode: 'insensitive' } }
      ]
    }

    // Aplicar filtros de disponibilidade - usando nomes do schema
    if (availabilityFilter === 'basic') {
      where.basicPharmacy = true
    } else if (availabilityFilter === 'popular') {
      where.popularPharmacy = true
    } else if (availabilityFilter === 'hospital') {
      where.hospitalPharmacy = true
    }

    // Filtros de restrição
    if (patientAge !== undefined) {
      where.AND = where.AND || []
      where.AND.push({
        OR: [
          { minAge: null },
          { minAge: { lte: patientAge } }
        ]
      })
      where.AND.push({
        OR: [
          { maxAge: null },
          { maxAge: { gte: patientAge } }
        ]
      })
    }

    if (patientSex) {
      where.AND = where.AND || []
      where.AND.push({
        OR: [
          { sexRestriction: null },
          { sexRestriction: patientSex }
        ]
      })
    }

    const medications = await prisma.medication.findMany({
      where,
      take: 10,
      orderBy: [
        { name: 'asc' }
      ],
      select: {
        id: true,
        name: true,
        synonym: true,
        tradeName: true,
        prescriptionType: true,
        route: true,
        form: true,
        unit: true,
        strength: true,
        defaultFrequency: true,
        defaultDuration: true,
        maxQuantity: true,
        basicPharmacy: true,
        popularPharmacy: true,
        hospitalPharmacy: true,
        minAge: true,
        maxAge: true,
        sexRestriction: true
      }
    })

    return medications
  }

  /**
   * Busca um medicamento por ID
   */
  static async getById(id: string): Promise<any | null> {
    return prisma.medication.findUnique({
      where: { id }
    })
  }

  /**
   * Valida se um medicamento pode ser prescrito para um paciente
   */
  static async validatePrescription(
    medicationId: string,
    patientAge: number,
    patientSex: 'M' | 'F'
  ): Promise<MedicationValidation> {
    const medication = await this.getById(medicationId)
    
    if (!medication) {
      return {
        isValid: false,
        warnings: [],
        errors: ['Medicamento não encontrado no catálogo']
      }
    }

    const warnings: string[] = []
    const errors: string[] = []

    // Validar restrição de idade mínima
    if (medication.minAge !== null && patientAge < medication.minAge) {
      errors.push(`Medicamento não recomendado para menores de ${medication.minAge} anos`)
    }

    // Validar restrição de idade máxima
    if (medication.maxAge !== null && patientAge > medication.maxAge) {
      warnings.push(`Medicamento geralmente indicado para pacientes até ${medication.maxAge} anos`)
    }

    // Validar restrição de sexo (usando M/F conforme schema)
    if (medication.sexRestriction) {
      if (patientSex !== medication.sexRestriction) {
        const sexName = medication.sexRestriction === 'M' ? 'masculino' : 'feminino'
        errors.push(`Medicamento indicado apenas para pacientes do sexo ${sexName}`)
      }
    }

    // Avisos sobre tipo de receita (usando os enums do schema)
    if (medication.prescriptionType === 'CONTROLLED') {
      warnings.push('Medicamento controlado - requer receita especial')
    } else if (medication.prescriptionType === 'YELLOW_A') {
      warnings.push('Medicamento de receita amarela (A) - controle especial')
    } else if (medication.prescriptionType === 'BLUE_B') {
      warnings.push('Medicamento de receita azul (B) - psicotrópico')
    }

    return {
      isValid: errors.length === 0,
      warnings,
      errors
    }
  }

  /**
   * Lista tipos de receita disponíveis
   */
  static async listPrescriptionTypes(): Promise<{ type: string; count: number }[]> {
    const result = await prisma.medication.groupBy({
      by: ['prescriptionType'],
      _count: true,
      where: { active: true }
    })

    return result.map((item: { prescriptionType: string; _count: number }) => ({
      type: item.prescriptionType,
      count: item._count
    }))
  }

  /**
   * Lista vias de administração disponíveis
   */
  static async listRoutes(): Promise<{ route: string; count: number }[]> {
    const result = await prisma.medication.groupBy({
      by: ['route'],
      _count: true,
      where: { active: true }
    })

    return result.map((item: { route: string | null; _count: number }) => ({
      route: item.route || '',
      count: item._count
    }))
  }

  /**
   * Lista formas farmacêuticas disponíveis
   */
  static async listForms(): Promise<{ form: string; count: number }[]> {
    const result = await prisma.medication.groupBy({
      by: ['form'],
      _count: true,
      where: { 
        active: true,
        form: { not: null }
      }
    })

    return result.map((item: { form: string | null; _count: number }) => ({
      form: item.form || '',
      count: item._count
    }))
  }

  /**
   * Obtém estatísticas do catálogo de medicamentos
   */
  static async getStatistics(): Promise<{
    total: number
    byPrescriptionType: Record<string, number>
    byAvailability: Record<string, number>
    byRoute: Record<string, number>
    withRestrictions: number
  }> {
    const [
      total,
      byPrescriptionType,
      basicPharmacy,
      municipal,
      state,
      hospital,
      popular,
      byRoute,
      withAgeRestriction,
      withSexRestriction
    ] = await Promise.all([
      prisma.medication.count({ where: { active: true } }),
      prisma.medication.groupBy({
        by: ['prescriptionType'],
        _count: true,
        where: { active: true }
      }),
      prisma.medication.count({ where: { active: true, basicPharmacy: true } }),
      prisma.medication.count({ where: { active: true, municipalPharmacy: true } }),
      prisma.medication.count({ where: { active: true, statePharmacy: true } }),
      prisma.medication.count({ where: { active: true, hospitalPharmacy: true } }),
      prisma.medication.count({ where: { active: true, popularPharmacy: true } }),
      prisma.medication.groupBy({
        by: ['route'],
        _count: true,
        where: { active: true }
      }),
      prisma.medication.count({
        where: {
          active: true,
          OR: [
            { minAge: { not: null } },
            { maxAge: { not: null } }
          ]
        }
      }),
      prisma.medication.count({
        where: {
          active: true,
          sexRestriction: { not: null }
        }
      })
    ])

    return {
      total,
      byPrescriptionType: byPrescriptionType.reduce((acc: Record<string, number>, item: { prescriptionType: string; _count: number }) => {
        acc[item.prescriptionType] = item._count
        return acc
      }, {} as Record<string, number>),
      byAvailability: {
        basicPharmacy,
        municipal,
        state,
        hospital,
        popular
      },
      byRoute: byRoute.reduce((acc: Record<string, number>, item: { route: string | null; _count: number }) => {
        acc[item.route || ''] = item._count
        return acc
      }, {} as Record<string, number>),
      withRestrictions: withAgeRestriction + withSexRestriction
    }
  }

  /**
   * Busca medicamentos da farmácia básica para UBS
   */
  static async getBasicPharmacyMedications(query?: string): Promise<any[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      active: true,
      basicPharmacy: true
    }

    if (query) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { synonym: { contains: query, mode: 'insensitive' } }
      ]
    }

    return prisma.medication.findMany({
      where,
      orderBy: { name: 'asc' },
      take: 50
    })
  }

  /**
   * Busca medicamentos disponíveis na Farmácia Popular
   */
  static async getPopularPharmacyMedications(query?: string): Promise<any[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      active: true,
      popularPharmacy: true
    }

    if (query) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { synonym: { contains: query, mode: 'insensitive' } }
      ]
    }

    return prisma.medication.findMany({
      where,
      orderBy: { name: 'asc' },
      take: 50
    })
  }

  /**
   * Calcula dose baseada no peso do paciente
   */
  static calculateDoseByWeight(medication: { dosePerKg?: number | null; strength?: string | null; unit?: string | null }, weightKg: number): string | null {
    if (!medication.dosePerKg || !weightKg) {
      return medication.strength ?? null
    }

    const calculatedDose = medication.dosePerKg * weightKg
    const unit = medication.unit || 'mg'
    
    return `${calculatedDose.toFixed(1)} ${unit} (${medication.dosePerKg} ${unit}/kg × ${weightKg} kg)`
  }
}

export default MedicationService
