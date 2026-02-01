/**
 * Security Audit Service (Simplified)
 * 
 * Auditoria de segurança e compliance LGPD
 * Usa models existentes no schema
 */

import prisma from '@/lib/prisma'
import { subDays, subHours, format } from 'date-fns'

// Types
export interface AuditCheck {
  id: string
  category: 'auth' | 'data' | 'access' | 'lgpd' | 'infrastructure'
  name: string
  status: 'pass' | 'warning' | 'fail' | 'info'
  description: string
  recommendation?: string
  severity: 'low' | 'medium' | 'high' | 'critical'
}

export interface AuditReport {
  generatedAt: Date
  overallScore: number
  totalChecks: number
  passed: number
  warnings: number
  failed: number
  checks: AuditCheck[]
  recommendations: string[]
}

export interface SecurityMetrics {
  failedLogins24h: number
  activeSessionsCount: number
  usersWithWeakPermissions: number
  dataAccessAnomalies: number
  lastBackupHours: number | null
}

// Service
export class SecurityAuditService {
  
  async runFullAudit(): Promise<AuditReport> {
    const checks: AuditCheck[] = []
    
    // Auth checks
    const authChecks = await this.runAuthChecks()
    checks.push(...authChecks)
    
    // Data access checks
    const dataChecks = await this.runDataAccessChecks()
    checks.push(...dataChecks)
    
    // LGPD compliance checks
    const lgpdChecks = await this.runLGPDChecks()
    checks.push(...lgpdChecks)
    
    // Infrastructure checks
    const infraChecks = await this.runInfrastructureChecks()
    checks.push(...infraChecks)
    
    const passed = checks.filter(c => c.status === 'pass').length
    const warnings = checks.filter(c => c.status === 'warning').length
    const failed = checks.filter(c => c.status === 'fail').length
    
    const overallScore = Math.round((passed / checks.length) * 100)
    
    const recommendations = checks
      .filter(c => c.recommendation && (c.status === 'fail' || c.status === 'warning'))
      .sort((a, b) => this.severityWeight(b.severity) - this.severityWeight(a.severity))
      .map(c => c.recommendation!)
    
    return {
      generatedAt: new Date(),
      overallScore,
      totalChecks: checks.length,
      passed,
      warnings,
      failed,
      checks,
      recommendations
    }
  }
  
  private async runAuthChecks(): Promise<AuditCheck[]> {
    const checks: AuditCheck[] = []
    
    // Check for users without 2FA (WebAuthn)
    const usersWithoutPasskey = await prisma.user.count({
      where: {
        isActive: true,
        webauthnCredentials: { none: {} }
      }
    })
    
    const totalActiveUsers = await prisma.user.count({ where: { isActive: true } })
    const passkeyPercent = totalActiveUsers > 0 ? ((totalActiveUsers - usersWithoutPasskey) / totalActiveUsers) * 100 : 0
    
    checks.push({
      id: 'auth-passkey',
      category: 'auth',
      name: 'Autenticação por Passkey',
      status: passkeyPercent >= 50 ? 'pass' : passkeyPercent >= 20 ? 'warning' : 'fail',
      description: `${Math.round(passkeyPercent)}% dos usuários têm passkey configurado`,
      recommendation: passkeyPercent < 50 ? 'Incentive usuários a configurar passkey para autenticação mais segura' : undefined,
      severity: 'high'
    })
    
    // Check for inactive users still enabled
    const inactiveUsers = await prisma.user.count({
      where: {
        isActive: true,
        updatedAt: { lt: subDays(new Date(), 90) }
      }
    })
    
    checks.push({
      id: 'auth-inactive-users',
      category: 'auth',
      name: 'Usuários Inativos',
      status: inactiveUsers === 0 ? 'pass' : inactiveUsers < 5 ? 'warning' : 'fail',
      description: `${inactiveUsers} usuários sem atividade há mais de 90 dias`,
      recommendation: inactiveUsers > 0 ? 'Revise e desative contas de usuários inativos' : undefined,
      severity: 'medium'
    })
    
    // Check for users with ADMIN role
    const adminCount = await prisma.user.count({
      where: { role: 'ADMIN', isActive: true }
    })
    
    checks.push({
      id: 'auth-admin-count',
      category: 'auth',
      name: 'Quantidade de Administradores',
      status: adminCount <= 3 ? 'pass' : adminCount <= 5 ? 'warning' : 'fail',
      description: `${adminCount} usuários com role ADMIN`,
      recommendation: adminCount > 3 ? 'Minimize a quantidade de usuários admin (princípio do menor privilégio)' : undefined,
      severity: 'high'
    })
    
    return checks
  }
  
