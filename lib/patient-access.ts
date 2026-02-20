/**
 * Patient Access Control
 * 
 * Controle de acesso baseado em equipe de atendimento
 * Apenas profissionais que fazem parte da equipe de cuidado podem acessar os dados do paciente
 * 
 * Níveis de acesso:
 * - FULL: Acesso completo (médico responsável, enfermeiro chefe)
 * - CONSULTATION: Pode realizar consultas e ver histórico  
 * - LIMITED: Acesso limitado apenas aos dados necessários
 * - EMERGENCY: Acesso de emergência temporário
 * - VIEW_ONLY: Apenas visualização, sem alterações
 * 
 * Roles especiais que sempre têm acesso:
 * - ADMIN: Acesso total ao sistema
 * - MANAGER: Acesso para fins administrativos
 */

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export type CareTeamAccessLevel = 'FULL' | 'CONSULTATION' | 'LIMITED' | 'EMERGENCY' | 'VIEW_ONLY'

export interface PatientAccessResult {
  hasAccess: boolean
  accessLevel?: CareTeamAccessLevel
  reason: string
  isPrimary?: boolean
  isAdmin?: boolean
  isEmergency?: boolean
}

export interface UserSession {
  id: string
  role?: string
}

// Roles que têm acesso administrativo (podem ver todos os pacientes)
const ADMIN_ROLES = ['ADMIN', 'MANAGER']

// Roles que são profissionais de saúde (precisam estar na equipe para acessar)
const HEALTHCARE_ROLES = [
  'DOCTOR',
  'NURSE',
  'RECEPTIONIST',
  'TECHNICIAN',
  'PHARMACIST',
  'NUTRITIONIST',
  'PSYCHOLOGIST',
  'PHYSIOTHERAPIST',
  'HEALTH_AGENT',
  'SOCIAL_WORKER',
  'DENTIST'
]

/**
 * Verifica se um usuário tem acesso a um paciente específico
 */
export async function checkPatientAccess(
  userId: string,
  patientId: string,
  userRole?: string
): Promise<PatientAccessResult> {
  // Admins e managers sempre têm acesso
  if (userRole && ADMIN_ROLES.includes(userRole.toUpperCase())) {
    return {
      hasAccess: true,
      accessLevel: 'FULL',
      reason: 'Acesso administrativo',
      isAdmin: true
    }
  }

  // Verificar existência do paciente
  const patientExists = await prisma.patient.findUnique({ where: { id: patientId }, select: { id: true } })
  if (!patientExists) {
    return {
      hasAccess: false,
      reason: 'Paciente não encontrado'
    }
  }

  // Buscar se existe um membro primário na equipe e se o usuário é membro ativo
  const primary = await prisma.patientCareTeam.findFirst({
    where: { patientId, isPrimary: true, isActive: true }
  })

  const careTeam = await prisma.patientCareTeam.findMany({
    where: {
      patientId,
      userId,
      isActive: true,
      OR: [
        { validUntil: null },
        { validUntil: { gte: new Date() } }
      ]
    },
    select: {
      accessLevel: true,
      isPrimary: true,
      validUntil: true
    }
  })

  // Se é o médico responsável (primary) tem acesso total
  if (primary?.userId === userId) {
    return {
      hasAccess: true,
      accessLevel: 'FULL',
      reason: 'Médico responsável pelo paciente',
      isPrimary: true
    }
  }

  // Verificar se está na equipe de atendimento
  const careTeamMember = careTeam[0]
  
  if (careTeamMember) {
    const isEmergencyAccess = careTeamMember.accessLevel === 'EMERGENCY'
    
    return {
      hasAccess: true,
      accessLevel: careTeamMember.accessLevel as CareTeamAccessLevel,
      reason: isEmergencyAccess 
        ? 'Acesso de emergência concedido'
        : `Membro da equipe de atendimento (${translateAccessLevel(careTeamMember.accessLevel)})`,
      isPrimary: careTeamMember.isPrimary,
      isEmergency: isEmergencyAccess
    }
  }

  // Não tem acesso
  return {
    hasAccess: false,
    reason: 'Você não faz parte da equipe de atendimento deste paciente'
  }
}

/**
 * Verifica se o usuário pode realizar uma ação específica no paciente
 */
