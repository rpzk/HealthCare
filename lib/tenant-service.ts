/**
 * Multi-tenancy Service para PEP SaaS
 * 
 * Implementa isolamento de dados por tenant e controle de recursos por plano.
 * 
 * NOTA: Requer migração do schema Prisma para adicionar os modelos:
 * - Tenant
 * - UserTenant
 * 
 * Enquanto os modelos não existirem, o serviço opera em "modo single-tenant"
 * com um tenant padrão virtual.
 */

import { prisma } from '@/lib/prisma'

// ============ TYPES ============

export type TenantPlan = 'free' | 'basic' | 'professional' | 'enterprise'
export type TenantStatus = 'active' | 'suspended' | 'pending' | 'cancelled'

export interface Tenant {
  id: string
  name: string
  slug: string
  domain?: string | null
  logoUrl?: string | null
  primaryColor?: string | null
  plan: TenantPlan
  status: TenantStatus
  settings: TenantSettings
  createdAt: Date
  updatedAt: Date
}

export interface TenantSettings {
  allowedModules?: string[]
  customBranding?: boolean
  maxUsers?: number
  maxPatients?: number
  maxStorageMB?: number
  features?: string[]
}

export interface PlanLimits {
  maxUsers: number
  maxPatients: number
  maxStorageMB: number
  maxAppointmentsPerMonth: number
  features: string[]
  modules: string[]
  customDomain: boolean
  apiAccess: boolean
  ssoEnabled: boolean
  dataRetentionDays: number
}

// ============ PLAN LIMITS ============

export const PLAN_LIMITS: Record<TenantPlan, PlanLimits> = {
  free: {
    maxUsers: 2,
    maxPatients: 100,
    maxStorageMB: 500,
    maxAppointmentsPerMonth: 50,
    features: ['basic_records', 'appointments'],
    modules: ['patients', 'consultations'],
    customDomain: false,
    apiAccess: false,
    ssoEnabled: false,
    dataRetentionDays: 365
  },
  basic: {
    maxUsers: 5,
    maxPatients: 500,
    maxStorageMB: 2048,
    maxAppointmentsPerMonth: 200,
    features: ['basic_records', 'appointments', 'prescriptions', 'certificates'],
    modules: ['patients', 'consultations', 'prescriptions', 'certificates'],
    customDomain: false,
    apiAccess: false,
    ssoEnabled: false,
    dataRetentionDays: 1825 // 5 anos
  },
  professional: {
    maxUsers: 20,
    maxPatients: 5000,
    maxStorageMB: 10240,
    maxAppointmentsPerMonth: 1000,
    features: ['basic_records', 'appointments', 'prescriptions', 'certificates', 'telemedicine', 'ai_analysis', 'reports'],
    modules: ['patients', 'consultations', 'prescriptions', 'certificates', 'telemedicine', 'reports', 'inventory'],
    customDomain: true,
    apiAccess: true,
    ssoEnabled: false,
    dataRetentionDays: 3650 // 10 anos
  },
  enterprise: {
    maxUsers: -1, // unlimited
    maxPatients: -1,
    maxStorageMB: -1,
    maxAppointmentsPerMonth: -1,
    features: ['all'],
    modules: ['all'],
    customDomain: true,
    apiAccess: true,
    ssoEnabled: true,
    dataRetentionDays: 7300 // 20 anos (requisito CFM)
  }
}

// ============ DEFAULT TENANT ============

const DEFAULT_TENANT: Tenant = {
  id: 'default',
  name: 'Sistema Principal',
  slug: 'default',
  domain: null,
  logoUrl: null,
  primaryColor: null,
  plan: 'enterprise',
  status: 'active',
  settings: {},
  createdAt: new Date(),
  updatedAt: new Date()
}

// ============ TENANT SERVICE ============

export class TenantService {
  private static tenantModelExists: boolean | null = null

  /**
   * Verifica se o modelo Tenant existe no schema
   */
  private static async checkTenantModelExists(): Promise<boolean> {
    if (this.tenantModelExists !== null) {
      return this.tenantModelExists
    }

    try {
      // Tenta acessar a tabela - se não existir, dará erro
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (prisma as any).tenant?.findFirst?.({ take: 1 })
      this.tenantModelExists = true
    } catch {
      this.tenantModelExists = false
    }

    return this.tenantModelExists
  }

