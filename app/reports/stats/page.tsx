'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { BarChart3, ArrowLeft, TrendingUp, TrendingDown, Users, Calendar, Activity, Target } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface AgeGroupDetailed { range: string; count: number; percentage: number }
interface SpecialtyBreakdown { specialty: string; count: number; percentage: number }
interface ExamTypeStat { type: string; count: number }
interface TimeSeriesPoint { month: string; count: number }
interface StatsData {
  patientStats: {
    total: number
    newThisPeriod: number
    growthRate: number
    averageAge: number
    genderDistribution: { male: number; female: number; other: number }
    topAgeGroups: AgeGroupDetailed[]
  }
  consultationStats: {
    total: number
    completed: number
    cancelled: number
    noShow: number
    averagePerDay: number
    completionRate: number
    specialtyBreakdown: SpecialtyBreakdown[]
  }
  examStats: {
    total: number
    completed: number
    pending: number
    urgent: number
    averageCompletionTime: number
    topExamTypes: ExamTypeStat[]
  }
  performanceMetrics: {
    patientSatisfaction: number
    averageWaitTime: number
    systemUptime: number
    dataAccuracy: number
    responseTime: number
  }
  trends: {
    patientsOverTime: TimeSeriesPoint[]
    consultationsOverTime: TimeSeriesPoint[]
    examsOverTime: TimeSeriesPoint[]
  }
}

