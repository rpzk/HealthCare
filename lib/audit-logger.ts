/**
 * Sistema de Logs de Auditoria para HealthCare
 * Registra ações críticas no sistema para compliance e segurança
 */

export interface AuditLog {
  userId: string
  userEmail: string
  userRole: string
  action: string
  resource: string
  resourceId?: string
  details?: Record<string, any>
  ipAddress?: string
  userAgent?: string
  timestamp: Date
  success: boolean
  errorMessage?: string
}

/**
 * Tipos de ações auditáveis
 */
export enum AuditAction {
  // Autenticação
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  LOGIN_FAILED = 'LOGIN_FAILED',

  // Pacientes
  PATIENT_CREATE = 'PATIENT_CREATE',
  PATIENT_READ = 'PATIENT_READ',
  PATIENT_UPDATE = 'PATIENT_UPDATE',
  PATIENT_DELETE = 'PATIENT_DELETE',

  // Consultas
  CONSULTATION_CREATE = 'CONSULTATION_CREATE',
  CONSULTATION_READ = 'CONSULTATION_READ',
  CONSULTATION_UPDATE = 'CONSULTATION_UPDATE',
  CONSULTATION_DELETE = 'CONSULTATION_DELETE',

  // Notificações
  NOTIFICATION_CREATE = 'NOTIFICATION_CREATE',
  NOTIFICATION_READ = 'NOTIFICATION_READ',
  NOTIFICATION_UPDATE = 'NOTIFICATION_UPDATE',
  NOTIFICATION_DELETE = 'NOTIFICATION_DELETE',

  // Prescrições
  PRESCRIPTION_CREATE = 'PRESCRIPTION_CREATE',
  PRESCRIPTION_READ = 'PRESCRIPTION_READ',
  PRESCRIPTION_UPDATE = 'PRESCRIPTION_UPDATE',

  // Registros Médicos
  MEDICAL_RECORD_CREATE = 'MEDICAL_RECORD_CREATE',
  MEDICAL_RECORD_READ = 'MEDICAL_RECORD_READ',
  MEDICAL_RECORD_UPDATE = 'MEDICAL_RECORD_UPDATE',

  // IA
  AI_INTERACTION = 'AI_INTERACTION',
  AI_ANALYSIS = 'AI_ANALYSIS',
  CAPABILITY_EVALUATION_CREATE = 'CAPABILITY_EVALUATION_CREATE',

  // Sistema
  SYSTEM_CONFIG_CHANGE = 'SYSTEM_CONFIG_CHANGE',
  DATA_EXPORT = 'DATA_EXPORT',
  DATA_IMPORT = 'DATA_IMPORT',
  
  // Segurança e Anomalias
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  CRITICAL_ANOMALY_DETECTED = 'CRITICAL_ANOMALY_DETECTED',
  ANOMALY_DETECTED = 'ANOMALY_DETECTED',
  API_ERROR = 'API_ERROR',
  SECURITY_INCIDENT = 'SECURITY_INCIDENT'
}

class AuditLogger {
  private static instance: AuditLogger
  private logs: AuditLog[] = []
  private persistEnabled = true

  private constructor() {}

  public static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger()
    }
    return AuditLogger.instance
  }

  /**
   * Registra uma ação de auditoria
   */
  public log(
    userId: string,
    userEmail: string,
    userRole: string,
    action: AuditAction,
    resource: string,
    options: {
      resourceId?: string
      details?: Record<string, any>
      ipAddress?: string
      userAgent?: string
      success?: boolean
      errorMessage?: string
    } = {}
  ) {
  const auditLog: AuditLog = {
      userId,
      userEmail,
      userRole,
      action,
      resource,
      resourceId: options.resourceId,
      details: options.details,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
      timestamp: new Date(),
      success: options.success ?? true,
      errorMessage: options.errorMessage
    }

    // Em desenvolvimento, apenas log no console
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 AUDIT LOG:', {
        user: `${userEmail} (${userRole})`,
        action: action,
        resource: resource,
        success: auditLog.success,
        timestamp: auditLog.timestamp.toISOString()
      })
    }

    // Persistir no banco quando possível
    if (this.persistEnabled) {
      import('@/lib/prisma').then(async (prismaModule) => {
        try {
          // Usar a instância exportada diretamente
          const prisma = prismaModule.prisma || prismaModule.default
          
          // Tentar conectar se necessário (opcional, o prisma gerencia isso)
          // await prismaModule.ensurePrismaConnected()
          
          const client = prisma as any
          
          // Verificação de segurança para garantir que o modelo existe
          if (!client.auditLog) {
            console.warn('⚠️ Modelo AuditLog não encontrado no Prisma Client. Verifique se "npx prisma generate" foi executado.')
            return
          }

          await client.auditLog.create({
            data: {
              userId: auditLog.userId,
              userEmail: auditLog.userEmail,
              userRole: auditLog.userRole,
              action: auditLog.action,
              resourceType: auditLog.resource,
              resourceId: auditLog.resourceId || null,
              details: auditLog.details ? JSON.stringify(auditLog.details).slice(0, 15000) : null,
              ipAddress: auditLog.ipAddress || null,
              userAgent: auditLog.userAgent || null,
              success: auditLog.success,
              errorMessage: auditLog.errorMessage || null
            }
          })
        } catch (e) {
          // Desabilitar persistência se der erro (ex.: migrações não aplicadas)
          this.persistEnabled = false
          if (process.env.NODE_ENV !== 'test') {
            console.error('Falha ao persistir AuditLog, usando memória:', (e as Error).message)
          }
        }
      })
    }

    this.logs.push(auditLog)

    // Manter apenas os últimos 1000 logs em memória
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(-1000)
    }
  }

  /**
   * Log de sucesso
   */
  public logSuccess(
    userId: string,
    userEmail: string,
    userRole: string,
    action: AuditAction,
    resource: string,
    details?: Record<string, any>
  ) {
    this.log(userId, userEmail, userRole, action, resource, {
      details,
      success: true
    })
  }

  /**
   * Log de erro/falha
   */
  public logError(
    userId: string,
    userEmail: string,
    userRole: string,
    action: AuditAction,
    resource: string,
    errorMessage: string,
    details?: Record<string, any>
  ) {
    this.log(userId, userEmail, userRole, action, resource, {
      details,
      success: false,
      errorMessage
    })
  }

  /**
   * Obter logs recentes (para debug)
   */
  public getRecentLogs(limit: number = 50): AuditLog[] {
    return this.logs
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit)
  }

  /**
   * Filtrar logs por usuário
   */
  public getLogsByUser(userId: string, limit: number = 50): AuditLog[] {
    return this.logs
      .filter(log => log.userId === userId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit)
  }

  /**
   * Filtrar logs por ação
   */
  public getLogsByAction(action: AuditAction, limit: number = 50): AuditLog[] {
    return this.logs
      .filter(log => log.action === action)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit)
  }
}

// Export singleton instance
export const auditLogger = AuditLogger.getInstance()

/**
 * Helper para extrair informações da requisição
 */
export function getRequestInfo(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  
  return {
    ipAddress: forwarded?.split(',')[0] || realIP || 'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown'
  }
}
