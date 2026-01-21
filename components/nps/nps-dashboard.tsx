'use client';

/**
 * Dashboard de NPS
 * 
 * Features:
 * - Score NPS calculado
 * - Distribuição de categorias (Detratores/Passivos/Promotores)
 * - Gráficos de tendência
 * - Tags mais mencionadas
 * - Alertas de detratores
 * - Filtro por período e médico
 */

import { useCallback, useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Users, Star, AlertTriangle, Tag } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { logger } from '@/lib/logger'

interface NpsStats {
  npsScore: number;
  totalResponses: number;
  responseRate: number;
  avgScore: number;
  distribution: {
    promoters: number;
    passives: number;
    detractors: number;
  };
  trend: {
    current: number;
    previous: number;
    change: number;
  };
  topTags: Array<{ tag: string; count: number }>;
  recentDetractors: Array<{
    id: string;
    patientName: string;
    score: number;
    feedback: string;
    createdAt: string;
  }>;
}

interface NpsDashboardProps {
  doctorId?: string;
}

export function NpsDashboard({ doctorId }: NpsDashboardProps) {
  const [stats, setStats] = useState<NpsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30');
  
  const fetchStats = useCallback(async () => {
    try {
      const params = new URLSearchParams({ period });
      if (doctorId) params.append('doctorId', doctorId);
      
      const response = await fetch(`/api/nps/stats?${params}`);
      
      if (!response.ok) {
        throw new Error('Erro ao carregar estatísticas');
      }
      
      const data = await response.json();
      setStats(data);
      
    } catch (error) {
      logger.error('Erro ao carregar NPS:', error);
      toast.error('Erro ao carregar estatísticas');
    } finally {
      setLoading(false);
    }
  }, [doctorId, period]);
  
  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);
  
  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-slate-600">Carregando estatísticas...</p>
      </div>
    );
  }
  
  if (!stats) {
    return (
      <Card className="p-8 text-center">
        <p className="text-slate-600">Nenhum dado disponível</p>
      </Card>
    );
  }
  
  const getNpsColor = (score: number) => {
    if (score >= 75) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    if (score >= 0) return 'text-orange-600';
    return 'text-red-600';
  };
  
  const getNpsLabel = (score: number) => {
    if (score >= 75) return 'Excelente';
    if (score >= 50) return 'Bom';
    if (score >= 0) return 'Razoável';
    return 'Crítico';
  };
  
  return (
    <div className="space-y-6">
      {/* Header com filtro */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Net Promoter Score (NPS)</h2>
        
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Últimos 7 dias</SelectItem>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
            <SelectItem value="90">Últimos 90 dias</SelectItem>
            <SelectItem value="365">Último ano</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {/* Cards de métricas principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* NPS Score */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-600">NPS Score</span>
            {stats.trend.change !== 0 && (
              <div className={`flex items-center gap-1 text-sm ${stats.trend.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {stats.trend.change > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {Math.abs(stats.trend.change)}
              </div>
            )}
          </div>
          
          <div className={`text-4xl font-bold ${getNpsColor(stats.npsScore)}`}>
            {stats.npsScore}
          </div>
          
          <div className="text-sm text-slate-500 mt-1">
            {getNpsLabel(stats.npsScore)}
          </div>
        </Card>
        
        {/* Taxa de Resposta */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-600">Taxa de Resposta</span>
          </div>
          
          <div className="text-4xl font-bold">
            {stats.responseRate.toFixed(1)}%
          </div>
          
          <div className="text-sm text-slate-500 mt-1">
            {stats.totalResponses} respostas
          </div>
        </Card>
        
        {/* Média de Satisfação */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-2">
            <Star className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-600">Média de Satisfação</span>
          </div>
          
          <div className="text-4xl font-bold">
            {stats.avgScore.toFixed(1)}
          </div>
          
          <div className="text-sm text-slate-500 mt-1">
            De 0 a 10
          </div>
        </Card>
        
        {/* Detratores */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className="text-sm font-medium text-slate-600">Detratores</span>
          </div>
          
          <div className="text-4xl font-bold text-red-600">
            {stats.distribution.detractors}
          </div>
          
          <div className="text-sm text-slate-500 mt-1">
            {((stats.distribution.detractors / stats.totalResponses) * 100).toFixed(1)}% do total
          </div>
        </Card>
      </div>
      
      {/* Distribuição de categorias */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Distribuição de Respostas</h3>
        
        <div className="space-y-4">
          {/* Promotores */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Promotores (9-10)</span>
              <span className="text-sm text-slate-600">{stats.distribution.promoters}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3">
              <div
                className="bg-green-500 h-3 rounded-full transition-all"
                style={{ width: `${(stats.distribution.promoters / stats.totalResponses) * 100}%` }}
              />
            </div>
          </div>
          
          {/* Passivos */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Passivos (7-8)</span>
              <span className="text-sm text-slate-600">{stats.distribution.passives}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3">
              <div
                className="bg-yellow-500 h-3 rounded-full transition-all"
                style={{ width: `${(stats.distribution.passives / stats.totalResponses) * 100}%` }}
              />
            </div>
          </div>
          
          {/* Detratores */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Detratores (0-6)</span>
              <span className="text-sm text-slate-600">{stats.distribution.detractors}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3">
              <div
                className="bg-red-500 h-3 rounded-full transition-all"
                style={{ width: `${(stats.distribution.detractors / stats.totalResponses) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </Card>
      
      {/* Tags mais mencionadas */}
      {stats.topTags.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Tag className="w-5 h-5" />
            <h3 className="font-semibold">Tópicos Mais Mencionados</h3>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {stats.topTags.map(({ tag, count }) => (
              <Badge key={tag} variant="secondary" className="text-sm">
                {tag.replace('_', ' ')} ({count})
              </Badge>
            ))}
          </div>
        </Card>
      )}
      
      {/* Detratores recentes */}
      {stats.recentDetractors.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <h3 className="font-semibold">Detratores Recentes</h3>
            <Badge variant="destructive">{stats.recentDetractors.length}</Badge>
          </div>
          
          <div className="space-y-4">
            {stats.recentDetractors.map((detractor) => (
              <div key={detractor.id} className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="font-medium">{detractor.patientName}</span>
                    <span className="text-sm text-slate-500 ml-2">
                      Score: {detractor.score}/10
                    </span>
                  </div>
                  <span className="text-sm text-slate-500">
                    {new Date(detractor.createdAt).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                
                {detractor.feedback && (
                  <p className="text-sm text-slate-700 italic">
                    "{detractor.feedback}"
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
