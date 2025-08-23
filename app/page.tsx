import { Metadata } from 'next'
import { DashboardOverview } from '@/components/dashboard/overview'
import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'

export const metadata: Metadata = {
  title: 'Dashboard - Sistema de Prontuário Eletrônico',
  description: 'Painel principal do sistema médico',
}

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 ml-64 p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Dashboard Médico
            </h1>
            <p className="text-gray-600 mt-2">
              Visão geral dos seus pacientes e atividades médicas
            </p>
          </div>
          <DashboardOverview />
        </main>
      </div>
    </div>
  )
}
