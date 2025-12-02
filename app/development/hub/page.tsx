'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect, useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { PageHeader } from '@/components/navigation/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Brain,
  Target,
  Users,
  TrendingUp,
  Calendar,
  Bell,
  BarChart3,
  Award,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  FileText
} from 'lucide-react'

interface DashboardStats {
  totalPatients: number
  withStratum: number
  withStrengths: number
  activePlans: number
  alertsCount: number
  overdueAssessments: number
  completedGoals: number
  avgProgress: number
}

export default function DevelopmentHubPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch multiple endpoints in parallel
        const [analyticsRes, alertsRes] = await Promise.all([
          fetch('/api/development/analytics'),
          fetch('/api/development/alerts?scope=all')
        ])

        const analyticsData = analyticsRes.ok ? await analyticsRes.json() : null
        const alertsData = alertsRes.ok ? await alertsRes.json() : null

        setStats({
          totalPatients: analyticsData?.stratumDistribution?.reduce((sum: number, s: { count: number }) => sum + s.count, 0) || 0,
          withStratum: analyticsData?.stratumDistribution?.length || 0,
          withStrengths: analyticsData?.topStrengths?.length || 0,
          activePlans: analyticsData?.goalStats?.totalGoals || 0,
          alertsCount: alertsData?.summary?.total || 0,
          overdueAssessments: alertsData?.summary?.byType?.reassessment || 0,
          completedGoals: analyticsData?.goalStats?.completedGoals || 0,
          avgProgress: analyticsData?.goalStats?.averageProgress || 0
        })
      } catch (error) {
        console.error('Error fetching stats:', error)
      } finally {
        setLoading(false)
      }
    }

    if (session) {
      fetchStats()
    }
  }, [session])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
      </div>
    )
  }

  if (!session) {
    redirect('/auth/signin')
  }

  const modules = [
    {
      title: 'Analytics Agregado',
      description: 'Visão gerencial completa do desenvolvimento organizacional',
      icon: BarChart3,
      href: '/development/analytics',
      color: 'from-purple-500 to-purple-600',
      stats: stats?.totalPatients ? `${stats.totalPatients} pacientes` : undefined
    },
    {
      title: 'Central de Alertas',
      description: 'Alertas e lembretes de desenvolvimento',
      icon: Bell,
      href: '/development/alerts',
      color: 'from-orange-500 to-orange-600',
      stats: stats?.alertsCount ? `${stats.alertsCount} alertas` : undefined,
      badge: stats?.alertsCount && stats.alertsCount > 0 ? 'Atenção' : undefined
    },
    {
      title: 'Reavaliações Anuais',
      description: 'Calendário de reavaliações de stratum e forças',
      icon: Calendar,
      href: '/development/reassessment',
      color: 'from-blue-500 to-blue-600',
      stats: stats?.overdueAssessments ? `${stats.overdueAssessments} pendentes` : undefined
    },
    {
      title: 'Minha Avaliação',
      description: 'Fazer avaliação de stratum, forças e plano de desenvolvimento',
      icon: Target,
      href: '/development',
      color: 'from-green-500 to-green-600',
      stats: 'Acesso pessoal'
    },
    {
      title: 'Avaliação de Pacientes',
      description: 'Avaliar stratum e forças de pacientes',
      icon: Users,
      href: '/patients',
      color: 'from-indigo-500 to-indigo-600',
      stats: stats?.withStratum ? `${stats.withStratum} avaliados` : undefined
    },
    {
      title: 'Dashboard RH',
      description: 'Visão geral de recursos humanos',
      icon: Award,
      href: '/hr',
      color: 'from-pink-500 to-pink-600'
    }
  ]

  const quickActions = [
    {
      title: 'Nova Avaliação',
      description: 'Iniciar avaliação de stratum ou forças',
      icon: Sparkles,
      action: () => router.push('/patients')
    },
    {
      title: 'Ver Relatórios',
      description: 'Gerar relatórios de desenvolvimento',
      icon: FileText,
      action: () => router.push('/development/analytics')
    },
    {
      title: 'Enviar Lembretes',
      description: 'Notificar sobre reavaliações',
      icon: Bell,
      action: () => router.push('/development/alerts')
    }
  ]

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <Header />
      <div className="flex pt-32">
        <Sidebar />
        <main className="flex-1 ml-64 p-6">
          <PageHeader
            title="Hub de Desenvolvimento Humano"
            description="Sistema integrado de avaliação e desenvolvimento de pessoas"
            showHomeButton={true}
          />
          
          <div className="mt-6 space-y-6">
            {/* Hero Section */}
            <Card className="bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0">
              <CardContent className="p-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">
                      Sistema de Desenvolvimento Humano Integral
                    </h2>
                    <p className="text-purple-100 mb-4">
                      Combine avaliações de Stratum (Elliott Jaques) e Forças de Caráter (VIA Survey)
                      para criar planos de desenvolvimento personalizados e acompanhar o progresso.
                    </p>
                    <div className="flex gap-4">
                      <Button 
                        variant="secondary"
                        onClick={() => router.push('/development/analytics')}
                      >
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Ver Analytics
                      </Button>
                      <Button 
                        variant="outline"
                        className="border-white text-white hover:bg-white/20"
                        onClick={() => router.push('/patients')}
                      >
                        <Users className="h-4 w-4 mr-2" />
                        Avaliar Pacientes
                      </Button>
                    </div>
                  </div>
                  <Brain className="h-24 w-24 text-white/30" />
                </div>
              </CardContent>
            </Card>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Pacientes Avaliados</p>
                      <p className="text-2xl font-bold">{stats?.totalPatients || 0}</p>
                    </div>
                    <Users className="h-8 w-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Alertas Ativos</p>
                      <p className="text-2xl font-bold text-orange-600">{stats?.alertsCount || 0}</p>
                    </div>
                    <AlertCircle className="h-8 w-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Metas Concluídas</p>
                      <p className="text-2xl font-bold text-green-600">{stats?.completedGoals || 0}</p>
                    </div>
                    <CheckCircle2 className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Progresso Médio</p>
                      <p className="text-2xl font-bold text-blue-600">{stats?.avgProgress || 0}%</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Modules */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {modules.map((module) => {
                const Icon = module.icon
                return (
                  <Card 
                    key={module.title}
                    className="cursor-pointer hover:shadow-lg transition-all duration-200 group"
                    onClick={() => router.push(module.href)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className={`p-3 rounded-xl bg-gradient-to-r ${module.color}`}>
                          <Icon className="h-6 w-6 text-white" />
                        </div>
                        {module.badge && (
                          <Badge variant="destructive" className="animate-pulse">
                            {module.badge}
                          </Badge>
                        )}
                      </div>
                      
                      <h3 className="font-semibold text-lg mb-1 group-hover:text-purple-600 transition-colors">
                        {module.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        {module.description}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        {module.stats && (
                          <span className="text-xs text-gray-500">{module.stats}</span>
                        )}
                        <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-600" />
                  Ações Rápidas
                </CardTitle>
                <CardDescription>
                  Acesse rapidamente as funcionalidades mais utilizadas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {quickActions.map((action) => {
                    const Icon = action.icon
                    return (
                      <Button
                        key={action.title}
                        variant="outline"
                        className="h-auto p-4 justify-start"
                        onClick={action.action}
                      >
                        <Icon className="h-5 w-5 mr-3 text-purple-600" />
                        <div className="text-left">
                          <p className="font-medium">{action.title}</p>
                          <p className="text-xs text-gray-500">{action.description}</p>
                        </div>
                      </Button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Info Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <TrendingUp className="h-8 w-8 text-blue-600" />
                    <div>
                      <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                        Stratum (Elliott Jaques)
                      </h3>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        Avalia a capacidade de trabalho e horizonte de tempo de uma pessoa.
                        Os 8 estratos ajudam a entender o potencial de liderança e 
                        complexidade de tarefas que cada indivíduo pode gerenciar.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Award className="h-8 w-8 text-green-600" />
                    <div>
                      <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2">
                        Forças de Caráter (VIA)
                      </h3>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        Identifica as 24 forças de caráter organizadas em 6 virtudes.
                        Conhecer as forças ajuda a potencializar talentos e criar
                        planos de desenvolvimento mais eficazes.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