  /**
   * Obtém o tenant a partir do domínio ou slug
   */
  static async getTenantByDomainOrSlug(identifier: string): Promise<Tenant | null> {
    const modelExists = await this.checkTenantModelExists()
    
    if (!modelExists) {
      // Modo single-tenant
      return identifier === 'default' ? DEFAULT_TENANT : null
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tenant = await (prisma as any).tenant.findFirst({
        where: {
          OR: [
            { slug: identifier },
            { domain: identifier }
          ],
          status: 'active'
        }
      })

      if (!tenant) return null

      return {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        domain: tenant.domain,
        logoUrl: tenant.logoUrl,
        primaryColor: tenant.primaryColor,
        plan: tenant.plan as TenantPlan,
        status: tenant.status as TenantStatus,
        settings: (tenant.settings as TenantSettings) || {},
        createdAt: tenant.createdAt,
        updatedAt: tenant.updatedAt
      }
    } catch {
      console.debug('Tenant lookup failed')
      return DEFAULT_TENANT
    }
  }

  /**
   * Obtém o tenant do usuário atual
   */
  static async getTenantForUser(userId: string): Promise<Tenant | null> {
    const modelExists = await this.checkTenantModelExists()
    
    if (!modelExists) {
      return DEFAULT_TENANT
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const userTenant = await (prisma as any).userTenant?.findFirst?.({
        where: { userId },
        include: { tenant: true }
      })

      if (!userTenant?.tenant) {
        return DEFAULT_TENANT
      }

      const tenant = userTenant.tenant
      return {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        domain: tenant.domain,
        logoUrl: tenant.logoUrl,
        primaryColor: tenant.primaryColor,
        plan: tenant.plan as TenantPlan,
        status: tenant.status as TenantStatus,
        settings: (tenant.settings as TenantSettings) || {},
        createdAt: tenant.createdAt,
        updatedAt: tenant.updatedAt
      }
    } catch {
      console.debug('User tenant lookup failed')
      return DEFAULT_TENANT
    }
  }

