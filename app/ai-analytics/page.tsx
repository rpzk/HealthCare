import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { PageHeader } from '@/components/navigation/page-header'
import { AIAnalyticsDashboard } from '@/components/ai/analytics-dashboard'
// BarChart3 icon removed (unused)
import { RefreshButton } from '@/components/navigation/refresh-button'

export default function AIAnalyticsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex pt-16">
        <Sidebar />
        <main className="flex-1 ml-64 p-6 pt-24">
          <PageHeader
            title="Analytics de IA Médica"
            description="Dashboard de métricas e analytics do sistema de IA médica"
            breadcrumbs={[
              { label: 'Dashboard', href: '/' },
              { label: 'Analytics IA', href: '/ai-analytics' }
            ]}
            actions={<RefreshButton />}
          />
          <AIAnalyticsDashboard />
        </main>
      </div>
    </div>
  )
}

export const metadata = {
  title: 'Analytics de IA - HealthCare',
  description: 'Dashboard de métricas e analytics do sistema de IA médica',
}
