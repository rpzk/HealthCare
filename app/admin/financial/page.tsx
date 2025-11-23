import { Metadata } from 'next'
import { FinancialDashboard } from '@/components/financial/financial-dashboard'
import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'

export const metadata: Metadata = {
  title: 'Financeiro | HealthCare',
  description: 'Gestão financeira da clínica',
}

export default function FinancialPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex pt-16">
        <Sidebar />
        <main className="flex-1 ml-64 p-8">
          <FinancialDashboard />
        </main>
      </div>
    </div>
  )
}