  /**
   * Cria um novo tenant
   */
  static async createTenant(data: {
    name: string
    slug: string
    plan?: TenantPlan
    ownerId: string
    domain?: string
  }): Promise<Tenant> {
    const modelExists = await this.checkTenantModelExists()
    
    if (!modelExists) {
      // Retorna um tenant virtual
      return {
        ...DEFAULT_TENANT,
        id: `virtual-${Date.now()}`,
        name: data.name,
        slug: data.slug,
        plan: data.plan || 'free'
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tenant = await (prisma as any).tenant.create({
      data: {
        name: data.name,
        slug: data.slug,
        plan: data.plan || 'free',
        domain: data.domain,
        status: 'active',
        settings: PLAN_LIMITS[data.plan || 'free'],
        users: {
          create: {
            userId: data.ownerId,
            role: 'owner'
          }
        }
      }
    })

    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      domain: tenant.domain,
      logoUrl: tenant.logoUrl,
      primaryColor: tenant.primaryColor,
      plan: tenant.plan as TenantPlan,
      status: tenant.status as TenantStatus,
      settings: (tenant.settings as TenantSettings) || {},
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt
    }
  }

  /**
   * Atualiza o plano do tenant
   */
  static async updatePlan(tenantId: string, newPlan: TenantPlan): Promise<Tenant> {
    const modelExists = await this.checkTenantModelExists()
    
    if (!modelExists) {
      return { ...DEFAULT_TENANT, plan: newPlan }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tenant = await (prisma as any).tenant.update({
      where: { id: tenantId },
      data: {
        plan: newPlan,
        settings: PLAN_LIMITS[newPlan]
      }
    })

    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      domain: tenant.domain,
      logoUrl: tenant.logoUrl,
      primaryColor: tenant.primaryColor,
      plan: tenant.plan as TenantPlan,
      status: tenant.status as TenantStatus,
      settings: (tenant.settings as TenantSettings) || {},
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt
    }
  }

  /**
   * Verifica se o tenant pode usar uma feature
   */
  static async canUseFeature(tenantId: string, feature: string): Promise<boolean> {
    const modelExists = await this.checkTenantModelExists()
    
    if (!modelExists) {
      // Single-tenant mode = all features enabled
      return true
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tenant = await (prisma as any).tenant.findUnique({
        where: { id: tenantId },
        select: { plan: true, settings: true }
      })

      if (!tenant) return false

      const limits = PLAN_LIMITS[tenant.plan as TenantPlan]
      return limits.features.includes('all') || limits.features.includes(feature)
    } catch {
      return true // Fallback: allow
    }
  }

  /**
   * Verifica se o tenant pode usar um módulo
   */
  static async canUseModule(tenantId: string, module: string): Promise<boolean> {
    const modelExists = await this.checkTenantModelExists()
    
    if (!modelExists) {
      return true
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tenant = await (prisma as any).tenant.findUnique({
        where: { id: tenantId },
        select: { plan: true }
      })

      if (!tenant) return false

      const limits = PLAN_LIMITS[tenant.plan as TenantPlan]
      return limits.modules.includes('all') || limits.modules.includes(module)
    } catch {
      return true
    }
  }

  /**
   * Verifica limites de recursos do tenant
   */
  static async checkResourceLimits(tenantId: string): Promise<{
    patients: { used: number; limit: number; ok: boolean }
    storage: { usedMB: number; limitMB: number; ok: boolean }
    users: { used: number; limit: number; ok: boolean }
  }> {
    const modelExists = await this.checkTenantModelExists()
    
    if (!modelExists) {
      // Single-tenant = unlimited
      return {
        patients: { used: 0, limit: -1, ok: true },
        storage: { usedMB: 0, limitMB: -1, ok: true },
        users: { used: 0, limit: -1, ok: true }
      }
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tenant = await (prisma as any).tenant.findUnique({
        where: { id: tenantId },
        select: { plan: true }
      })

      if (!tenant) {
        return {
          patients: { used: 0, limit: 0, ok: false },
          storage: { usedMB: 0, limitMB: 0, ok: false },
          users: { used: 0, limit: 0, ok: false }
        }
      }

      const limits = PLAN_LIMITS[tenant.plan as TenantPlan]

      // Contagem de pacientes
      let patientCount = 0
      try {
        patientCount = await prisma.patient.count()
      } catch { /* ignore */ }

      // Contagem de usuários
      let userCount = 1
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        userCount = await (prisma as any).userTenant?.count?.({ where: { tenantId } }) || 1
      } catch { /* ignore */ }

      // Uso de storage
      let usedMB = 0
      try {
        const totalBytes = await prisma.attachment.aggregate({
          _sum: { fileSize: true }
        })
        usedMB = Math.round((totalBytes._sum?.fileSize || 0) / (1024 * 1024))
      } catch { /* ignore */ }

      return {
        patients: {
          used: patientCount,
          limit: limits.maxPatients,
          ok: limits.maxPatients === -1 || patientCount < limits.maxPatients
        },
        storage: {
          usedMB,
          limitMB: limits.maxStorageMB,
          ok: limits.maxStorageMB === -1 || usedMB < limits.maxStorageMB
        },
        users: {
          used: userCount,
          limit: limits.maxUsers,
          ok: limits.maxUsers === -1 || userCount < limits.maxUsers
        }
      }
    } catch {
      console.debug('Resource limit check failed')
      return {
        patients: { used: 0, limit: -1, ok: true },
        storage: { usedMB: 0, limitMB: -1, ok: true },
        users: { used: 0, limit: -1, ok: true }
      }
    }
  }

  /**
   * Obtém os limites do plano atual
   */
  static getPlanLimits(plan: TenantPlan): PlanLimits {
    return PLAN_LIMITS[plan]
  }

  /**
   * Helper para adicionar scope de tenant em queries
   */
  static withTenantScope(tenantId: string) {
    return {
      tenantId
    }
  }

  /**
   * Helper para criar registro com tenant
   */
  static withTenantCreate(tenantId: string, data: Record<string, unknown>) {
    return {
      ...data,
      tenantId
    }
  }
}

export default TenantService
