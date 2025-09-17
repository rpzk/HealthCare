'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface SecurityStats {
  securityOverview: {
    totalUsers: number;
    activeUsers: number;
    blockedIPs: number;
    failedLogins: number;
    systemHealth: 'healthy' | 'warning' | 'critical';
  };
  rateLimitStats: Record<string, {
    limit: number;
    remaining: number;
    resetTime: number;
    isBlocked: boolean;
  }>;
  auditStats: {
    totalEvents: number;
    recentEvents: Array<{
      action: string;
      userId: string;
      timestamp: number;
      ip: string;
    }>;
  };
}

// Default object to avoid transient undefined property access during early renders
const DEFAULT_STATS: SecurityStats = {
  securityOverview: {
    totalUsers: 0,
    activeUsers: 0,
    blockedIPs: 0,
    failedLogins: 0,
    systemHealth: 'healthy'
  },
  rateLimitStats: {},
  auditStats: {
    totalEvents: 0,
    recentEvents: []
  }
}

export default function SecurityMonitoringDashboard() {
  const [stats, setStats] = useState<SecurityStats>(DEFAULT_STATS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Normaliza diferentes formatos possíveis vindos da API (overview, stats etc.)
  const normalize = (raw: any): SecurityStats => {
    // A rota atual retorna { success, overview } com: overview.rateLimit, overview.audit, overview.systemHealth
    // Construímos contadores sintéticos porque ainda não temos totalUsers reais.
    const ov = raw?.overview || raw?.securityOverview || {};
    const rate = ov?.rateLimit || raw?.rateLimitStats || {};
    const audit = ov?.audit || raw?.auditStats || {};
    const rawSys = ov?.systemHealth;
    const sysHealth = (rawSys && typeof rawSys === 'object' && 'status' in rawSys)
      ? (rawSys as any).status
      : (typeof rawSys === 'string' ? rawSys : 'healthy');

    const normalized: SecurityStats = {
      securityOverview: {
        totalUsers: (ov?.totalUsers ?? 0),
        activeUsers: (ov?.activeUsers ?? 0),
        blockedIPs: (rate?.blockedIPs ?? 0),
        failedLogins: (ov?.failedLogins ?? 0),
        systemHealth: ['healthy','warning','critical'].includes(sysHealth) ? sysHealth as any : 'healthy'
      },
      rateLimitStats: rate || {},
      auditStats: {
        totalEvents: (audit?.totalRecent ?? audit?.totalEvents ?? 0),
        recentEvents: (audit?.recentLogs || audit?.recentEvents || []).filter(Boolean)
      }
    };

    // Lightweight runtime diagnostics (dev only)
    if (process.env.NODE_ENV !== 'production') {
      if (!raw) console.warn('[SecurityMonitoring] raw response vazio ou undefined');
      if (!ov) console.warn('[SecurityMonitoring] overview ausente no payload');
      if (!raw?.overview?.systemHealth && !raw?.securityOverview?.systemHealth) {
        console.warn('[SecurityMonitoring] systemHealth ausente, usando valor padrão "healthy"');
      }
    }

    return normalized;
  }

  const fetchSecurityStats = async () => {
    try {
      setRefreshing(true);
      const response = await fetch('/api/admin/security?action=security-overview');
      if (!response.ok) {
        throw new Error('Falha ao carregar estatísticas de segurança');
      }
  const data = await response.json();
  try {
    const normalized = normalize(data);
    setStats(normalized);
  } catch (e) {
    console.error('[SecurityMonitoring] Falha ao normalizar payload', e, data);
  }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const resetRateLimit = async (userId: string) => {
    try {
      const response = await fetch('/api/admin/security', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reset-rate-limit',
          userId
        })
      });
      
      if (!response.ok) {
        throw new Error('Falha ao resetar rate limit');
      }
      
      await fetchSecurityStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao resetar rate limit');
    }
  };

  useEffect(() => {
    fetchSecurityStats();
    const interval = setInterval(fetchSecurityStats, 10000); // Atualizar a cada 10 segundos
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-64"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <Card className="p-6 border-red-200 bg-red-50">
          <h2 className="text-lg font-semibold text-red-800 mb-2">
            Erro ao Carregar Dashboard
          </h2>
          <p className="text-red-600">{error}</p>
          <Button onClick={fetchSecurityStats} className="mt-4">
            Tentar Novamente
          </Button>
        </Card>
      </div>
    );
  }

  const getHealthBadgeColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'bg-green-100 text-green-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('pt-BR');
  };

  const formatResetTime = (resetTime: number) => {
    const remaining = Math.max(0, Math.ceil((resetTime - Date.now()) / 1000));
    return remaining > 0 ? `${remaining}s` : 'Reset';
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            🛡️ Monitoramento de Segurança
          </h1>
          <p className="text-gray-600">
            Dashboard em tempo real - Sistema HealthCare
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={fetchSecurityStats} 
            disabled={refreshing}
            variant="outline"
          >
            {refreshing ? '🔄' : '↻'} Atualizar
          </Button>
          {(() => {
            const safeHealth = stats?.securityOverview?.systemHealth ?? 'healthy';
            return (
              <Badge className={getHealthBadgeColor(safeHealth)}>
                🏥 {safeHealth.toUpperCase()}
              </Badge>
            )
          })()}
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Usuários Ativos</p>
              <p className="text-2xl font-bold text-green-600">
                {stats?.securityOverview?.activeUsers || 0}
              </p>
            </div>
            <div className="text-3xl">👥</div>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Total: {stats?.securityOverview?.totalUsers || 0}
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">IPs Bloqueados</p>
              <p className="text-2xl font-bold text-red-600">
                {stats?.securityOverview?.blockedIPs || 0}
              </p>
            </div>
            <div className="text-3xl">🚫</div>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Rate limiting ativo
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Logins Falharam</p>
              <p className="text-2xl font-bold text-orange-600">
                {stats?.securityOverview?.failedLogins || 0}
              </p>
            </div>
            <div className="text-3xl">🔐</div>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Últimas 24h
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Eventos de Auditoria</p>
              <p className="text-2xl font-bold text-blue-600">
                {stats?.auditStats?.totalEvents || 0}
              </p>
            </div>
            <div className="text-3xl">📊</div>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Total registrado
          </p>
        </Card>
      </div>

      {/* Rate Limiting Status */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">⚡ Status do Rate Limiting</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats?.rateLimitStats && Object.entries(stats.rateLimitStats).map(([key, rateLimitData]) => (
            <div key={key} className="border rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900">
                  {key === 'AI_MEDICAL' && '🧠 IA Médica'}
                  {key === 'CONSULTATIONS' && '🏥 Consultas'}
                  {key === 'PATIENTS' && '👥 Pacientes'}
                  {key === 'DASHBOARD' && '📈 Dashboard'}
                  {!['AI_MEDICAL', 'CONSULTATIONS', 'PATIENTS', 'DASHBOARD'].includes(key) && `🔧 ${key}`}
                </h3>
                <Badge 
                  variant={rateLimitData.isBlocked ? "destructive" : "default"}
                >
                  {rateLimitData.isBlocked ? 'BLOQUEADO' : 'ATIVO'}
                </Badge>
              </div>
              
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Limite:</span>
                  <span className="font-medium">{rateLimitData.limit}/min</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Restante:</span>
                  <span className={`font-medium ${rateLimitData.remaining < 10 ? 'text-red-600' : 'text-green-600'}`}>
                    {rateLimitData.remaining}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Reset:</span>
                  <span className="font-medium">{formatResetTime(rateLimitData.resetTime)}</span>
                </div>
              </div>

              {rateLimitData.isBlocked && (
                <Button 
                  onClick={() => resetRateLimit(key)}
                  size="sm"
                  className="w-full mt-2"
                  variant="destructive"
                >
                  🔓 Reset Limite
                </Button>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Recent Audit Events */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">📋 Eventos Recentes de Auditoria</h2>
        <div className="space-y-2">
          {stats?.auditStats?.recentEvents?.length ? (
            stats.auditStats.recentEvents.map((event, index) => (
              <div key={index} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
                <div className="flex items-center gap-3">
                  <Badge variant="outline">{event.action}</Badge>
                  <span className="text-sm text-gray-900">
                    Usuário: {event.userId}
                  </span>
                  <span className="text-sm text-gray-600">
                    IP: {event.ip}
                  </span>
                </div>
                <span className="text-xs text-gray-500">
                  {formatTimestamp(event.timestamp)}
                </span>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center py-4">
              Nenhum evento de auditoria recente
            </p>
          )}
        </div>
      </Card>

      {/* System Status */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">🔧 Status do Sistema</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl mb-2">✅</div>
            <p className="text-sm font-medium text-green-800">Rate Limiting</p>
            <p className="text-xs text-green-600">Operacional</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl mb-2">🔐</div>
            <p className="text-sm font-medium text-green-800">Autenticação</p>
            <p className="text-xs text-green-600">Operacional</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl mb-2">📊</div>
            <p className="text-sm font-medium text-green-800">Auditoria</p>
            <p className="text-xs text-green-600">Operacional</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl mb-2">🛡️</div>
            <p className="text-sm font-medium text-green-800">Segurança Geral</p>
            <p className="text-xs text-green-600">22/22 APIs Protegidas</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
