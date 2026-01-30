'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface AIAnalyticsData {
  overview: {
    aiSystem: {
      status: string;
      userProfilesLearned: number;
      anomaliesDetected: number;
      threatLevel: string;
    };
    redisIntegration: {
      connected: boolean;
      distributedRateLimit: string;
      activeUsers: number;
      blockedUsers: number;
    };
    securityMetrics: {
      totalSecurityEvents: number;
      criticalAlertsLast24h: number;
      averageResponseTime: string;
      systemUptime: string;
    };
  };
  anomalies: {
    detectionEngine: {
      status: string;
      totalPatternsLearned: number;
      confidenceLevel: string;
      falsePositiveRate: string;
    };
    anomalyTypes: {
      rateSpikeDetections: number;
      unusualHoursActivity: number;
      suspiciousIPActivity: number;
      failedAuthBursts: number;
      endpointAbuse: number;
    };
    mlMetrics: {
      modelAccuracy: string;
      learningRate: string;
      lastModelUpdate: number;
      nextModelUpdate: number;
    };
  };
  threats: {
    activeThreats: Array<{
      id: string;
      type: string;
      severity: string;
      source: string;
      description: string;
      timestamp: number;
      status: string;
      action: string;
    }>;
    threatSummary: {
      critical: number;
      high: number;
      medium: number;
      low: number;
      totalBlocked: number;
    };
  };
  behavior: {
    behaviorProfiles: {
      totalProfiles: number;
      profilesUpdatedToday: number;
      averageAccuracyScore: string;
    };
    userSegments: {
      normalUsers: number;
      flaggedUsers: number;
      suspiciousUsers: number;
    };
  };
  performance: {
    systemPerformance: {
      averageResponseTime: string;
      errorRate: string;
      throughput: string;
    };
    redisPerformance: {
      connected: boolean;
      averageLatency: string;
      hitRate: string;
      fallbackUsage: number;
    };
    aiPerformance: {
      averageAnalysisTime: string;
      modelPredictionAccuracy: string;
    };
  };
}