export async function canPerformAction(
  userId: string,
  patientId: string,
  action: 'view' | 'edit' | 'prescribe' | 'consult' | 'delete',
  userRole?: string
): Promise<boolean> {
  const access = await checkPatientAccess(userId, patientId, userRole)
  
  if (!access.hasAccess) return false
  
  // Admin/Manager pode tudo
  if (access.isAdmin) return true
  
  // Mapear ações para níveis de acesso necessários
  const actionRequirements: Record<typeof action, CareTeamAccessLevel[]> = {
    view: ['FULL', 'CONSULTATION', 'LIMITED', 'EMERGENCY', 'VIEW_ONLY'],
    edit: ['FULL', 'CONSULTATION', 'EMERGENCY'],
    prescribe: ['FULL', 'CONSULTATION'],
    consult: ['FULL', 'CONSULTATION'],
    delete: ['FULL']
  }
  
  const allowedLevels = actionRequirements[action]
  return access.accessLevel ? allowedLevels.includes(access.accessLevel) : false
}

/**
 * Retorna lista de pacientes que o usuário pode acessar
 */
export async function getAccessiblePatients(
  userId: string,
  userRole?: string,
  options?: {
    limit?: number
    offset?: number
    search?: string
    accessLevel?: CareTeamAccessLevel[]
  }
): Promise<{ patientId: string; accessLevel: CareTeamAccessLevel; isPrimary: boolean }[]> {
  // Admins e managers podem ver todos os pacientes
  if (userRole && ADMIN_ROLES.includes(userRole.toUpperCase())) {
    const patients = await prisma.patient.findMany({
      select: { id: true },
      take: options?.limit || 1000,
      skip: options?.offset || 0,
      where: options?.search ? {
        OR: [
          { name: { contains: options.search, mode: 'insensitive' } },
          { cpf: { contains: options.search } }
        ]
      } : undefined
    })
    
    return patients.map(p => ({
      patientId: p.id,
      accessLevel: 'FULL' as CareTeamAccessLevel,
      isPrimary: false
    }))
  }

  // Buscar pacientes onde o usuário é médico responsável (via care team isPrimary)
  const primaryPatients = await prisma.patientCareTeam.findMany({
    where: {
      userId: userId,
      isPrimary: true,
      isActive: true,
      ...(options?.search ? {
        patient: {
          OR: [
            { name: { contains: options.search, mode: 'insensitive' } },
            { cpf: { contains: options.search } }
          ]
        }
      } : {})
    },
    select: { patientId: true }
  })

  // Buscar participações na equipe de atendimento
  const careTeamAccess = await prisma.patientCareTeam.findMany({
    where: {
      userId: userId,
      isActive: true,
      OR: [
        { validUntil: null },
        { validUntil: { gte: new Date() } }
      ],
      ...(options?.accessLevel ? {
        accessLevel: { in: options.accessLevel }
      } : {}),
      ...(options?.search ? {
        patient: {
          OR: [
            { name: { contains: options.search, mode: 'insensitive' } },
            { cpf: { contains: options.search } }
          ]
        }
      } : {})
    },
    select: {
      patientId: true,
      accessLevel: true,
      isPrimary: true
    },
    take: options?.limit,
    skip: options?.offset
  })

  // Combinar resultados, evitando duplicatas
  const accessMap = new Map<string, { patientId: string; accessLevel: CareTeamAccessLevel; isPrimary: boolean }>()

  // Adicionar pacientes onde é médico responsável (maior prioridade)
  for (const p of primaryPatients) {
    accessMap.set(p.patientId, {
      patientId: p.patientId,
      accessLevel: 'FULL',
      isPrimary: true
    })
  }

  // Adicionar acesso via equipe (se não já tiver como responsável)
  for (const access of careTeamAccess) {
    if (!accessMap.has(access.patientId)) {
      accessMap.set(access.patientId, {
        patientId: access.patientId,
        accessLevel: access.accessLevel as CareTeamAccessLevel,
        isPrimary: access.isPrimary
      })
    }
  }

  return Array.from(accessMap.values())
}

/**
 * Adiciona um profissional à equipe de atendimento do paciente
 */
