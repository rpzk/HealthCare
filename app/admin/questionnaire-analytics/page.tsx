import { Suspense } from 'react'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { redirect } from 'next/navigation'
import {
  BarChart3,
  Activity,
  AlertCircle,
  TrendingUp,
  Clock,
  CheckCircle2,
  Users,
  Brain,
} from 'lucide-react'
import { QuestionnaireAnalyticsDashboard } from '@/components/questionnaires/questionnaire-analytics-dashboard'
import { QuestionnaireNotificationsPanel } from '@/components/questionnaires/questionnaire-notifications-panel'
import { QuestionnaireInsights } from '@/components/questionnaires/questionnaire-insights'

export const metadata = {
  title: 'Análise de Questionários',
  description: 'Dashboard de análise e notificações de questionários dos pacientes',
}

export default async function QuestionnaireAnalyticsPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    redirect('/auth/signin')
  }

  // Apenas profissionais de saúde e admin podem acessar
  if (!['DOCTOR', 'ADMIN', 'NURSE', 'THERAPIST'].includes(session.user.role)) {
    redirect('/forbidden')
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Análise de Questionários</h1>
          <p className="text-muted-foreground mt-1">
            Monitore e analise as respostas dos pacientes em tempo real
          </p>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">
            <BarChart3 className="h-4 w-4 mr-2" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <AlertCircle className="h-4 w-4 mr-2" />
            Notificações
          </TabsTrigger>
          <TabsTrigger value="insights">
            <Brain className="h-4 w-4 mr-2" />
            Insights IA
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <Suspense fallback={<DashboardSkeleton />}>
            <QuestionnaireAnalyticsDashboard userId={session.user.id} />
          </Suspense>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Suspense fallback={<NotificationsSkeleton />}>
            <QuestionnaireNotificationsPanel userId={session.user.id} />
          </Suspense>
        </TabsContent>

        {/* Insights Tab */}
        <TabsContent value="insights" className="space-y-6">
          <Suspense fallback={<InsightsSkeleton />}>
            <QuestionnaireInsights userId={session.user.id} />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="h-8 bg-muted rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

function NotificationsSkeleton() {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 bg-muted rounded animate-pulse" />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function InsightsSkeleton() {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-20 bg-muted rounded animate-pulse" />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
