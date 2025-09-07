'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { BarChart3, ArrowLeft, Users, Stethoscope, TestTube, FileText, TrendingUp, Calendar, AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface SpecialtyStat { name: string; count: number }
interface AgeGroup { range: string; count: number }
interface GenderGroup { gender: string; count: number }
interface KPI { title: string; value: number | string; change: string; changeType: 'positive' | 'neutral'; icon: any; color: string; bgColor: string }
interface PerformanceMetric { title: string; value: string | number; unit: string; icon: any; color: string }
interface DashboardData {
  totalPatients: number
  newPatientsThisMonth: number
  totalConsultations: number
  consultationsThisMonth: number
  totalExams: number
  examsThisMonth: number
  totalRecords: number
  recordsThisMonth: number
  pendingExams: number
  cancelledConsultations: number
  averageConsultationsPerDay: number
  patientGrowthRate: number
  monthlyRevenue: number
  popularSpecialties: SpecialtyStat[]
  ageDistribution: AgeGroup[]
  genderDistribution: GenderGroup[]
}

export default function DashboardReportsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState<boolean>(true)
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    totalPatients: 0,
    newPatientsThisMonth: 0,
    totalConsultations: 0,
    consultationsThisMonth: 0,
    totalExams: 0,
    examsThisMonth: 0,
    totalRecords: 0,
    recordsThisMonth: 0,
    pendingExams: 0,
    cancelledConsultations: 0,
    averageConsultationsPerDay: 0,
    patientGrowthRate: 0,
    monthlyRevenue: 0,
    popularSpecialties: [],
    ageDistribution: [],
    genderDistribution: []
  })

  useEffect(() => {
    const timer = setTimeout(() => {
      const data: DashboardData = {
        totalPatients: 156,
        newPatientsThisMonth: 12,
        totalConsultations: 423,
        consultationsThisMonth: 45,
        totalExams: 178,
        examsThisMonth: 23,
        totalRecords: 341,
        recordsThisMonth: 38,
        pendingExams: 8,
        cancelledConsultations: 5,
        averageConsultationsPerDay: 3.2,
        patientGrowthRate: 8.5,
        monthlyRevenue: 45230,
        popularSpecialties: [
          { name: 'Clínica Geral', count: 89 },
          { name: 'Cardiologia', count: 45 },
          { name: 'Dermatologia', count: 32 },
          { name: 'Ortopedia', count: 28 },
            { name: 'Pediatria', count: 24 }
        ],
        ageDistribution: [
          { range: '0-18', count: 23 },
          { range: '19-35', count: 45 },
          { range: '36-50', count: 38 },
          { range: '51-65', count: 32 },
          { range: '65+', count: 18 }
        ],
        genderDistribution: [
          { gender: 'Feminino', count: 89 },
          { gender: 'Masculino', count: 67 }
        ]
      }
      setDashboardData(data)
      setLoading(false)
    }, 1000)
    return () => clearTimeout(timer)
  }, [])

  const kpiCards = [
    {
      title: 'Total de Pacientes',
      value: dashboardData.totalPatients,
      change: `+${dashboardData.newPatientsThisMonth} este mês`,
      changeType: 'positive',
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'Consultas Realizadas',
      value: dashboardData.totalConsultations,
      change: `${dashboardData.consultationsThisMonth} este mês`,
      changeType: 'neutral',
      icon: Stethoscope,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      title: 'Exames Solicitados',
      value: dashboardData.totalExams,
      change: `${dashboardData.examsThisMonth} este mês`,
      changeType: 'neutral',
      icon: TestTube,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'Registros Médicos',
      value: dashboardData.totalRecords,
      change: `${dashboardData.recordsThisMonth} este mês`,
      changeType: 'neutral',
      icon: FileText,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    }
  ]

  const performanceMetrics = [
    {
      title: 'Média de Consultas/Dia',
      value: dashboardData.averageConsultationsPerDay.toFixed(1),
      unit: 'consultas',
      icon: TrendingUp,
      color: 'text-green-600'
    },
    {
      title: 'Taxa de Crescimento',
      value: dashboardData.patientGrowthRate.toFixed(1),
      unit: '% ao mês',
      icon: TrendingUp,
      color: 'text-green-600'
    },
    {
      title: 'Receita Mensal',
      value: `R$ ${dashboardData.monthlyRevenue.toLocaleString()}`,
      unit: '',
      icon: TrendingUp,
      color: 'text-emerald-600'
    },
    {
      title: 'Exames Pendentes',
      value: dashboardData.pendingExams,
      unit: 'exames',
      icon: AlertCircle,
      color: 'text-yellow-600'
    }
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
            <h1 className="text-2xl font-bold text-gray-900">Dashboard Médico</h1>
            <p className="text-sm text-gray-500">
              Visão geral das métricas e indicadores de performance
            </p>
          </div>
        </div>
      </div>

      {/* Indicadores Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi, index) => (
          <Card key={index}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{kpi.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
                  <p className={`text-xs mt-1 ${
                    kpi.changeType === 'positive' ? 'text-green-600' : 'text-gray-500'
                  }`}>
                    {kpi.change}
                  </p>
                </div>
                <div className={`p-3 ${kpi.bgColor} rounded-lg`}>
                  <kpi.icon className={`h-6 w-6 ${kpi.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Métricas de Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Métricas de Performance</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {performanceMetrics.map((metric, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-600">{metric.title}</p>
                  <metric.icon className={`h-4 w-4 ${metric.color}`} />
                </div>
                <p className="text-xl font-bold text-gray-900">
                  {metric.value} {metric.unit && <span className="text-sm font-normal text-gray-500">{metric.unit}</span>}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Distribuições e Análises */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Especialidades Populares */}
        <Card>
          <CardHeader>
            <CardTitle>Especialidades Mais Procuradas</CardTitle>
            <CardDescription>Top 5 especialidades por número de consultas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboardData.popularSpecialties.map((specialty, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold text-purple-600">{index + 1}</span>
                    </div>
                    <span className="font-medium text-gray-900">{specialty.name}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-20 h-2 bg-gray-200 rounded-full">
                      <div 
                        className="h-2 bg-purple-600 rounded-full"
                        style={{ 
                          width: `${(specialty.count / Math.max(...dashboardData.popularSpecialties.map(s => s.count))) * 100}%` 
                        }}
                      ></div>
                    </div>
                    <Badge variant="outline">{specialty.count}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Distribuição por Idade */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Faixa Etária</CardTitle>
            <CardDescription>Pacientes agrupados por idade</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboardData.ageDistribution.map((age, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-gray-900">{age.range} anos</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-20 h-2 bg-gray-200 rounded-full">
                      <div 
                        className="h-2 bg-blue-600 rounded-full"
                        style={{ 
                          width: `${(age.count / Math.max(...dashboardData.ageDistribution.map(a => a.count))) * 100}%` 
                        }}
                      ></div>
                    </div>
                    <Badge variant="outline">{age.count}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Distribuição por Gênero */}
      <Card>
        <CardHeader>
          <CardTitle>Distribuição por Gênero</CardTitle>
          <CardDescription>Proporção de pacientes por gênero</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {dashboardData.genderDistribution.map((gender, index) => (
              <div key={index} className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-center mb-2">
                  <Users className={`h-8 w-8 ${index === 0 ? 'text-pink-600' : 'text-blue-600'}`} />
                </div>
                <p className="text-2xl font-bold text-gray-900">{gender.count}</p>
                <p className="text-sm text-gray-600">{gender.gender}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {((gender.count / dashboardData.totalPatients) * 100).toFixed(1)}%
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Alertas e Lembretes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            <span>Alertas e Lembretes</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start space-x-3 p-3 bg-yellow-50 rounded-lg">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-900">
                  {dashboardData.pendingExams} exames pendentes
                </p>
                <p className="text-sm text-yellow-700">
                  Há exames aguardando agendamento ou resultados
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 bg-red-50 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <p className="font-medium text-red-900">
                  {dashboardData.cancelledConsultations} consultas canceladas este mês
                </p>
                <p className="text-sm text-red-700">
                  Monitor de cancelamentos para otimizar agenda
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
              <Calendar className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-medium text-blue-900">
                  Próxima revisão mensal em 5 dias
                </p>
                <p className="text-sm text-blue-700">
                  Prepare os relatórios mensais para a reunião gerencial
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ações Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Button
          variant="outline"
          onClick={() => router.push('/reports/stats')}
          className="h-auto p-4 text-left"
        >
          <div>
            <BarChart3 className="h-6 w-6 text-indigo-600 mb-2" />
            <p className="font-medium">Estatísticas Detalhadas</p>
            <p className="text-xs text-gray-500">Ver análises avançadas</p>
          </div>
        </Button>

        <Button
          variant="outline"
          onClick={() => router.push('/reports/export')}
          className="h-auto p-4 text-left"
        >
          <div>
            <FileText className="h-6 w-6 text-green-600 mb-2" />
            <p className="font-medium">Exportar Dados</p>
            <p className="text-xs text-gray-500">Gerar relatórios personalizados</p>
          </div>
        </Button>

        <Button
          variant="outline"
          onClick={() => router.push('/consultations')}
          className="h-auto p-4 text-left"
        >
          <div>
            <Stethoscope className="h-6 w-6 text-purple-600 mb-2" />
            <p className="font-medium">Gerenciar Consultas</p>
            <p className="text-xs text-gray-500">Visualizar agenda completa</p>
          </div>
        </Button>
      </div>
    </div>
  )
}