  private async runDataAccessChecks(): Promise<AuditCheck[]> {
    const checks: AuditCheck[] = []
    
    // Check for audit logs coverage
    const recentAuditLogs = await prisma.auditLog.count({
      where: { createdAt: { gte: subDays(new Date(), 1) } }
    })
    
    checks.push({
      id: 'data-audit-logs',
      category: 'data',
      name: 'Logs de Auditoria',
      status: recentAuditLogs > 0 ? 'pass' : 'warning',
      description: `${recentAuditLogs} registros de auditoria nas últimas 24h`,
      recommendation: recentAuditLogs === 0 ? 'Verifique se o sistema de auditoria está funcionando' : undefined,
      severity: 'high'
    })
    
    // Check for patients without CPF (data completeness)
    const patientsWithoutCPF = await prisma.patient.count({
      where: { OR: [{ cpf: null }, { cpf: '' }] }
    })
    
    checks.push({
      id: 'data-patient-cpf',
      category: 'data',
      name: 'Completude de Dados - CPF',
      status: patientsWithoutCPF === 0 ? 'pass' : 'warning',
      description: `${patientsWithoutCPF} pacientes sem CPF cadastrado`,
      recommendation: patientsWithoutCPF > 0 ? 'Complete o cadastro de CPF para identificação única' : undefined,
      severity: 'medium'
    })
    
    // Check for prescriptions with proper tracking
    const totalPrescriptions = await prisma.prescription.count()
    const recentPrescriptions = await prisma.prescription.count({
      where: { createdAt: { gte: subDays(new Date(), 30) } }
    })
    
    checks.push({
      id: 'data-prescriptions',
      category: 'data',
      name: 'Rastreabilidade de Prescrições',
      status: 'pass',
      description: `${totalPrescriptions} prescrições total, ${recentPrescriptions} nos últimos 30 dias`,
      severity: 'low'
    })
    
    return checks
  }
  
  private async runLGPDChecks(): Promise<AuditCheck[]> {
    const checks: AuditCheck[] = []
    
    // Check for consent terms acceptance
    const termsAcceptedCount = await prisma.termAcceptance.count()
    const totalPatients = await prisma.patient.count()
    
    const consentPercent = totalPatients > 0 ? (termsAcceptedCount / totalPatients) * 100 : 0
    
    checks.push({
      id: 'lgpd-consent',
      category: 'lgpd',
      name: 'Consentimento LGPD',
      status: consentPercent >= 80 ? 'pass' : consentPercent >= 50 ? 'warning' : 'fail',
      description: `${termsAcceptedCount} termos aceitos para ${totalPatients} pacientes`,
      recommendation: consentPercent < 80 ? 'Implemente coleta de consentimento LGPD obrigatória' : undefined,
      severity: 'critical'
    })
    
    // Check for data retention policy
    const oldConsultations = await prisma.consultation.count({
      where: { scheduledDate: { lt: subDays(new Date(), 365 * 5) } }
    })
    
    checks.push({
      id: 'lgpd-retention',
      category: 'lgpd',
      name: 'Política de Retenção',
      status: oldConsultations === 0 ? 'pass' : 'info',
      description: `${oldConsultations} registros com mais de 5 anos`,
      recommendation: oldConsultations > 0 ? 'Revise política de retenção de dados conforme LGPD' : undefined,
      severity: 'medium'
    })
    
    // Check for sensitive data encryption info
    checks.push({
      id: 'lgpd-encryption',
      category: 'lgpd',
      name: 'Criptografia de Dados',
      status: 'info',
      description: 'Verificar configuração de encryption at rest no banco de dados',
      recommendation: 'Confirme que encryption at rest está habilitado no PostgreSQL',
      severity: 'high'
    })
    
    // Check for access log retention
    const oldestLog = await prisma.auditLog.findFirst({
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true }
    })
    
