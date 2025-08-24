'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BarChart3, ArrowLeft, Download, Calendar, Users, Stethoscope, TestTube, FileText, TrendingUp } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function ReportsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalPatients: 0,
    totalConsultations: 0,
    totalExams: 0,
    totalRecords: 0,
    consultationsThisMonth: 0,
    examsThisMonth: 0,
    newPatientsThisMonth: 0
  })

  useEffect(() => {
    // Simular carregamento de dados
    setTimeout(() => {
      setStats({
        totalPatients: 156,
        totalConsultations: 423,
        totalExams: 178,
        totalRecords: 341,
        consultationsThisMonth: 45,
        examsThisMonth: 23,
        newPatientsThisMonth: 12
      })
      setLoading(false)
    }, 1000)
  }, [])

  const reports = [
    {
      id: 'patients-summary',
      title: 'Relatório de Pacientes',
      description: 'Lista completa de pacientes com dados demográficos',
      icon: Users,
      type: 'PDF',
      color: 'bg-blue-100 text-blue-800',
      data: stats.totalPatients
    },
    {
      id: 'consultations-monthly',
      title: 'Consultas Mensais',
      description: 'Relatório detalhado das consultas do mês',
      icon: Stethoscope,
      type: 'PDF',
      color: 'bg-purple-100 text-purple-800',
      data: stats.consultationsThisMonth
    },
    {
      id: 'exams-report',
      title: 'Relatório de Exames',
      description: 'Exames realizados e resultados',
      icon: TestTube,
      type: 'Excel',
      color: 'bg-green-100 text-green-800',
      data: stats.examsThisMonth
    },
    {
      id: 'medical-records',
      title: 'Prontuários Médicos',
      description: 'Exportação completa dos registros médicos',
      icon: FileText,
      type: 'PDF',
      color: 'bg-orange-100 text-orange-800',
      data: stats.totalRecords
    },
    {
      id: 'financial-report',
      title: 'Relatório Financeiro',
      description: 'Resumo financeiro e faturamento',
      icon: TrendingUp,
      type: 'Excel',
      color: 'bg-emerald-100 text-emerald-800',
      data: 'R$ 45.230'
    },
    {
      id: 'performance-metrics',
      title: 'Métricas de Performance',
      description: 'Indicadores de desempenho e produtividade',
      icon: BarChart3,
      type: 'PDF',
      color: 'bg-indigo-100 text-indigo-800',
      data: '98.5%'
    }
  ]

  const quickStats = [
    {
      title: 'Total de Pacientes',
      value: stats.totalPatients,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'Consultas Realizadas',
      value: stats.totalConsultations,
      icon: Stethoscope,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      title: 'Exames Solicitados',
      value: stats.totalExams,
      icon: TestTube,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'Registros Médicos',
      value: stats.totalRecords,
      icon: FileText,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    }
  ]

  const generateReport = async (reportId: string) => {
    // Simular geração de relatório
    alert(`Gerando relatório: ${reportId}\n\nO relatório será enviado para seu email em alguns minutos.`)
  }

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
            <h1 className="text-2xl font-bold text-gray-900">Relatórios</h1>
            <p className="text-sm text-gray-500">Geração e análise de relatórios do sistema</p>
          </div>
        </div>
      </div>

      {/* Estatísticas Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickStats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div className={`p-2 ${stat.bgColor} rounded-lg`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Resumo Mensal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Resumo do Mês Atual</span>
          </CardTitle>
          <CardDescription>
            Principais métricas de {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <Users className="h-8 w-8 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-blue-900">{stats.newPatientsThisMonth}</p>
              <p className="text-sm text-blue-600">Novos Pacientes</p>
            </div>
            
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <Stethoscope className="h-8 w-8 text-purple-600" />
              </div>
              <p className="text-2xl font-bold text-purple-900">{stats.consultationsThisMonth}</p>
              <p className="text-sm text-purple-600">Consultas Realizadas</p>
            </div>
            
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <TestTube className="h-8 w-8 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-green-900">{stats.examsThisMonth}</p>
              <p className="text-sm text-green-600">Exames Solicitados</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Relatórios Disponíveis */}
      <Card>
        <CardHeader>
          <CardTitle>Relatórios Disponíveis</CardTitle>
          <CardDescription>
            Clique em "Gerar" para criar e baixar o relatório desejado
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reports.map((report) => (
              <div
                key={report.id}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-2 ${report.color.split(' ')[0]}-100 rounded-lg`}>
                    <report.icon className={`h-5 w-5 ${report.color.split(' ')[1]}-600`} />
                  </div>
                  <Badge variant="outline" className={report.color}>
                    {report.type}
                  </Badge>
                </div>
                
                <h3 className="font-semibold text-gray-900 mb-1">{report.title}</h3>
                <p className="text-sm text-gray-600 mb-3">{report.description}</p>
                
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    Dados: {report.data}
                  </div>
                  <Button
                    size="sm"
                    onClick={() => generateReport(report.id)}
                    className="flex items-center space-x-1"
                  >
                    <Download className="h-3 w-3" />
                    <span>Gerar</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Ações Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="p-3 bg-blue-100 rounded-lg w-fit mx-auto mb-3">
                <Users className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="font-semibold mb-2">Dashboard de Pacientes</h3>
              <p className="text-sm text-gray-600 mb-4">Visão geral detalhada dos pacientes</p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => router.push('/reports/dashboard')}
              >
                Acessar
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="p-3 bg-green-100 rounded-lg w-fit mx-auto mb-3">
                <BarChart3 className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="font-semibold mb-2">Estatísticas Avançadas</h3>
              <p className="text-sm text-gray-600 mb-4">Análises e métricas detalhadas</p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => router.push('/reports/stats')}
              >
                Ver Estatísticas
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="p-3 bg-purple-100 rounded-lg w-fit mx-auto mb-3">
                <Download className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="font-semibold mb-2">Exportar Dados</h3>
              <p className="text-sm text-gray-600 mb-4">Exportação personalizada de dados</p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => router.push('/reports/export')}
              >
                Exportar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Informações Importantes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Informações Importantes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="space-y-2 text-sm">
              <p>• <strong>Relatórios PDF:</strong> Adequados para impressão e apresentações</p>
              <p>• <strong>Relatórios Excel:</strong> Permitem análise e manipulação de dados</p>
              <p>• <strong>Privacidade:</strong> Todos os relatórios respeitam a LGPD</p>
              <p>• <strong>Agendamento:</strong> Relatórios podem ser agendados para geração automática</p>
              <p>• <strong>Retenção:</strong> Relatórios ficam disponíveis por 30 dias</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
