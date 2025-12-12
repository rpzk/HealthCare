/**
 * Serviço de Auditoria Avançada
 * 
 * Funcionalidades:
 * - Logging automático de todas as ações
 * - Detecção de anomalias (ML-ready)
 * - Alertas em tempo real
 * - Análise de padrões suspeitos
 * - Compliance LGPD/CFM
 */

import { prisma } from '@/lib/prisma';
import { AuditAlertType, AlertSeverity, AlertStatus } from '@prisma/client';

interface AuditLogEntry {
  userId: string;
  userEmail: string;
  userRole: string;
  action: string;
  resourceId?: string;
  resourceType?: string;
  ipAddress?: string;
  userAgent?: string;
  success?: boolean;
  errorMessage?: string;
  changes?: any;
  metadata?: any;
}

interface AnomalyDetectionResult {
  isAnomaly: boolean;
  confidence: number; // 0-1
  reasons: string[];
  alertType?: AuditAlertType;
  severity?: AlertSeverity;
}

export class AdvancedAuditService {
  /**
   * Registrar ação no audit log
   */
  async log(entry: AuditLogEntry) {
    const auditLog = await prisma.auditLog.create({
      data: {
        ...entry,
        success: entry.success ?? true,
        createdAt: new Date()
      }
    });

    // Análise de anomalia em tempo real
    const anomaly = await this.detectAnomaly(auditLog.id, entry);
    
    if (anomaly.isAnomaly) {
      await this.createAlert(anomaly, entry, [auditLog.id]);
    }

    return auditLog;
  }

  /**
   * Detectar anomalias
   */
  private async detectAnomaly(auditLogId: string, entry: AuditLogEntry): Promise<AnomalyDetectionResult> {
    const reasons: string[] = [];
    let isAnomaly = false;
    let alertType: AuditAlertType | undefined;
    let severity: AlertSeverity = 'MEDIUM';

    // 1. Múltiplas tentativas de login falhadas
    if (entry.action === 'LOGIN' && entry.success === false) {
      const recentFailures = await prisma.auditLog.count({
        where: {
          userId: entry.userId,
          action: 'LOGIN',
          success: false,
          createdAt: {
            gte: new Date(Date.now() - 15 * 60 * 1000) // últimos 15 min
          }
        }
      });

      if (recentFailures >= 3) {
        isAnomaly = true;
        alertType = 'FAILED_LOGIN_ATTEMPTS';
        severity = 'HIGH';
        reasons.push(`${recentFailures} tentativas de login falhadas em 15 minutos`);
      }
    }

    // 2. Acesso não autorizado
    if (entry.action.includes('UNAUTHORIZED') || entry.errorMessage?.includes('unauthorized')) {
      isAnomaly = true;
      alertType = 'UNAUTHORIZED_ACCESS';
      severity = 'HIGH';
      reasons.push('Tentativa de acesso a recurso sem permissão');
    }

    // 3. Exportação em massa de dados
    if (entry.action.includes('EXPORT') || entry.action.includes('DOWNLOAD_BULK')) {
      const recentExports = await prisma.auditLog.count({
        where: {
          userId: entry.userId,
          action: { contains: 'EXPORT' },
          createdAt: {
            gte: new Date(Date.now() - 60 * 60 * 1000) // última hora
          }
        }
      });

      if (recentExports > 5) {
        isAnomaly = true;
        alertType = 'DATA_EXPORT_BULK';
        severity = 'CRITICAL';
        reasons.push(`${recentExports} exportações de dados em 1 hora`);
      }
    }

    // 4. Acesso fora do horário comercial
    const hour = new Date().getHours();
    const isWeekend = [0, 6].includes(new Date().getDay());
    
    if ((hour < 6 || hour > 22) || isWeekend) {
      // Apenas alertar para ações sensíveis
      if (entry.action.includes('DELETE') || entry.action.includes('EXPORT') || entry.action.includes('MODIFY_ROLE')) {
        isAnomaly = true;
        alertType = 'AFTER_HOURS_ACCESS';
        severity = 'MEDIUM';
        reasons.push('Ação sensível fora do horário comercial');
      }
    }

    // 5. Mudança de privilégios
    if (entry.action.includes('ROLE_CHANGE') || entry.action.includes('PERMISSION_GRANT')) {
      isAnomaly = true;
      alertType = 'ROLE_PRIVILEGE_ESCALATION';
      severity = 'CRITICAL';
      reasons.push('Alteração de papéis ou permissões');
    }

    // 6. Acesso a dados sensíveis (HIV, psiquiatria, etc.)
    if (entry.metadata?.isSensitiveData || entry.resourceType === 'SENSITIVE_RECORD') {
      // Apenas log, mas monitorar frequência
      const sensitiveAccess = await prisma.auditLog.count({
        where: {
          userId: entry.userId,
          metadata: { path: ['isSensitiveData'], equals: true },
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // últimas 24h
          }
        }
      });

      if (sensitiveAccess > 20) {
        isAnomaly = true;
        alertType = 'SENSITIVE_DATA_ACCESS';
        severity = 'HIGH';
        reasons.push(`${sensitiveAccess} acessos a dados sensíveis em 24h`);
      }
    }