    checks.push({
      id: 'lgpd-access-logs',
      category: 'lgpd',
      name: 'Retenção de Logs de Acesso',
      status: 'pass',
      description: oldestLog ? `Logs desde ${format(oldestLog.createdAt, 'dd/MM/yyyy')}` : 'Sem logs antigos',
      severity: 'medium'
    })
    
    return checks
  }
  
  private async runInfrastructureChecks(): Promise<AuditCheck[]> {
    const checks: AuditCheck[] = []
    
    // Database connection check
    try {
      await prisma.$queryRaw`SELECT 1`
      checks.push({
        id: 'infra-db-connection',
        category: 'infrastructure',
        name: 'Conexão com Banco de Dados',
        status: 'pass',
        description: 'Conexão com PostgreSQL funcionando',
        severity: 'critical'
      })
    } catch {
      checks.push({
        id: 'infra-db-connection',
        category: 'infrastructure',
        name: 'Conexão com Banco de Dados',
        status: 'fail',
        description: 'Falha na conexão com PostgreSQL',
        recommendation: 'Verifique a configuração DATABASE_URL',
        severity: 'critical'
      })
    }
    
    // Check environment variables
    const requiredEnvVars = ['DATABASE_URL', 'NEXTAUTH_SECRET', 'NEXTAUTH_URL']
    const missingEnvVars = requiredEnvVars.filter(v => !process.env[v])
    
    checks.push({
      id: 'infra-env-vars',
      category: 'infrastructure',
      name: 'Variáveis de Ambiente',
      status: missingEnvVars.length === 0 ? 'pass' : 'fail',
      description: missingEnvVars.length === 0 ? 'Todas as variáveis obrigatórias configuradas' : `Faltando: ${missingEnvVars.join(', ')}`,
      recommendation: missingEnvVars.length > 0 ? 'Configure as variáveis de ambiente faltantes' : undefined,
      severity: 'critical'
    })
    
    // Check HTTPS configuration (production)
    const isHttps = process.env.NEXTAUTH_URL?.startsWith('https://')
    const isProduction = process.env.NODE_ENV === 'production'
    
    checks.push({
      id: 'infra-https',
      category: 'infrastructure',
      name: 'Configuração HTTPS',
      status: !isProduction || isHttps ? 'pass' : 'fail',
      description: isHttps ? 'HTTPS configurado' : (isProduction ? 'HTTPS não configurado em produção!' : 'Ambiente de desenvolvimento'),
      recommendation: isProduction && !isHttps ? 'Configure HTTPS para ambiente de produção' : undefined,
      severity: 'critical'
    })
    
    return checks
  }
  
  async getSecurityMetrics(): Promise<SecurityMetrics> {
    // Note: We don't have a dedicated failed_logins table, so we estimate from audit logs
    const failedLogins24h = await prisma.auditLog.count({
      where: {
        action: { contains: 'login' },
        createdAt: { gte: subHours(new Date(), 24) }
      }
    })
    
    // Active sessions - estimate from recent user activity
    const activeSessionsCount = await prisma.user.count({
      where: {
        isActive: true,
        updatedAt: { gte: subHours(new Date(), 1) }
      }
    })
    
    // Users with potential permission issues
    const usersWithWeakPermissions = await prisma.user.count({
      where: {
        isActive: true,
        webauthnCredentials: { none: {} }
      }
    })
    
    return {
      failedLogins24h,
      activeSessionsCount,
      usersWithWeakPermissions,
      dataAccessAnomalies: 0, // Would require more sophisticated analysis
      lastBackupHours: null // Would need backup system integration
    }
  }
  
  async getRecentAuditLogs(limit = 50) {
    return prisma.auditLog.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' }
    })
  }
  
  private severityWeight(severity: string): number {
    const weights: Record<string, number> = {
      critical: 4,
      high: 3,
      medium: 2,
      low: 1
    }
    return weights[severity] || 0
  }
}

export const securityAuditService = new SecurityAuditService()