export default function AIAnalyticsDashboard() {
  const [data, setData] = useState<AIAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rateLimitUntilRef = useRef<number>(0);

  const fetchAIAnalytics = async () => {
    try {
      const now = Date.now();
      if (rateLimitUntilRef.current && now < rateLimitUntilRef.current) {
        return;
      }

      setRefreshing(true);
      const response = await fetch('/api/admin/ai-analytics');
      if (!response.ok) {
        if (response.status === 429) {
          rateLimitUntilRef.current = Date.now() + 60_000;
          throw new Error('Muitas requisições. Aguarde 60s e tente novamente.');
        }
        throw new Error('Falha ao carregar AI Analytics');
      }
      const analyticsData = await response.json();
      setData(analyticsData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAIAnalytics();
    const interval = setInterval(fetchAIAnalytics, 15000); // Atualizar a cada 15 segundos
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-10 bg-gray-200 rounded w-80"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-40 bg-gray-200 rounded"></div>
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
            Erro ao Carregar AI Analytics
          </h2>
          <p className="text-red-600">{error}</p>
          <Button onClick={fetchAIAnalytics} className="mt-4">
            Tentar Novamente
          </Button>
        </Card>
      </div>
    );
  }

  const getThreatLevelColor = (level: string) => {
    switch (level) {
      case 'HIGH': return 'bg-red-100 text-red-800';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
      case 'LOW': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-500 text-white';
      case 'HIGH': return 'bg-red-400 text-white';
      case 'MEDIUM': return 'bg-yellow-500 text-white';
      case 'LOW': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('pt-BR');
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            🧠 AI Analytics & Anomaly Detection
          </h1>
          <p className="text-gray-600">
            Dashboard de Inteligência Artificial - Sistema HealthCare Avançado
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={fetchAIAnalytics} 
            disabled={refreshing}
            variant="outline"
          >
            {refreshing ? '🔄' : '↻'} Atualizar
          </Button>
          <Badge className={getThreatLevelColor(data?.overview.aiSystem.threatLevel || 'LOW')}>
            🚨 Ameaça: {data?.overview.aiSystem.threatLevel}
          </Badge>
        </div>
      </div>

      {/* AI System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Sistema de IA</p>
              <p className="text-2xl font-bold text-blue-600">
                {data?.overview.aiSystem.status}
              </p>
            </div>
            <div className="text-3xl">🧠</div>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {data?.overview.aiSystem.userProfilesLearned} perfis aprendidos
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Redis Distribuído</p>
              <p className="text-2xl font-bold text-green-600">
                {data?.overview.redisIntegration.distributedRateLimit}
              </p>
            </div>
            <div className="text-3xl">🔴</div>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {data?.overview.redisIntegration.activeUsers} usuários ativos
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Anomalias Detectadas</p>
              <p className="text-2xl font-bold text-orange-600">
                {data?.overview.aiSystem.anomaliesDetected}
              </p>
            </div>
            <div className="text-3xl">🚨</div>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {data?.overview.securityMetrics.criticalAlertsLast24h} críticas 24h
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Performance IA</p>
              <p className="text-2xl font-bold text-purple-600">
                {data?.performance.aiPerformance.averageAnalysisTime}
              </p>
            </div>
            <div className="text-3xl">⚡</div>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Precisão: {data?.performance.aiPerformance.modelPredictionAccuracy}
          </p>
        </Card>
      </div>

      {/* Active Threats */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">🚨 Ameaças Ativas em Tempo Real</h2>
        <div className="space-y-4">
          {data?.threats.activeThreats.length ? (
            data.threats.activeThreats.map((threat) => (
              <div key={threat.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-4">
                  <Badge className={getSeverityColor(threat.severity)}>
                    {threat.severity}
                  </Badge>
                  <div>
                    <p className="font-medium text-gray-900">{threat.description}</p>
                    <p className="text-sm text-gray-600">
                      Fonte: {threat.source} • Tipo: {threat.type}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant={threat.status === 'ACTIVE' ? 'destructive' : 'default'}>
                    {threat.status}
                  </Badge>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatTimestamp(threat.timestamp)}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-gray-500 py-4">
              🛡️ Nenhuma ameaça ativa no momento
            </p>
          )}
        </div>
      </Card>

      {/* ML Detection Engine */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">🤖 Motor de Detecção ML</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Precisão do Modelo:</span>
              <Badge className="bg-green-100 text-green-800">
                {data?.anomalies.mlMetrics.modelAccuracy}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Taxa de Falsos Positivos:</span>
              <Badge className="bg-blue-100 text-blue-800">
                {data?.anomalies.detectionEngine.falsePositiveRate}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Padrões Aprendidos:</span>
              <span className="font-semibold">
                {data?.anomalies.detectionEngine.totalPatternsLearned.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Próxima Atualização:</span>
              <span className="text-sm text-gray-500">
                {data?.anomalies.mlMetrics.nextModelUpdate ? 
                  formatTimestamp(data.anomalies.mlMetrics.nextModelUpdate) : 'N/A'}
              </span>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">📊 Tipos de Anomalias</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">🚀 Picos de Taxa:</span>
              <Badge className="bg-red-100 text-red-800">
                {data?.anomalies.anomalyTypes.rateSpikeDetections}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">🌙 Horários Incomuns:</span>
              <Badge className="bg-yellow-100 text-yellow-800">
                {data?.anomalies.anomalyTypes.unusualHoursActivity}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">🌐 IPs Suspeitos:</span>
              <Badge className="bg-orange-100 text-orange-800">
                {data?.anomalies.anomalyTypes.suspiciousIPActivity}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">🔐 Falhas de Auth:</span>
              <Badge className="bg-purple-100 text-purple-800">
                {data?.anomalies.anomalyTypes.failedAuthBursts}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">🎯 Abuso de Endpoint:</span>
              <Badge className="bg-indigo-100 text-indigo-800">
                {data?.anomalies.anomalyTypes.endpointAbuse}
              </Badge>
            </div>
          </div>
        </Card>
      </div>

      {/* User Behavior Analysis */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">👤 Análise de Comportamento de Usuários</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">
              {data?.behavior.userSegments.normalUsers}
            </div>
            <p className="text-sm text-gray-600">Usuários Normais</p>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-yellow-600">
              {data?.behavior.userSegments.flaggedUsers}
            </div>
            <p className="text-sm text-gray-600">Usuários Sinalizados</p>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-red-600">
              {data?.behavior.userSegments.suspiciousUsers}
            </div>
            <p className="text-sm text-gray-600">Usuários Suspeitos</p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t">
          <div className="flex justify-between text-sm">
            <span>Perfis Totais: <strong>{data?.behavior.behaviorProfiles.totalProfiles}</strong></span>
            <span>Atualizados Hoje: <strong>{data?.behavior.behaviorProfiles.profilesUpdatedToday}</strong></span>
            <span>Precisão Média: <strong>{data?.behavior.behaviorProfiles.averageAccuracyScore}</strong></span>
          </div>
        </div>
      </Card>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-3">⚡ Performance do Sistema</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Tempo de Resposta:</span>
              <span className="font-semibold text-green-600">
                {data?.performance.systemPerformance.averageResponseTime}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Taxa de Erro:</span>
              <span className="font-semibold text-blue-600">
                {data?.performance.systemPerformance.errorRate}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Throughput:</span>
              <span className="font-semibold text-purple-600">
                {data?.performance.systemPerformance.throughput}
              </span>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-3">🔴 Redis Performance</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Status:</span>
              <Badge className={data?.performance.redisPerformance.connected ? 
                'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                {data?.performance.redisPerformance.connected ? 'CONECTADO' : 'OFFLINE'}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span>Latência:</span>
              <span className="font-semibold text-green-600">
                {data?.performance.redisPerformance.averageLatency}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Hit Rate:</span>
              <span className="font-semibold text-blue-600">
                {data?.performance.redisPerformance.hitRate}
              </span>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-3">🧠 IA Performance</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Tempo de Análise:</span>
              <span className="font-semibold text-green-600">
                {data?.performance.aiPerformance.averageAnalysisTime}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Precisão:</span>
              <span className="font-semibold text-blue-600">
                {data?.performance.aiPerformance.modelPredictionAccuracy}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Fallback Entries:</span>
              <span className="font-semibold text-yellow-600">
                {data?.performance.redisPerformance.fallbackUsage}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* System Status */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">🔧 Status Geral do Sistema</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl mb-2">🧠</div>
            <p className="text-sm font-medium text-green-800">AI Engine</p>
            <p className="text-xs text-green-600">Operacional</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl mb-2">🔴</div>
            <p className="text-sm font-medium text-green-800">Redis</p>
            <p className="text-xs text-green-600">
              {data?.performance.redisPerformance.connected ? 'Conectado' : 'Fallback'}
            </p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl mb-2">⚡</div>
            <p className="text-sm font-medium text-green-800">Rate Limiting</p>
            <p className="text-xs text-green-600">Ativo</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl mb-2">🚨</div>
            <p className="text-sm font-medium text-green-800">Detecção</p>
            <p className="text-xs text-green-600">ML Ativo</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl mb-2">🛡️</div>
            <p className="text-sm font-medium text-green-800">Segurança</p>
            <p className="text-xs text-green-600">Enterprise</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
