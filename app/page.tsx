import { Metadata } from 'next'
import { DashboardOverview } from '@/components/dashboard/overview'
import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { PageHeader } from '@/components/navigation/page-header'

export const metadata: Metadata = {
  title: 'Dashboard - Sistema de Prontuário Eletrônico',
  description: 'Painel principal do sistema médico',
}

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <Header />
      <div className="flex pt-16">
        <Sidebar />
        <main className="flex-1 ml-64 p-6">
          <div className="mb-8">
            <PageHeader
              title="Dashboard Médico"
              description="Visão geral dos seus pacientes e atividades médicas"
              breadcrumbs={[{ label: 'Dashboard' }]}
              showBackButton={false}
            />
          </div>
          <DashboardOverview />
        </main>
      </div>
    </div>
  )
}
