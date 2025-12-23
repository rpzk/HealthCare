'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { PageHeader } from '@/components/navigation/page-header'
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
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/reports/stats')
        if (response.ok) {
          const data = await response.json()
          setStats({
            totalPatients: data.totalPatients || 0,
            totalConsultations: data.totalConsultations || 0,
            totalExams: data.totalExams || 0,
            totalRecords: data.totalRecords || 0,
            consultationsThisMonth: data.consultationsThisMonth || 0,
            examsThisMonth: data.examsThisMonth || 0,
            newPatientsThisMonth: data.newPatientsThisMonth || 0
          })
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  const reports = [
    {
      id: 'patients-summary',
      title: 'Relatório de Pacientes',
      description: 'Lista completa de pacientes com dados demográficos',
      icon: Users,
      type: 'PDF',
      color: 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300',
      data: stats.totalPatients
    },
    {
      id: 'consultations-monthly',
      title: 'Consultas Mensais',
      description: 'Relatório detalhado das consultas do mês',
      icon: Stethoscope,
      type: 'PDF',
      color: 'bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-300',
      data: stats.consultationsThisMonth
    },
    {
      id: 'exams-report',
      title: 'Relatório de Exames',
      description: 'Exames realizados e resultados',
      icon: TestTube,
      type: 'Excel',
      color: 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300',
      data: stats.examsThisMonth
    },
    {
      id: 'medical-records',
      title: 'Prontuários Médicos',
      description: 'Exportação completa dos registros médicos',
      icon: FileText,
      type: 'PDF',
      color: 'bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-300',
      data: stats.totalRecords
    },
    {
      id: 'financial-report',
      title: 'Relatório Financeiro',
      description: 'Resumo financeiro e faturamento',
      icon: TrendingUp,
      type: 'Excel',
      color: 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300',
      data: 'R$ 45.230'
    },
    {
      id: 'performance-metrics',
      title: 'Métricas de Performance',
      description: 'Indicadores de desempenho e produtividade',
      icon: BarChart3,
      type: 'PDF',
      color: 'bg-indigo-100 dark:bg-indigo-900/20 text-indigo-800 dark:text-indigo-300',
      data: '98.5%'
    }
  ]

  const quickStats = [
    {
      title: 'Total de Pacientes',
      value: stats.totalPatients,
      icon: Users,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-900/20'
    },
    {
      title: 'Consultas Realizadas',
      value: stats.totalConsultations,
      icon: Stethoscope,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-100 dark:bg-purple-900/20'
    },
    {
      title: 'Exames Solicitados',
      value: stats.totalExams,
      icon: TestTube,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-900/20'
    },
    {
      title: 'Registros Médicos',
      value: stats.totalRecords,
      icon: FileText,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-100 dark:bg-orange-900/20'
    }
  ]

  const generateReport = async (reportId: string) => {
    // Simular geração de relatório
    alert(`Gerando relatório: ${reportId}\n\nO relatório será enviado para seu email em alguns minutos.`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background transition-colors duration-300">
        <Header />
        <div className="flex pt-32">
          <Sidebar />
          <main className="flex-1 ml-64 p-6">
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <Header />
      <div className="flex pt-32">
        <Sidebar />
        <main className="flex-1 ml-64 p-6">
          <PageHeader
            title="Relatórios e Analytics"
            description="Geração e análise de relatórios do sistema"
            breadcrumbs={[
              { label: 'Dashboard', href: '/' },
              { label: 'Relatórios', href: '/reports' }
            ]}
            icon={<BarChart3 className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />}
            actions={(
              <Button variant="outline" onClick={() => router.back()}>
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </Button>
            )}
          />

          <div className="space-y-6">

      {/* Estatísticas Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickStats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
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
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <Users className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-300">{stats.newPatientsThisMonth}</p>
              <p className="text-sm text-blue-600 dark:text-blue-400">Novos Pacientes</p>
            </div>
            
            <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <Stethoscope className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              </div>
              <p className="text-2xl font-bold text-purple-900 dark:text-purple-300">{stats.consultationsThisMonth}</p>
              <p className="text-sm text-purple-600 dark:text-purple-400">Consultas Realizadas</p>
            </div>
            
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <TestTube className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <p className="text-2xl font-bold text-green-900 dark:text-green-300">{stats.examsThisMonth}</p>
              <p className="text-sm text-green-600 dark:text-green-400">Exames Solicitados</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Relatórios Disponíveis */}
      <Card>
        <CardHeader>
          <CardTitle>Relatórios Disponíveis</CardTitle>
          <CardDescription>
            Clique em &quot;Gerar&quot; para criar e baixar o relatório desejado
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reports.map((report) => (
              <div
                key={report.id}
                className="border border-border rounded-lg p-4 hover:bg-muted transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-2 ${report.color.split(' ')[0]}-100 rounded-lg`}>
                    <report.icon className={`h-5 w-5 ${report.color.split(' ')[1]}-600`} />
                  </div>
                  <Badge variant="outline" className={report.color}>
                    {report.type}
                  </Badge>
                </div>
                
                <h3 className="font-semibold text-foreground mb-1">{report.title}</h3>
                <p className="text-sm text-muted-foreground mb-3">{report.description}</p>
                
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
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
              <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg w-fit mx-auto mb-3">
                <Users className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-semibold mb-2">Dashboard de Pacientes</h3>
              <p className="text-sm text-muted-foreground mb-4">Visão geral detalhada dos pacientes</p>
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
              <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg w-fit mx-auto mb-3">
                <BarChart3 className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="font-semibold mb-2">Estatísticas Avançadas</h3>
              <p className="text-sm text-muted-foreground mb-4">Análises e métricas detalhadas</p>
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
              <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg w-fit mx-auto mb-3">
                <Download className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="font-semibold mb-2">Exportar Dados</h3>
              <p className="text-sm text-muted-foreground mb-4">Exportação personalizada de dados</p>
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
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
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
        </main>
      </div>
    </div>
  )
}