export async function addToCareTeam(
  patientId: string,
  userId: string,
  addedById: string,
  options?: {
    accessLevel?: CareTeamAccessLevel
    reason?: string
    validUntil?: Date
    isPrimary?: boolean
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    // Verificar se já existe
    const existing = await prisma.patientCareTeam.findUnique({
      where: {
        patientId_userId: {
          patientId,
          userId
        }
      }
    })

    if (existing) {
      // Atualizar acesso existente
      await prisma.patientCareTeam.update({
        where: { id: existing.id },
        data: {
          accessLevel: options?.accessLevel || existing.accessLevel,
          reason: options?.reason,
          validUntil: options?.validUntil,
          isPrimary: options?.isPrimary ?? existing.isPrimary,
          isActive: true,
          updatedAt: new Date()
        }
      })
      return { success: true }
    }

    // Criar novo acesso
    await prisma.patientCareTeam.create({
      data: {
        patientId,
        userId,
        addedById,
        accessLevel: options?.accessLevel || 'CONSULTATION',
        reason: options?.reason,
        validUntil: options?.validUntil,
        isPrimary: options?.isPrimary || false
      }
    })

    return { success: true }
  } catch (error) {
    logger.error('Error adding to care team:', error)
    return { success: false, error: 'Erro ao adicionar à equipe de atendimento' }
  }
}

/**
 * Remove um profissional da equipe de atendimento
 */
export async function removeFromCareTeam(
  patientId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.patientCareTeam.updateMany({
      where: {
        patientId,
        userId
      },
      data: {
        isActive: false,
        validUntil: new Date()
      }
    })
    return { success: true }
  } catch (error) {
    logger.error('Error removing from care team:', error)
    return { success: false, error: 'Erro ao remover da equipe de atendimento' }
  }
}

/**
 * Concede acesso de emergência temporário
 */
export async function grantEmergencyAccess(
  patientId: string,
  userId: string,
  grantedById: string,
  durationMinutes: number = 60
): Promise<{ success: boolean; error?: string }> {
  const validUntil = new Date()
  validUntil.setMinutes(validUntil.getMinutes() + durationMinutes)
  
  return addToCareTeam(patientId, userId, grantedById, {
    accessLevel: 'EMERGENCY',
    reason: `Acesso de emergência concedido por ${durationMinutes} minutos`,
    validUntil,
    isPrimary: false
  })
}

/**
 * Traduz o nível de acesso para português
 */
export function translateAccessLevel(level: string): string {
  const translations: Record<string, string> = {
    FULL: 'Acesso Total',
    CONSULTATION: 'Consulta',
    LIMITED: 'Limitado',
    EMERGENCY: 'Emergência',
    VIEW_ONLY: 'Apenas Visualização'
  }
  return translations[level] || level
}

/**
 * Filtro Prisma para retornar apenas pacientes acessíveis
 * Use em queries de listagem
 */
export function getPatientAccessFilter(userId: string, userRole?: string) {
  // Admin/Manager vê todos
  if (userRole && ADMIN_ROLES.includes(userRole.toUpperCase())) {
    return {}
  }

  return {
    OR: [
      // Paciente vinculado ao usuário (criado por ele)
      { userId },
      // É o médico responsável (via care team isPrimary)
      { careTeam: { some: { userId: userId, isPrimary: true } } },
      // Está na equipe de atendimento ativa
      {
        careTeam: {
          some: {
            userId: userId,
            isActive: true,
            OR: [
              { validUntil: null },
              { validUntil: { gte: new Date() } }
            ]
          }
        }
      }
    ]
  }
}

/**
 * Middleware helper para verificar acesso em rotas de API
 */
export async function requirePatientAccess(
  userId: string,
  patientId: string,
  userRole?: string,
  requiredAction?: 'view' | 'edit' | 'prescribe' | 'consult' | 'delete'
): Promise<{ allowed: boolean; error?: string; status?: number }> {
  if (!userId || !patientId) {
    return { 
      allowed: false, 
      error: 'Usuário ou paciente não especificado',
      status: 400
    }
  }

  if (requiredAction) {
    const canAct = await canPerformAction(userId, patientId, requiredAction, userRole)
    if (!canAct) {
      return {
        allowed: false,
        error: `Você não tem permissão para realizar esta ação neste paciente`,
        status: 403
      }
    }
    return { allowed: true }
  }

  const access = await checkPatientAccess(userId, patientId, userRole)
  
  if (!access.hasAccess) {
    return {
      allowed: false,
      error: access.reason,
      status: 403
    }
  }

  return { allowed: true }
}

/**
 * Hook para auto-adicionar profissional à equipe quando cria uma consulta
 */
export async function ensureAccessOnConsultation(
  patientId: string,
  doctorId: string
): Promise<void> {
  const access = await checkPatientAccess(doctorId, patientId)
  
  if (!access.hasAccess) {
    // Auto-adicionar como membro da equipe com nível de consulta
    await addToCareTeam(patientId, doctorId, doctorId, {
      accessLevel: 'CONSULTATION',
      reason: 'Adicionado automaticamente ao agendar consulta'
    })
  }
}
