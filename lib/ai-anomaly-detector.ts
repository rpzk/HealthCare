import { PrismaClient } from '@prisma/client';

interface SecurityEvent {
  userId: string;
  ip: string;
  endpoint: string;
  timestamp: number;
  userAgent?: string;
  responseTime: number;
  statusCode: number;
}

interface AnomalyPattern {
  type: 'RATE_SPIKE' | 'UNUSUAL_HOURS' | 'SUSPICIOUS_IP' | 'FAILED_AUTH_BURST' | 'ENDPOINT_ABUSE';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence: number; // 0-1
  description: string;
  recommendedAction: string;
}

interface UserBehaviorProfile {
  userId: string;
  typicalHours: number[]; // 0-23, typical active hours
  averageRequestsPerHour: number;
  commonEndpoints: string[];
  averageResponseTime: number;
  typicalIPs: string[];
  lastSeen: number;
}

export class AIAnomalyDetector {
  private prisma: PrismaClient;
  private userProfiles: Map<string, UserBehaviorProfile> = new Map();
  private suspiciousIPs: Set<string> = new Set();
  private recentEvents: SecurityEvent[] = [];
  private maxEventsHistory = 10000;

  constructor() {
    this.prisma = new PrismaClient();
    this.loadUserProfiles();
  }

  /**
   * 🧠 Analisa evento de segurança em tempo real usando AI
   */
  async analyzeSecurityEvent(event: SecurityEvent): Promise<AnomalyPattern[]> {
    this.addEventToHistory(event);
    
    const anomalies: AnomalyPattern[] = [];

    // 1. 📊 Análise de taxa de requisições (Rate Spike Detection)
    const rateAnomaly = this.detectRateSpike(event);
    if (rateAnomaly) anomalies.push(rateAnomaly);

    // 2. ⏰ Análise de horários incomuns (Unusual Hours Detection)
    const timeAnomaly = this.detectUnusualHours(event);
    if (timeAnomaly) anomalies.push(timeAnomaly);

    // 3. 🌐 Análise de IP suspeito (Suspicious IP Detection)
    const ipAnomaly = await this.detectSuspiciousIP(event);
    if (ipAnomaly) anomalies.push(ipAnomaly);

    // 4. 🔐 Análise de falhas de autenticação (Failed Auth Burst)
    const authAnomaly = this.detectAuthFailureBurst(event);
    if (authAnomaly) anomalies.push(authAnomaly);

    // 5. 🎯 Análise de abuso de endpoint (Endpoint Abuse)
    const endpointAnomaly = this.detectEndpointAbuse(event);
    if (endpointAnomaly) anomalies.push(endpointAnomaly);

    // 6. 📈 Aprendizado e atualização do perfil do usuário
    await this.updateUserProfile(event);

    return anomalies;
  }

  /**
   * 📊 Detecta picos anômalos de taxa de requisições
   */
  private detectRateSpike(event: SecurityEvent): AnomalyPattern | null {
    const last5Minutes = Date.now() - (5 * 60 * 1000);
    const recentRequests = this.recentEvents.filter(
      e => e.userId === event.userId && e.timestamp >= last5Minutes
    );

    const userProfile = this.userProfiles.get(event.userId);
    if (!userProfile) return null;

    const expectedRate = userProfile.averageRequestsPerHour / 12; // Por 5 minutos
    const actualRate = recentRequests.length;

    // 🚨 Se a taxa atual for 3x maior que o esperado
    if (actualRate > expectedRate * 3 && actualRate > 10) {
      const confidence = Math.min(actualRate / (expectedRate * 5), 1);
      
      return {
        type: 'RATE_SPIKE',
        severity: actualRate > expectedRate * 10 ? 'CRITICAL' : 
                 actualRate > expectedRate * 5 ? 'HIGH' : 'MEDIUM',
        confidence,
        description: `Pico de requisições detectado: ${actualRate} req/5min (esperado: ${Math.round(expectedRate)})`,
        recommendedAction: confidence > 0.8 ? 'BLOCK_USER' : 'INCREASE_MONITORING'
      };
    }

    return null;
  }