export default function StatsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'7days' | '30days' | '90days' | '1year'>('30days')
  const [statsData, setStatsData] = useState<StatsData>({
    patientStats: {
      total: 0,
      newThisPeriod: 0,
      growthRate: 0,
      averageAge: 0,
      genderDistribution: { male: 0, female: 0, other: 0 },
      topAgeGroups: []
    },
    consultationStats: {
      total: 0,
      completed: 0,
      cancelled: 0,
      noShow: 0,
      averagePerDay: 0,
      completionRate: 0,
      specialtyBreakdown: []
    },
    examStats: {
      total: 0,
      completed: 0,
      pending: 0,
      urgent: 0,
      averageCompletionTime: 0,
      topExamTypes: []
    },
    performanceMetrics: {
      patientSatisfaction: 0,
      averageWaitTime: 0,
      systemUptime: 0,
      dataAccuracy: 0,
      responseTime: 0
    },
    trends: {
      patientsOverTime: [],
      consultationsOverTime: [],
      examsOverTime: []
    }
  })

  useEffect(() => {
    fetchStatistics()
  }, [timeRange])

  const fetchStatistics = async () => {
    setLoading(true)
    // Simular carregamento de dados com base no período selecionado
    setTimeout(() => {
      const multiplier = timeRange === '7days' ? 0.25 : timeRange === '30days' ? 1 : timeRange === '90days' ? 3 : 12

      setStatsData({
        patientStats: {
          total: 156,
          newThisPeriod: Math.round(12 * multiplier),
          growthRate: 8.5,
          averageAge: 42.3,
          genderDistribution: { male: 67, female: 89, other: 0 },
          topAgeGroups: [
            { range: '31-50', count: Math.round(38 * multiplier), percentage: 24.4 },
            { range: '19-35', count: Math.round(45 * multiplier), percentage: 28.8 },
            { range: '51-65', count: Math.round(32 * multiplier), percentage: 20.5 },
            { range: '0-18', count: Math.round(23 * multiplier), percentage: 14.7 },
            { range: '65+', count: Math.round(18 * multiplier), percentage: 11.5 }
          ]
        },
        consultationStats: {
          total: Math.round(423 * multiplier),
          completed: Math.round(389 * multiplier),
          cancelled: Math.round(28 * multiplier),
          noShow: Math.round(6 * multiplier),
          averagePerDay: 3.2,
          completionRate: 92.0,
          specialtyBreakdown: [
            { specialty: 'Clínica Geral', count: Math.round(89 * multiplier), percentage: 21.0 },
            { specialty: 'Cardiologia', count: Math.round(67 * multiplier), percentage: 15.8 },
            { specialty: 'Dermatologia', count: Math.round(54 * multiplier), percentage: 12.8 },
            { specialty: 'Ortopedia', count: Math.round(43 * multiplier), percentage: 10.2 },
            { specialty: 'Pediatria', count: Math.round(38 * multiplier), percentage: 9.0 }
          ]
        },
        examStats: {
          total: Math.round(178 * multiplier),
          completed: Math.round(156 * multiplier),
          pending: Math.round(18 * multiplier),
          urgent: Math.round(4 * multiplier),
          averageCompletionTime: 2.5,
          topExamTypes: [
            { type: 'Exame de Sangue', count: Math.round(45 * multiplier) },
            { type: 'Radiografia', count: Math.round(32 * multiplier) },
            { type: 'Ultrassom', count: Math.round(28 * multiplier) },
            { type: 'Eletrocardiograma', count: Math.round(23 * multiplier) },
            { type: 'Tomografia', count: Math.round(18 * multiplier) }
          ]
        },
        performanceMetrics: {
          patientSatisfaction: 4.7,
          averageWaitTime: 18.5,
          systemUptime: 99.8,
          dataAccuracy: 99.2,
          responseTime: 1.2
        },
        trends: {
          patientsOverTime: Array.from({ length: 12 }, (_, i) => ({
            month: new Date(2025, i, 1).toLocaleDateString('pt-BR', { month: 'short' }),
            count: Math.round(10 + Math.random() * 20)
          })),
          consultationsOverTime: Array.from({ length: 12 }, (_, i) => ({
            month: new Date(2025, i, 1).toLocaleDateString('pt-BR', { month: 'short' }),
            count: Math.round(25 + Math.random() * 40)
          })),
          examsOverTime: Array.from({ length: 12 }, (_, i) => ({
            month: new Date(2025, i, 1).toLocaleDateString('pt-BR', { month: 'short' }),
            count: Math.round(10 + Math.random() * 25)
          }))
        }
      })
      setLoading(false)
    }, 1000)
  }

  const timeRangeOptions = [
    { value: '7days', label: 'Últimos 7 dias' },
    { value: '30days', label: 'Últimos 30 dias' },
    { value: '90days', label: 'Últimos 3 meses' },
    { value: '1year', label: 'Último ano' }
  ]

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button 
            variant="outline" 
            onClick={() => router.back()}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Voltar</span>
          </Button>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <BarChart3 className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Estatísticas Avançadas</h1>
              <p className="text-sm text-gray-500">Análise detalhada dos dados do sistema</p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as '7days' | '30days' | '90days' | '1year')}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {timeRangeOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Estatísticas de Pacientes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-blue-600" />
            <span>Estatísticas de Pacientes</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-blue-700">Total de Pacientes</p>
                <Users className="h-4 w-4 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-blue-900">{statsData.patientStats.total}</p>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-green-700">Novos Pacientes</p>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-green-900">{statsData.patientStats.newThisPeriod}</p>
              <p className="text-xs text-green-600">+{statsData.patientStats.growthRate}% crescimento</p>
            </div>

            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-purple-700">Idade Média</p>
                <Calendar className="h-4 w-4 text-purple-600" />
              </div>
              <p className="text-2xl font-bold text-purple-900">{statsData.patientStats.averageAge} anos</p>
            </div>

            <div className="bg-orange-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-orange-700">Distribuição</p>
                <Activity className="h-4 w-4 text-orange-600" />
              </div>
              <div className="space-y-1">
                <p className="text-sm text-orange-800">♀ {statsData.patientStats.genderDistribution.female}</p>
                <p className="text-sm text-orange-800">♂ {statsData.patientStats.genderDistribution.male}</p>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Distribuição por Faixa Etária</h4>
            <div className="space-y-2">
              {statsData.patientStats.topAgeGroups.map((group, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-medium text-gray-700 w-16">{group.range}</span>
                    <div className="w-48 h-2 bg-gray-200 rounded-full">
                      <div 
                        className="h-2 bg-blue-600 rounded-full"
                        style={{ width: `${group.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">{group.count} pacientes</span>
                    <Badge variant="outline">{group.percentage}%</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas de Consultas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5 text-purple-600" />
            <span>Estatísticas de Consultas</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <div className="bg-purple-50 rounded-lg p-4">
              <p className="text-sm font-medium text-purple-700 mb-1">Total</p>
              <p className="text-xl font-bold text-purple-900">{statsData.consultationStats.total}</p>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-sm font-medium text-green-700 mb-1">Concluídas</p>
              <p className="text-xl font-bold text-green-900">{statsData.consultationStats.completed}</p>
            </div>

            <div className="bg-red-50 rounded-lg p-4">
              <p className="text-sm font-medium text-red-700 mb-1">Canceladas</p>
              <p className="text-xl font-bold text-red-900">{statsData.consultationStats.cancelled}</p>
            </div>

            <div className="bg-orange-50 rounded-lg p-4">
              <p className="text-sm font-medium text-orange-700 mb-1">Faltas</p>
              <p className="text-xl font-bold text-orange-900">{statsData.consultationStats.noShow}</p>
            </div>

            <div className="bg-indigo-50 rounded-lg p-4">
              <p className="text-sm font-medium text-indigo-700 mb-1">Taxa Sucesso</p>
              <p className="text-xl font-bold text-indigo-900">{statsData.consultationStats.completionRate}%</p>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Consultas por Especialidade</h4>
            <div className="space-y-2">
              {statsData.consultationStats.specialtyBreakdown.map((specialty, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-medium text-gray-700 w-32">{specialty.specialty}</span>
                    <div className="w-40 h-2 bg-gray-200 rounded-full">
                      <div 
                        className="h-2 bg-purple-600 rounded-full"
                        style={{ width: `${specialty.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">{specialty.count}</span>
                    <Badge variant="outline">{specialty.percentage}%</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas de Exames */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="h-5 w-5 text-green-600" />
            <span>Estatísticas de Exames</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-sm font-medium text-green-700 mb-1">Total Solicitados</p>
              <p className="text-xl font-bold text-green-900">{statsData.examStats.total}</p>
            </div>

            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm font-medium text-blue-700 mb-1">Concluídos</p>
              <p className="text-xl font-bold text-blue-900">{statsData.examStats.completed}</p>
            </div>

            <div className="bg-yellow-50 rounded-lg p-4">
              <p className="text-sm font-medium text-yellow-700 mb-1">Pendentes</p>
              <p className="text-xl font-bold text-yellow-900">{statsData.examStats.pending}</p>
            </div>

            <div className="bg-red-50 rounded-lg p-4">
              <p className="text-sm font-medium text-red-700 mb-1">Urgentes</p>
              <p className="text-xl font-bold text-red-900">{statsData.examStats.urgent}</p>
            </div>

            <div className="bg-indigo-50 rounded-lg p-4">
              <p className="text-sm font-medium text-indigo-700 mb-1">Tempo Médio</p>
              <p className="text-xl font-bold text-indigo-900">{statsData.examStats.averageCompletionTime} dias</p>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Tipos de Exames Mais Solicitados</h4>
            <div className="space-y-2">
              {statsData.examStats.topExamTypes.map((exam, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold text-green-600">{index + 1}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-700">{exam.type}</span>
                  </div>
                  <Badge variant="outline">{exam.count} solicitações</Badge>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Métricas de Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-emerald-600" />
            <span>Métricas de Performance do Sistema</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-emerald-50 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-emerald-900 mb-1">
                {statsData.performanceMetrics.patientSatisfaction}/5
              </div>
              <p className="text-sm text-emerald-700">Satisfação do Paciente</p>
              <div className="flex justify-center mt-2">
                {[1,2,3,4,5].map(star => (
                  <span key={star} className={`text-lg ${star <= Math.floor(statsData.performanceMetrics.patientSatisfaction) ? 'text-yellow-400' : 'text-gray-300'}`}>
                    ★
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-blue-900 mb-1">
                {statsData.performanceMetrics.averageWaitTime}min
              </div>
              <p className="text-sm text-blue-700">Tempo Médio de Espera</p>
            </div>

            <div className="bg-green-50 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-green-900 mb-1">
                {statsData.performanceMetrics.systemUptime}%
              </div>
              <p className="text-sm text-green-700">Uptime do Sistema</p>
            </div>

            <div className="bg-purple-50 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-purple-900 mb-1">
                {statsData.performanceMetrics.dataAccuracy}%
              </div>
              <p className="text-sm text-purple-700">Precisão dos Dados</p>
            </div>

            <div className="bg-indigo-50 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-indigo-900 mb-1">
                {statsData.performanceMetrics.responseTime}s
              </div>
              <p className="text-sm text-indigo-700">Tempo de Resposta</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ações Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Button
          variant="outline"
          onClick={() => router.push('/reports/dashboard')}
          className="h-auto p-4"
        >
          <div className="text-left">
            <BarChart3 className="h-6 w-6 text-indigo-600 mb-2" />
            <p className="font-medium">Dashboard Executivo</p>
            <p className="text-xs text-gray-500">Visão geral dos indicadores</p>
          </div>
        </Button>

        <Button
          variant="outline"
          onClick={() => router.push('/reports/export')}
          className="h-auto p-4"
        >
          <div className="text-left">
            <TrendingUp className="h-6 w-6 text-green-600 mb-2" />
            <p className="font-medium">Exportar Relatórios</p>
            <p className="text-xs text-gray-500">Gerar arquivos personalizados</p>
          </div>
        </Button>

        <Button
          variant="outline"
          onClick={() => router.push('/reports')}
          className="h-auto p-4"
        >
          <div className="text-left">
            <Users className="h-6 w-6 text-blue-600 mb-2" />
            <p className="font-medium">Todos os Relatórios</p>
            <p className="text-xs text-gray-500">Voltar ao menu principal</p>
          </div>
        </Button>
      </div>
    </div>
  )
}
