'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts'
import { 
  Activity, TrendingUp, AlertCircle, FileText, Calendar, 
  Users, BarChart3, Loader2, ArrowLeft 
} from 'lucide-react'

interface StatsData {
  period: {
    days: number
    startDate: string
    endDate: string
  }
  summary: {
    total: number
    critical: number
    high: number
    averageVersion: number
    maxVersion: number
  }
  distribution: {
    byType: Array<{ type: string; count: number }>
    byPriority: Array<{ priority: string; count: number }>
    bySeverity: Array<{ severity: string; count: number }>
  }
  timeline: Array<{ date: string; count: number; critical: number; high: number }>
  topPatients?: Array<{ patientId: string; name: string; cpf: string; recordCount: number }>
  recentRecords: Array<{
    id: string
    title: string
    type: string
    priority: string
    createdAt: string
    patientName: string
  }>
}

const PRIORITY_COLORS = {
  CRITICAL: '#ef4444',
  HIGH: '#f97316',
  NORMAL: '#3b82f6',
  LOW: '#10b981'
}

const TYPE_COLORS = {
  CONSULTATION: '#8b5cf6',
  EXAM: '#06b6d4',
  PROCEDURE: '#f59e0b',
  PRESCRIPTION: '#10b981',
  OTHER: '#6b7280'
}

export default function MedicalRecordsDashboard() {
  const { data: session } = useSession()
  const [stats, setStats] = useState<StatsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState(30)

  useEffect(() => {
    async function fetchStats() {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/medical-records/stats?period=${period}`)
        
        if (!response.ok) {
          throw new Error('Erro ao carregar estatísticas')
        }

        const data = await response.json()
        setStats(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido')
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [period])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
            <span className="ml-3 text-lg text-gray-600">Carregando dashboard...</span>
          </div>
        </div>
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-red-900 mb-2">Erro ao carregar dashboard</h3>
            <p className="text-red-700">{error || 'Erro desconhecido'}</p>
            <Link href="/records" className="mt-4 inline-block text-red-600 hover:text-red-800 font-medium">
              ← Voltar para prontuários
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <Link href="/records" className="text-blue-600 hover:text-blue-800 font-medium mb-2 inline-flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Link>
              <h1 className="text-3xl font-bold text-gray-900 mt-2">Dashboard de Prontuários</h1>
              <p className="text-gray-600 mt-1">
                Análise dos últimos {stats.period.days} dias
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPeriod(7)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  period === 7 ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                7 dias
              </button>
              <button
                onClick={() => setPeriod(30)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  period === 30 ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                30 dias
              </button>
              <button
                onClick={() => setPeriod(90)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  period === 90 ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                90 dias
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <span className="text-2xl font-bold text-gray-900">{stats.summary.total}</span>
            </div>
            <h3 className="text-sm font-medium text-gray-600">Total de Prontuários</h3>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <span className="text-2xl font-bold text-red-600">{stats.summary.critical}</span>
            </div>
            <h3 className="text-sm font-medium text-gray-600">Prioridade Crítica</h3>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-orange-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-orange-600" />
              </div>
              <span className="text-2xl font-bold text-orange-600">{stats.summary.high}</span>
            </div>
            <h3 className="text-sm font-medium text-gray-600">Prioridade Alta</h3>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Activity className="h-6 w-6 text-purple-600" />
              </div>
              <span className="text-2xl font-bold text-gray-900">{stats.summary.averageVersion}</span>
            </div>
            <h3 className="text-sm font-medium text-gray-600">Média de Versões</h3>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Timeline Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              Atividade ao Longo do Tempo
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats.timeline}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(date) => new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(date) => new Date(date).toLocaleDateString('pt-BR')}
                />
                <Legend />
                <Line type="monotone" dataKey="count" stroke="#3b82f6" name="Total" strokeWidth={2} />
                <Line type="monotone" dataKey="critical" stroke="#ef4444" name="Crítico" strokeWidth={2} />
                <Line type="monotone" dataKey="high" stroke="#f97316" name="Alto" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Priority Distribution */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-orange-600" />
              Distribuição por Prioridade
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats.distribution.byPriority}
                  dataKey="count"
                  nameKey="priority"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={(entry) => `${entry.priority}: ${entry.count}`}
                >
                  {stats.distribution.byPriority.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PRIORITY_COLORS[entry.priority as keyof typeof PRIORITY_COLORS] || '#6b7280'} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Type Distribution */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Activity className="h-5 w-5 text-purple-600" />
              Distribuição por Tipo
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.distribution.byType}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="type" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" name="Quantidade">
                  {stats.distribution.byType.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={TYPE_COLORS[entry.type as keyof typeof TYPE_COLORS] || '#6b7280'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Top Patients (only for doctors/admins) */}
          {stats.topPatients && stats.topPatients.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Users className="h-5 w-5 text-green-600" />
                Pacientes com Mais Prontuários
              </h3>
              <div className="space-y-3">
                {stats.topPatients.map((patient, index) => (
                  <div key={patient.patientId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 bg-green-100 text-green-700 font-bold rounded-full">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{patient.name}</p>
                        <p className="text-xs text-gray-500">CPF: {patient.cpf}</p>
                      </div>
                    </div>
                    <span className="text-lg font-bold text-gray-900">{patient.recordCount}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Recent Records */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Prontuários Recentes
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Título</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Tipo</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Prioridade</th>
                  {session?.user?.role !== 'PATIENT' && (
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Paciente</th>
                  )}
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Data</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700"></th>
                </tr>
              </thead>
              <tbody>
                {stats.recentRecords.map((record) => (
                  <tr key={record.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm text-gray-900">{record.title}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
                        {record.type}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span 
                        className="px-2 py-1 text-xs font-medium rounded-full"
                        style={{ 
                          backgroundColor: PRIORITY_COLORS[record.priority as keyof typeof PRIORITY_COLORS] + '20',
                          color: PRIORITY_COLORS[record.priority as keyof typeof PRIORITY_COLORS]
                        }}
                      >
                        {record.priority}
                      </span>
                    </td>
                    {session?.user?.role !== 'PATIENT' && (
                      <td className="py-3 px-4 text-sm text-gray-600">{record.patientName}</td>
                    )}
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {new Date(record.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-3 px-4">
                      <Link 
                        href={`/records/${record.id}`}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Ver →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
