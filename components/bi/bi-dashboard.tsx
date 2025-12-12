'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Activity, Calendar, DollarSign, TrendingUp, Users, Clock, AlertCircle, Award } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface DashboardData {
  period: 'today' | 'week' | 'month';
  startDate: string;
  endDate: string;
  keyMetrics: {
    totalPatients: number;
    totalConsultations: number;
    totalDoctors: number;
    consultationsThisMonth: number;
    revenue: number;
    npsScore: number;
  };
  consultationsByDoctor: Array<{ doctorName: string; count: number }>;
  revenueByPaymentMethod: Array<{ method: string; amount: number }>;
  noShowRate: { total: number; noShows: number; rate: number };
  peakHours: Array<{ hour: number; count: number }>;
  certificateStats: Array<{ type: string; count: number }>;
  generatedAt: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d'];

export default function BiDashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('month');

  useEffect(() => {
    fetchDashboard();
  }, [period]);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/bi/dashboard?period=${period}`);
      if (!response.ok) throw new Error('Falha ao carregar dashboard');
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">Erro ao carregar dados do dashboard</p>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getNPSColor = (score: number) => {
    if (score >= 75) return 'bg-green-500';
    if (score >= 50) return 'bg-yellow-500';
    if (score >= 0) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getNPSLabel = (score: number) => {
    if (score >= 75) return 'Excelente';
    if (score >= 50) return 'Bom';
    if (score >= 0) return 'Razoável';
    return 'Crítico';
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Business Intelligence</h1>
          <p className="text-gray-500">
            Dashboard gerencial - Período: {data.period === 'today' ? 'Hoje' : data.period === 'week' ? 'Esta Semana' : 'Este Mês'}
          </p>
        </div>
        <Tabs value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
          <TabsList>
            <TabsTrigger value="today">Hoje</TabsTrigger>
            <TabsTrigger value="week">Semana</TabsTrigger>
            <TabsTrigger value="month">Mês</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* KPIs Principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Pacientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.keyMetrics.totalPatients}</div>
            <p className="text-xs text-muted-foreground">Cadastrados no sistema</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Consultas</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.keyMetrics.consultationsThisMonth}</div>
            <p className="text-xs text-muted-foreground">
              No período ({data.keyMetrics.totalConsultations} total)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.keyMetrics.revenue)}</div>
            <p className="text-xs text-muted-foreground">Pagamentos confirmados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">NPS Score</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold">{data.keyMetrics.npsScore}</div>
              <Badge className={getNPSColor(data.keyMetrics.npsScore)}>
                {getNPSLabel(data.keyMetrics.npsScore)}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">Satisfação dos pacientes</p>
          </CardContent>
        </Card>
      </div>

      {/* No-Show Alert */}
      {data.noShowRate.rate > 15 && (
        <Card className="border-orange-500 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-700">
              <AlertCircle className="h-5 w-5" />
              Taxa de No-Show Elevada
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-orange-600">
              {data.noShowRate.noShows} de {data.noShowRate.total} consultas não compareceram ({data.noShowRate.rate.toFixed(1)}%).
              Considere implementar confirmações automáticas via WhatsApp.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Consultas por Médico */}
        <Card>
          <CardHeader>
            <CardTitle>Consultas por Médico</CardTitle>
            <CardDescription>Top {data.consultationsByDoctor.length} médicos no período</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.consultationsByDoctor.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="doctorName" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#0088FE" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Receita por Método de Pagamento */}
        <Card>
          <CardHeader>
            <CardTitle>Receita por Método de Pagamento</CardTitle>
            <CardDescription>Distribuição dos pagamentos</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.revenueByPaymentMethod}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.method}: ${formatCurrency(entry.amount)}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="amount"
                >
                  {data.revenueByPaymentMethod.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Horários de Pico */}
        <Card>
          <CardHeader>
            <CardTitle>Horários de Pico</CardTitle>
            <CardDescription>Volume de consultas por hora</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.peakHours}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" label={{ value: 'Hora', position: 'insideBottom', offset: -5 }} />
                <YAxis label={{ value: 'Consultas', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#00C49F" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Certificados Emitidos */}
        <Card>
          <CardHeader>
            <CardTitle>Certificados Médicos</CardTitle>
            <CardDescription>Atestados emitidos por tipo</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.certificateStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="type" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#FFBB28" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Rodapé */}
      <Card>
        <CardContent className="pt-6">
          <p className="text-xs text-gray-500 text-center">
            Última atualização: {new Date(data.generatedAt).toLocaleString('pt-BR')}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