    // 7. Padrão anômalo de atividade (velocidade)
    const recentActions = await prisma.auditLog.count({
      where: {
        userId: entry.userId,
        createdAt: {
          gte: new Date(Date.now() - 5 * 60 * 1000) // últimos 5 min
        }
      }
    });

    if (recentActions > 50) {
      isAnomaly = true;
      alertType = 'UNUSUAL_ACTIVITY_PATTERN';
      severity = 'MEDIUM';
      reasons.push(`${recentActions} ações em 5 minutos (possível script/bot)`);
    }

    return {
      isAnomaly,
      confidence: isAnomaly ? 0.8 : 0,
      reasons,
      alertType,
      severity
    };
  }

  /**
   * Criar alerta
   */
  private async createAlert(
    anomaly: AnomalyDetectionResult,
    entry: AuditLogEntry,
    auditLogIds: string[]
  ) {
    if (!anomaly.alertType) return;

    const alert = await prisma.auditAlert.create({
      data: {
        alertType: anomaly.alertType,
        severity: anomaly.severity!,
        title: this.getAlertTitle(anomaly.alertType),
        description: anomaly.reasons.join('; '),
        userId: entry.userId,
        ipAddress: entry.ipAddress,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId,
        auditLogIds,
        metadata: {
          confidence: anomaly.confidence,
          userEmail: entry.userEmail,
          userRole: entry.userRole,
          action: entry.action
        },
        status: 'OPEN'
      }
    });

    // Notificar administradores (email/Slack)
    if (anomaly.severity === 'CRITICAL' || anomaly.severity === 'HIGH') {
      await this.notifyAdmins(alert.id, anomaly.alertType, entry);
    }

    return alert;
  }

  /**
   * Obter título do alerta
   */
  private getAlertTitle(type: AuditAlertType): string {
    const titles = {
      FAILED_LOGIN_ATTEMPTS: 'Múltiplas Tentativas de Login Falhadas',
      UNAUTHORIZED_ACCESS: 'Acesso Não Autorizado',
      DATA_EXPORT_BULK: 'Exportação em Massa de Dados',
      ROLE_PRIVILEGE_ESCALATION: 'Alteração de Privilégios',
      AFTER_HOURS_ACCESS: 'Acesso Fora do Horário',
      UNUSUAL_ACTIVITY_PATTERN: 'Padrão Anômalo de Atividade',
      SENSITIVE_DATA_ACCESS: 'Acesso Excessivo a Dados Sensíveis',
      GDPR_DATA_DELETION: 'Solicitação LGPD',
      FAILED_AUDIT_VALIDATION: 'Falha na Validação de Auditoria',
      CRITICAL_ERROR: 'Erro Crítico do Sistema'
    };
    return titles[type] || 'Alerta de Auditoria';
  }

  /**
   * Notificar administradores
   */
  private async notifyAdmins(alertId: string, alertType: AuditAlertType, entry: AuditLogEntry) {
    // TODO: Integrar com email/Slack
    console.log(`[ALERTA CRÍTICO] ${alertType}:`, {
      user: entry.userEmail,
      ip: entry.ipAddress,
      action: entry.action
    });

    await prisma.auditAlert.update({
      where: { id: alertId },
      data: {
        notifiedAt: new Date(),
        notifiedVia: 'console' // TODO: email/slack
      }
    });
  }

  /**
   * Listar alertas ativos
   */
  async getActiveAlerts(filters?: {
    severity?: AlertSeverity;
    alertType?: AuditAlertType;
    userId?: string;
  }) {
    return await prisma.auditAlert.findMany({
      where: {
        status: { in: ['OPEN', 'IN_PROGRESS'] },
        ...filters
      },
      orderBy: [
        { severity: 'desc' },
        { createdAt: 'desc' }
      ],
      take: 100
    });
  }

  /**
   * Resolver alerta
   */
  async resolveAlert(alertId: string, resolvedBy: string, notes: string) {
    return await prisma.auditAlert.update({
      where: { id: alertId },
      data: {
        status: 'RESOLVED',
        resolvedBy,
        resolvedAt: new Date(),
        resolutionNotes: notes
      }
    });
  }

  /**
   * Marcar como falso positivo
   */
  async markFalsePositive(alertId: string, resolvedBy: string, notes: string) {
    return await prisma.auditAlert.update({
      where: { id: alertId },
      data: {
        status: 'FALSE_POSITIVE',
        resolvedBy,
        resolvedAt: new Date(),
        resolutionNotes: notes
      }
    });
  }

  /**
   * Relatório de auditoria (período)
   */
  async getAuditReport(startDate: Date, endDate: Date) {
    const [totalLogs, failedActions, alerts, topUsers] = await Promise.all([
      prisma.auditLog.count({
        where: {
          createdAt: { gte: startDate, lte: endDate }
        }
      }),
      prisma.auditLog.count({
        where: {
          createdAt: { gte: startDate, lte: endDate },
          success: false
        }
      }),
      prisma.auditAlert.findMany({
        where: {
          createdAt: { gte: startDate, lte: endDate }
        },
        select: {
          alertType: true,
          severity: true,
          status: true
        }
      }),
      prisma.auditLog.groupBy({
        by: ['userId', 'userEmail'],
        where: {
          createdAt: { gte: startDate, lte: endDate }
        },
        _count: { id: true },
        orderBy: { userId: 'asc' },
        take: 10
      })
    ]);

    const alertsByType = alerts.reduce((acc: Record<string, number>, alert: any) => {
      acc[alert.alertType] = (acc[alert.alertType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const alertsBySeverity = alerts.reduce((acc: Record<string, number>, alert: any) => {
      acc[alert.severity] = (acc[alert.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      period: { startDate, endDate },
      totalLogs,
      failedActions,
      successRate: ((totalLogs - failedActions) / totalLogs) * 100,
      alertsCount: alerts.length,
      alertsByType,
      alertsBySeverity,
      topUsers: topUsers.map((u: any) => ({
        userId: u.userId,
        email: u.userEmail,
        actionsCount: u._count.id
      }))
    };
  }

  /**
   * Buscar logs por filtros
   */
  async searchLogs(filters: {
    userId?: string;
    action?: string;
    resourceType?: string;
    startDate?: Date;
    endDate?: Date;
    success?: boolean;
  }, limit: number = 100) {
    return await prisma.auditLog.findMany({
      where: {
        ...(filters.userId && { userId: filters.userId }),
        ...(filters.action && { action: { contains: filters.action } }),
        ...(filters.resourceType && { resourceType: filters.resourceType }),
        ...(filters.success !== undefined && { success: filters.success }),
        ...(filters.startDate && filters.endDate && {
          createdAt: {
            gte: filters.startDate,
            lte: filters.endDate
          }
        })
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  }

  /**
   * Detalhes de alerta com audit logs relacionados
   */
  async getAlertDetails(alertId: string) {
    const alert = await prisma.auditAlert.findUnique({
      where: { id: alertId }
    });

    if (!alert) return null;

    const relatedLogs = await prisma.auditLog.findMany({
      where: {
        id: { in: alert.auditLogIds }
      },
      orderBy: { createdAt: 'desc' }
    });

    return {
      ...alert,
      relatedLogs
    };
  }
}

export const advancedAuditService = new AdvancedAuditService();