  /**
   * ⏰ Detecta atividade em horários incomuns
   */
  private detectUnusualHours(event: SecurityEvent): AnomalyPattern | null {
    const hour = new Date(event.timestamp).getHours();
    const userProfile = this.userProfiles.get(event.userId);
    
    if (!userProfile || userProfile.typicalHours.length === 0) return null;

    const isTypicalHour = userProfile.typicalHours.includes(hour);
    
    // 🌙 Atividade fora do horário típico + alta frequência = suspeito
    if (!isTypicalHour) {
      const last2Hours = Date.now() - (2 * 60 * 60 * 1000);
      const recentActivity = this.recentEvents.filter(
        e => e.userId === event.userId && e.timestamp >= last2Hours
      ).length;

      if (recentActivity > 20) { // Muita atividade em horário atípico
        return {
          type: 'UNUSUAL_HOURS',
          severity: recentActivity > 50 ? 'HIGH' : 'MEDIUM',
          confidence: 0.7,
          description: `Atividade suspeita às ${hour}h (fora do padrão: ${userProfile.typicalHours.join(', ')}h)`,
          recommendedAction: 'REQUIRE_ADDITIONAL_AUTH'
        };
      }
    }

    return null;
  }

  /**
   * 🌐 Detecta IPs suspeitos usando ML patterns
   */
  private async detectSuspiciousIP(event: SecurityEvent): Promise<AnomalyPattern | null> {
    // 1. Verificar se IP já está marcado como suspeito
    if (this.suspiciousIPs.has(event.ip)) {
      return {
        type: 'SUSPICIOUS_IP',
        severity: 'HIGH',
        confidence: 0.9,
        description: `IP ${event.ip} está na lista de suspeitos`,
        recommendedAction: 'BLOCK_IP'
      };
    }

    // 2. Análise de padrão do IP
    const last24Hours = Date.now() - (24 * 60 * 60 * 1000);
    const ipEvents = this.recentEvents.filter(
      e => e.ip === event.ip && e.timestamp >= last24Hours
    );

    // 3. 🚨 Múltiplos usuários do mesmo IP (possível botnet)
    const uniqueUsers = new Set(ipEvents.map(e => e.userId)).size;
    if (uniqueUsers > 10 && ipEvents.length > 100) {
      this.suspiciousIPs.add(event.ip);
      return {
        type: 'SUSPICIOUS_IP',
        severity: 'CRITICAL',
        confidence: 0.95,
        description: `IP ${event.ip} usado por ${uniqueUsers} usuários diferentes (possível botnet)`,
        recommendedAction: 'BLOCK_IP_IMMEDIATELY'
      };
    }

    // 4. 🎯 Alto volume de falhas de autenticação
    const authFailures = ipEvents.filter(e => e.statusCode === 401 || e.statusCode === 403).length;
    if (authFailures > 50) {
      this.suspiciousIPs.add(event.ip);
      return {
        type: 'SUSPICIOUS_IP',
        severity: 'HIGH',
        confidence: 0.8,
        description: `IP ${event.ip} com ${authFailures} falhas de autenticação`,
        recommendedAction: 'TEMPORARY_BLOCK_IP'
      };
    }

    return null;
  }

  /**
   * 🔐 Detecta rajadas de falhas de autenticação
   */
  private detectAuthFailureBurst(event: SecurityEvent): AnomalyPattern | null {
    if (event.statusCode !== 401 && event.statusCode !== 403) return null;

    const last10Minutes = Date.now() - (10 * 60 * 1000);
    const authFailures = this.recentEvents.filter(
      e => e.userId === event.userId && 
           e.timestamp >= last10Minutes &&
           (e.statusCode === 401 || e.statusCode === 403)
    );

    if (authFailures.length >= 5) {
      return {
        type: 'FAILED_AUTH_BURST',
        severity: authFailures.length > 15 ? 'CRITICAL' : 
                 authFailures.length > 10 ? 'HIGH' : 'MEDIUM',
        confidence: 0.9,
        description: `${authFailures.length} falhas de autenticação em 10 minutos`,
        recommendedAction: authFailures.length > 15 ? 'LOCK_ACCOUNT' : 'REQUIRE_CAPTCHA'
      };
    }

    return null;
  }

  /**
   * 🎯 Detecta abuso específico de endpoints
   */
  private detectEndpointAbuse(event: SecurityEvent): AnomalyPattern | null {
    const last15Minutes = Date.now() - (15 * 60 * 1000);
    const endpointHits = this.recentEvents.filter(
      e => e.userId === event.userId && 
           e.endpoint === event.endpoint && 
           e.timestamp >= last15Minutes
    );

    // 🧠 Endpoints críticos de IA têm limite mais restrito
    const isCriticalAIEndpoint = event.endpoint.includes('/ai/') || 
                                event.endpoint.includes('/analyze');

    const threshold = isCriticalAIEndpoint ? 20 : 50;

    if (endpointHits.length > threshold) {
      return {
        type: 'ENDPOINT_ABUSE',
        severity: isCriticalAIEndpoint ? 'HIGH' : 'MEDIUM',
        confidence: 0.8,
        description: `Abuso do endpoint ${event.endpoint}: ${endpointHits.length} hits em 15min`,
        recommendedAction: isCriticalAIEndpoint ? 'BLOCK_AI_ACCESS' : 'THROTTLE_ENDPOINT'
      };
    }

    return null;
  }

  /**
   * 📈 Atualiza perfil comportamental do usuário
   */
  private async updateUserProfile(event: SecurityEvent): Promise<void> {
    const profile = this.userProfiles.get(event.userId) || {
      userId: event.userId,
      typicalHours: [],
      averageRequestsPerHour: 0,
      commonEndpoints: [],
      averageResponseTime: 0,
      typicalIPs: [],
      lastSeen: 0
    };

    // Atualizar horários típicos
    const hour = new Date(event.timestamp).getHours();
    if (!profile.typicalHours.includes(hour)) {
      profile.typicalHours.push(hour);
      profile.typicalHours.sort();
    }

    // Atualizar endpoints comuns
    if (!profile.commonEndpoints.includes(event.endpoint)) {
      profile.commonEndpoints.push(event.endpoint);
      if (profile.commonEndpoints.length > 20) {
        profile.commonEndpoints = profile.commonEndpoints.slice(-20);
      }
    }

    // Atualizar IPs típicos
    if (!profile.typicalIPs.includes(event.ip)) {
      profile.typicalIPs.push(event.ip);
      if (profile.typicalIPs.length > 10) {
        profile.typicalIPs = profile.typicalIPs.slice(-10);
      }
    }

    // Calcular médias (usando média móvel simples)
    const alpha = 0.1; // Fator de suavização
    profile.averageResponseTime = profile.averageResponseTime * (1 - alpha) + event.responseTime * alpha;
    
    profile.lastSeen = event.timestamp;

    this.userProfiles.set(event.userId, profile);
  }

  /**
   * 📝 Adiciona evento ao histórico para análise
   */
  private addEventToHistory(event: SecurityEvent): void {
    this.recentEvents.push(event);
    
    // Manter apenas os últimos N eventos para performance
    if (this.recentEvents.length > this.maxEventsHistory) {
      this.recentEvents = this.recentEvents.slice(-this.maxEventsHistory);
    }
  }

  /**
   * 💾 Carrega perfis de usuários do banco de dados
   */
  private async loadUserProfiles(): Promise<void> {
    try {
      // Implementação futura: carregar perfis existentes do banco
      console.log('🧠 AI Anomaly Detector inicializado');
    } catch (error) {
      console.error('Erro ao carregar perfis de usuários:', error);
    }
  }

  /**
   * 📊 Obtém estatísticas do detector de anomalias
   */
  getDetectorStats() {
    return {
      userProfilesCount: this.userProfiles.size,
      suspiciousIPsCount: this.suspiciousIPs.size,
      recentEventsCount: this.recentEvents.length,
      detectorStatus: 'ACTIVE'
    };
  }

  /**
   * 🧹 Limpeza periódica de dados antigos
   */
  cleanup(): void {
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    this.recentEvents = this.recentEvents.filter(e => e.timestamp >= oneDayAgo);
    
    // Remover IPs suspeitos antigos (após 7 dias)
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    // Implementação futura: remover baseado em timestamp
  }
}

// 🌟 Instância singleton do detector
export const aiAnomalyDetector = new AIAnomalyDetector();

// 🔄 Limpeza automática a cada hora
setInterval(() => {
  aiAnomalyDetector.cleanup();
}, 60 * 60 * 1000);
